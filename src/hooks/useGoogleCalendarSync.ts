import { useEffect, useRef, useCallback, useState } from "react";
import { Task, TaskArea } from "@/lib/types";
import {
  listCalendars, listEvents, createEvent, updateEvent, deleteEvent, createAppCalendar,
  loadStoredToken, clearStoredToken, getValidAccessToken,
  GoogleCalendarMeta, PreconditionFailedError,
} from "@/lib/googleCalendar";
import {
  priorityToGoogleColor, googleColorToPriority,
  computeAutoStatus, recurrenceToRRule, rruleToRecurrence,
  isoToLocalDateTime, localToIso, taskContentHash,
} from "@/lib/googleSyncLogic";
import { getNowInTimezone } from "@/lib/timeUtils";
import { GoogleCalendarSettings } from "@/hooks/useGoogleCalendarStore";

type GoogleMeta = Partial<Pick<Task,
  "googleEventId" | "googleCalendarId" | "googleLastHash" |
  "googleSyncedAt" | "googleEtag" | "googleUpdated"
>>;

interface SyncDeps {
  areas: TaskArea[];
  timezone: string;
  settings: GoogleCalendarSettings;
  clientInstanceId: string;
  setTaskGoogleMeta: (areaId: string, taskId: string, meta: GoogleMeta) => void;
  upsertGoogleEvent: (targetAreaId: string, patch: any, autoStatusDefault: boolean) => void;
  updateTaskStatus: (areaId: string, taskId: string, status: Task["status"]) => void;
  deleteTask: (areaId: string, taskId: string) => void;
  addLog: (message: string, ok?: boolean) => void;
  ensureTargetArea: () => string;
  ensureAppCalendarId: () => Promise<string>;
}

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const AUTO_STATUS_INTERVAL_MS = 30 * 1000; // 30s

const LOCK_KEY = "google-calendar-sync-lock";
const OUTBOX_KEY = "google-calendar-outbox";
const LOCK_TTL_MS = 60 * 1000; // 60s — lock expira sozinho

interface SyncLock { clientId: string; at: number; }
interface OutboxItem {
  id: string;
  op: "delete";
  calendarId: string;
  eventId: string;
  attempts: number;
  lastAttempt?: number;
}

function readLock(): SyncLock | null {
  try { const raw = localStorage.getItem(LOCK_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLock(l: SyncLock) { try { localStorage.setItem(LOCK_KEY, JSON.stringify(l)); } catch {} }
function clearLock() { try { localStorage.removeItem(LOCK_KEY); } catch {} }

function readOutbox(): OutboxItem[] {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]"); } catch { return []; }
}
function writeOutbox(items: OutboxItem[]) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(items)); } catch {}
}
function enqueueOutbox(item: Omit<OutboxItem, "id" | "attempts">) {
  const items = readOutbox();
  items.push({ ...item, id: crypto.randomUUID(), attempts: 0 });
  writeOutbox(items);
}

