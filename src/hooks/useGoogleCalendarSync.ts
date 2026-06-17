import { useEffect, useRef, useCallback, useState } from "react";
import { Task, TaskArea } from "@/lib/types";
import {
  listCalendars, listEvents, createEvent, updateEvent, deleteEvent,
  loadStoredToken, clearStoredToken, getValidAccessToken,
  GoogleEvent, GoogleCalendarMeta,
} from "@/lib/googleCalendar";
import {
  priorityToGoogleColor, googleColorToPriority,
  computeAutoStatus, recurrenceToRRule, rruleToRecurrence,
  isoToLocalDateTime, localToIso, taskContentHash,
} from "@/lib/googleSyncLogic";
import { getNowInTimezone } from "@/lib/timeUtils";
import { GoogleCalendarSettings } from "@/hooks/useGoogleCalendarStore";

interface SyncDeps {
  areas: TaskArea[];
  timezone: string;
  settings: GoogleCalendarSettings;
  setTaskGoogleMeta: (areaId: string, taskId: string, meta: Partial<Pick<Task, "googleEventId" | "googleCalendarId" | "googleLastHash" | "googleSyncedAt">>) => void;
  upsertGoogleEvent: (targetAreaId: string, patch: any, autoStatusDefault: boolean) => void;
  updateTaskStatus: (areaId: string, taskId: string, status: Task["status"]) => void;
  addLog: (message: string, ok?: boolean) => void;
  ensureTargetArea: () => string; // garante área "Agenda Google" e devolve id
}

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const AUTO_STATUS_INTERVAL_MS = 30 * 1000; // 30s

export function useGoogleCalendarSync(deps: SyncDeps) {
  const { areas, timezone, settings, setTaskGoogleMeta, upsertGoogleEvent, updateTaskStatus, addLog, ensureTargetArea } = deps;
  const [isConnected, setIsConnected] = useState(() => !!loadStoredToken());
  const [isSyncing, setIsSyncing] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCalendarMeta[]>([]);
  const depsRef = useRef(deps);
  depsRef.current = deps;

  // --- Connectividade ---
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

  // --- Sync principal ---
  const runSync = useCallback(async () => {
    const d = depsRef.current;
    if (!d.settings.enabled || d.settings.paused || !d.settings.clientId) return;
    if (!loadStoredToken()) return;

    setIsSyncing(true);
    try {
      const targetAreaId = d.ensureTargetArea();
      const calendarIds = d.settings.selectedCalendarIds.length > 0 ? d.settings.selectedCalendarIds : ["primary"];
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + d.settings.daysAhead * 24 * 60 * 60 * 1000).toISOString();

      // --- IMPORT ---
      if (d.settings.syncDirection !== "export") {
        for (const calId of calendarIds) {
          const events = await listEvents(d.settings.clientId, calId, timeMin, timeMax);
          for (const ev of events) {
            if (!ev.start?.dateTime || !ev.end?.dateTime) continue; // pula all-day
            const start = isoToLocalDateTime(ev.start.dateTime, d.timezone);
            const end = isoToLocalDateTime(ev.end.dateTime, d.timezone);
            const recurrence = rruleToRecurrence(ev.recurrence?.[0]);
            d.upsertGoogleEvent(targetAreaId, {
              googleEventId: ev.id,
              googleCalendarId: calId,
              text: ev.summary || "Evento sem título",
              dueDate: start.date, dueTime: start.time,
              endDate: end.date, endTime: end.time,
              priority: googleColorToPriority(ev.colorId),
              recurrence,
            }, d.settings.autoStatusDefault);
          }
        }
      }

      // --- EXPORT ---
      if (d.settings.syncDirection !== "import") {
        const allTasks = d.areas.flatMap(a => a.tasks.map(t => ({ task: t, areaId: a.id })));
        for (const { task, areaId } of allTasks) {
          if (!task.dueDate || !task.dueTime) continue;
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
          const targetCal = task.googleCalendarId || calendarIds[0] || "primary";

          if (!task.googleEventId) {
            const created = await createEvent(d.settings.clientId, targetCal, input);
            d.setTaskGoogleMeta(areaId, task.id, {
              googleEventId: created.id,
              googleCalendarId: targetCal,
              googleLastHash: currentHash,
              googleSyncedAt: new Date().toISOString(),
            });
          } else if (task.googleLastHash !== currentHash) {
            await updateEvent(d.settings.clientId, targetCal, task.googleEventId, input);
            d.setTaskGoogleMeta(areaId, task.id, {
              googleLastHash: currentHash,
              googleSyncedAt: new Date().toISOString(),
            });
          }
        }
      }

      d.addLog("Sincronização concluída");
    } catch (e: any) {
      d.addLog(`Erro na sincronização: ${e.message}`, false);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sync periódico
  useEffect(() => {
    if (!settings.enabled || settings.paused || !isConnected) return;
    runSync();
    const id = setInterval(runSync, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [settings.enabled, settings.paused, isConnected, runSync]);

  // --- Auto-status loop ---
  useEffect(() => {
    const tick = () => {
      const d = depsRef.current;
      const now = getNowInTimezone(d.timezone);
      for (const area of d.areas) {
        for (const task of area.tasks) {
          if (!task.autoStatus) continue;
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

  // --- Delete remote on local delete ---
  // (mantido simples: o usuário usa o botão de delete normal; se a task tinha
  //  googleEventId, esta função utilitária pode ser chamada explicitamente)
  const deleteRemoteEvent = useCallback(async (task: Task) => {
    if (!task.googleEventId || !task.googleCalendarId) return;
    if (!settings.clientId) return;
    try {
      await deleteEvent(settings.clientId, task.googleCalendarId, task.googleEventId);
      addLog(`Evento removido: ${task.text}`);
    } catch (e: any) {
      addLog(`Falha ao remover evento: ${e.message}`, false);
    }
  }, [settings.clientId, addLog]);

  return {
    isConnected, isSyncing, calendars,
    connect, disconnect, refreshCalendars,
    runSync, deleteRemoteEvent,
  };
}

function addOneHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + 60;
  const nh = Math.floor((total % (24 * 60)) / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}