export function useGoogleCalendarSync(deps: SyncDeps) {
  const { settings, addLog } = deps;
  const [isConnected, setIsConnected] = useState(() => !!loadStoredToken());
  const [isSyncing, setIsSyncing] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCalendarMeta[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const connect = useCallback(async () => {
    if (!settings.clientId) throw new Error("Configure o Client ID OAuth do Google primeiro");
    await getValidAccessToken(settings.clientId);
    setIsConnected(true);
    addLog("Conectado ao Google Calendar");
  }, [settings.clientId, addLog]);

  const disconnect = useCallback(() => {
    clearStoredToken();
    setIsConnected(false);
    addLog("Desconectado");
  }, [addLog]);

  const refreshCalendars = useCallback(async () => {
    if (!isConnected || !settings.clientId) return;
    try {
      const list = await listCalendars(settings.clientId);
      setCalendars(list);
    } catch (e: any) {
      addLog(`Erro ao listar agendas: ${e.message}`, false);
    }
  }, [isConnected, settings.clientId, addLog]);

  useEffect(() => { refreshCalendars(); }, [refreshCalendars]);

  // Drena outbox (deletes pendentes)
  const drainOutbox = useCallback(async () => {
    const d = depsRef.current;
    if (!navigator.onLine || !d.settings.clientId) return;
    const items = readOutbox();
    if (items.length === 0) return;
    const remaining: OutboxItem[] = [];
    for (const it of items) {
      const backoff = Math.min(5 * 60_000, 5_000 * Math.pow(2, it.attempts));
      if (it.lastAttempt && Date.now() - it.lastAttempt < backoff) {
        remaining.push(it); continue;
      }
      try {
        if (it.op === "delete") {
          await deleteEvent(d.settings.clientId, it.calendarId, it.eventId);
          d.addLog(`Evento removido remotamente (outbox)`);
        }
      } catch (e: any) {
        it.attempts += 1;
        it.lastAttempt = Date.now();
        if (it.attempts < 8) remaining.push(it);
        else d.addLog(`Outbox: descartando após ${it.attempts} tentativas: ${e.message}`, false);
      }
    }
    writeOutbox(remaining);
  }, []);

  const runSync = useCallback(async () => {
    const d = depsRef.current;
    if (!d.settings.enabled || d.settings.paused || !d.settings.clientId) return;
    if (!loadStoredToken()) return;

    // Lock anti-duplicação entre abas/clientes
    const existing = readLock();
    const now = Date.now();
    if (existing && existing.clientId !== d.clientInstanceId && now - existing.at < LOCK_TTL_MS) {
      d.addLog("Sincronização ignorada: outro cliente está sincronizando", true);
      return;
    }
    writeLock({ clientId: d.clientInstanceId, at: now });

    setIsSyncing(true);
    try {
      await drainOutbox();

      const targetAreaId = d.ensureTargetArea();
      const calendarIds = d.settings.selectedCalendarIds.length > 0 ? d.settings.selectedCalendarIds : ["primary"];
      const nowD = new Date();
      const timeMin = nowD.toISOString();
      const timeMax = new Date(nowD.getTime() + d.settings.daysAhead * 24 * 60 * 60 * 1000).toISOString();

      // --- IMPORT ---
      if (d.settings.syncDirection !== "export") {
        // Coleta todos os IDs recebidos por agenda p/ detectar deleções remotas
        const receivedByCal: Record<string, Set<string>> = {};
        for (const calId of calendarIds) {
          const events = await listEvents(d.settings.clientId, calId, timeMin, timeMax);
          receivedByCal[calId] = new Set(events.map(e => e.id));
          for (const ev of events) {
            if (!ev.start?.dateTime || !ev.end?.dateTime) continue; // skip all-day
            const start = isoToLocalDateTime(ev.start.dateTime, d.timezone);
            const end = isoToLocalDateTime(ev.end.dateTime, d.timezone);
            const recurrence = rruleToRecurrence(ev.recurrence?.[0]);
            d.upsertGoogleEvent(targetAreaId, {
              googleEventId: ev.id,
              googleCalendarId: calId,
              googleEtag: ev.etag,
              googleUpdated: ev.updated,
              text: ev.summary || "Evento sem título",
              dueDate: start.date, dueTime: start.time,
              endDate: end.date, endTime: end.time,
              priority: googleColorToPriority(ev.colorId),
              recurrence,
            }, d.settings.autoStatusDefault);
          }
        }

        // Delete G→App: qualquer task com googleEventId numa agenda sincronizada
        // que não veio na resposta → foi removida no Google
        if (d.settings.deleteOnRemoteRemoval) {
          for (const area of d.areas) {
            for (const task of area.tasks) {
              if (!task.googleEventId || !task.googleCalendarId) continue;
              const calSet = receivedByCal[task.googleCalendarId];
              if (!calSet) continue; // agenda não sincronizada agora
              if (!calSet.has(task.googleEventId)) {
                d.deleteTask(area.id, task.id);
                d.addLog(`Removida (sumiu do Google): ${task.text}`);
              }
            }
          }
        }
      }

      // --- EXPORT ---
      if (d.settings.syncDirection !== "import") {
        // Decide agenda alvo de escrita
        let writeCalendarId: string;
        if (d.settings.useAppCalendarOnly) {
          writeCalendarId = await d.ensureAppCalendarId();
        } else {
          writeCalendarId = calendarIds[0] || "primary";
        }

        const allTasks = d.areas.flatMap(a => a.tasks.map(t => ({ task: t, areaId: a.id })));
        for (const { task, areaId } of allTasks) {
          // Cópias concluídas/arquivo local não viram eventos novos no Google.
          if (task.status === "done" || task.recurrenceSourceId) continue;
          if (!task.dueDate || !task.dueTime) continue;
          // Não re-exporta o que veio do Google (já tem id em outra agenda)
          if (task.googleEventId && task.googleCalendarId && task.googleCalendarId !== writeCalendarId) continue;

          const endDate = task.endDate || task.dueDate;
          const endTime = task.endTime || addOneHour(task.dueTime);
          const currentHash = taskContentHash(task);
          const input = {
            summary: task.text,
            description: task.comments?.map(c => c.text).join("\n\n") || undefined,
            startISO: localToIso(task.dueDate, task.dueTime, d.timezone),
            endISO: localToIso(endDate, endTime, d.timezone),
            colorId: priorityToGoogleColor(task.priority),
            recurrence: task.recurrence ? [recurrenceToRRule(task.recurrence)].filter(Boolean) : undefined,
          };

          try {
            if (!task.googleEventId) {
              const { event, etag } = await createEvent(d.settings.clientId, writeCalendarId, input);
              d.setTaskGoogleMeta(areaId, task.id, {
                googleEventId: event.id,
                googleCalendarId: writeCalendarId,
                googleEtag: etag,
                googleUpdated: event.updated,
                googleLastHash: currentHash,
                googleSyncedAt: new Date().toISOString(),
              });
            } else if (task.googleLastHash !== currentHash) {
              const { event, etag } = await updateEvent(
                d.settings.clientId, task.googleCalendarId!, task.googleEventId, input, task.googleEtag,
              );
              d.setTaskGoogleMeta(areaId, task.id, {
                googleEtag: etag,
                googleUpdated: event.updated,
                googleLastHash: currentHash,
                googleSyncedAt: new Date().toISOString(),
              });
            }
          } catch (e: any) {
            if (e instanceof PreconditionFailedError) {
              d.addLog(`Conflito (Google mais novo) em "${task.text}" — será reimportada`, false);
              // limpa hash p/ próxima volta de import sobrescrever local
              d.setTaskGoogleMeta(areaId, task.id, { googleLastHash: undefined, googleEtag: e.remoteEtag });
            } else {
              throw e;
            }
          }
        }
      }

      const stamp = new Date().toISOString();
      setLastSyncAt(stamp);
      d.addLog("Sincronização concluída");
    } catch (e: any) {
      d.addLog(`Erro na sincronização: ${e.message}`, false);
    } finally {
      setIsSyncing(false);
      // libera lock se for nosso
      const cur = readLock();
      if (cur && cur.clientId === d.clientInstanceId) clearLock();
    }
  }, [drainOutbox]);

  // Sync periódico
  useEffect(() => {
    if (!settings.enabled || settings.paused || !isConnected) return;
    runSync();
    const id = setInterval(runSync, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [settings.enabled, settings.paused, isConnected, runSync]);

  // Drena outbox quando voltar online
  useEffect(() => {
    const onOnline = () => { drainOutbox(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [drainOutbox]);

  // Auto-status loop
  useEffect(() => {
    const tick = () => {
      const d = depsRef.current;
      const now = getNowInTimezone(d.timezone);
      for (const area of d.areas) {
        for (const task of area.tasks) {
          if (!task.autoStatus) continue;
          // Cópias históricas de recorrência são arquivo local; não devem voltar
          // para "fazendo" pelo relógio automático.
          if (task.recurrenceSourceId) continue;
          const next = computeAutoStatus({
            dueDate: task.dueDate, dueTime: task.dueTime,
            endDate: task.endDate, endTime: task.endTime,
            currentStatus: task.status,
            nowDate: now.date, nowTime: now.time,
          });
          if (next) d.updateTaskStatus(area.id, task.id, next);
        }
      }
    };
    tick();
    const id = setInterval(tick, AUTO_STATUS_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  /** Enfileira deleção remota (chamar quando o usuário deleta uma task localmente). */
  const deleteRemoteEvent = useCallback(async (task: Task) => {
    if (!task.googleEventId || !task.googleCalendarId || !settings.clientId) return;
    if (!navigator.onLine) {
      enqueueOutbox({ op: "delete", calendarId: task.googleCalendarId, eventId: task.googleEventId });
      addLog(`Deleção enfileirada (offline): ${task.text}`);
      return;
    }
    try {
      await deleteEvent(settings.clientId, task.googleCalendarId, task.googleEventId);
      addLog(`Evento removido no Google: ${task.text}`);
    } catch (e: any) {
      enqueueOutbox({ op: "delete", calendarId: task.googleCalendarId, eventId: task.googleEventId });
      addLog(`Falha ao remover (enfileirado): ${e.message}`, false);
    }
  }, [settings.clientId, addLog]);

  /** Cria (ou reaproveita) agenda dedicada "App Tasks". */
  const ensureAppCalendar = useCallback(async (): Promise<string> => {
    if (settings.appCalendarId) return settings.appCalendarId;
    const cal = await createAppCalendar(settings.clientId, "App Tasks");
    addLog(`Agenda dedicada criada: ${cal.summary}`);
    return cal.id;
  }, [settings.appCalendarId, settings.clientId, addLog]);

  return {
    isConnected, isSyncing, calendars, lastSyncAt,
    connect, disconnect, refreshCalendars,
    runSync, deleteRemoteEvent, ensureAppCalendar,
    outboxSize: readOutbox().length,
  };
}

function addOneHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + 60;
  const nh = Math.floor((total % (24 * 60)) / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}
