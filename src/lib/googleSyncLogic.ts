/**
 * Pure logic for Google Calendar sync — no DOM, no fetch, fully testable.
 */
import { TaskPriority, TaskStatus, RecurrenceRule } from "@/lib/types";

// Google Calendar event colorId mapping
// https://developers.google.com/calendar/api/v3/reference/colors
export function priorityToGoogleColor(priority?: TaskPriority): string | undefined {
  switch (priority) {
    case "urgent": return "11"; // Tomato (red)
    case "high":   return "6";  // Tangerine (orange)
    case "medium": return "5";  // Banana (yellow)
    case "low":    return "7";  // Peacock (blue)
    default:       return undefined;
  }
}

export function googleColorToPriority(colorId?: string): TaskPriority {
  switch (colorId) {
    case "11": return "urgent";
    case "6":  return "high";
    case "5":  return "medium";
    case "7":  return "low";
    default:   return "none";
  }
}

/**
 * Decide o status automático com base na hora atual e no intervalo do evento.
 * - Antes do início     → "todo"
 * - Dentro da janela    → "in-progress"
 * - Após o fim          → "done"
 *
 * Retorna `null` se não houver mudança ou se faltarem horários.
 *
 * Respeita override do usuário: se manualOverride for verdadeiro, retorna null.
 */
export function computeAutoStatus(args: {
  dueDate?: string;
  dueTime?: string;
  endDate?: string;
  endTime?: string;
  currentStatus: TaskStatus;
  nowDate: string; // "YYYY-MM-DD" no fuso do usuário
  nowTime: string; // "HH:MM"
}): TaskStatus | null {
  const { dueDate, dueTime, endDate, endTime, currentStatus, nowDate, nowTime } = args;
  if (!dueDate || !dueTime) return null;

  const start = `${dueDate}T${dueTime}`;
  const finalEndDate = endDate || dueDate;
  const finalEndTime = endTime || dueTime; // se não houver fim, vira "pontual"
  const end = `${finalEndDate}T${finalEndTime}`;
  const now = `${nowDate}T${nowTime}`;

  let target: TaskStatus;
  if (now < start) target = "todo";
  else if (now >= start && now < end) target = "in-progress";
  else target = "done";

  if (target === currentStatus) return null;
  return target;
}

/**
 * RRULE encoding/decoding.
 * Mapeia tipo daily (todos os dias da semana) automaticamente.
 */
const DAY_MAP = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export function recurrenceToRRule(rule: RecurrenceRule): string {
  if (rule.type === "weekly" && rule.daysOfWeek?.length) {
    const days = [...rule.daysOfWeek].sort();
    if (days.length === 7) return "RRULE:FREQ=DAILY";
    const byday = days.map(d => DAY_MAP[d]).join(",");
    return `RRULE:FREQ=WEEKLY;BYDAY=${byday}`;
  }
  if (rule.type === "monthly") {
    const mode = rule.monthlyMode || "day-of-month";
    if (mode === "last-day") return "RRULE:FREQ=MONTHLY;BYMONTHDAY=-1";
    if (mode === "nth-weekday" && rule.nthWeek && rule.nthWeekday !== undefined) {
      return `RRULE:FREQ=MONTHLY;BYDAY=${rule.nthWeek}${DAY_MAP[rule.nthWeekday]}`;
    }
    if (rule.dayOfMonth) return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${rule.dayOfMonth}`;
  }
  return "";
}

export function rruleToRecurrence(rrule?: string): RecurrenceRule | undefined {
  if (!rrule) return undefined;
  const line = rrule.startsWith("RRULE:") ? rrule.slice(6) : rrule;
  const parts = Object.fromEntries(
    line.split(";").map(kv => {
      const [k, v] = kv.split("=");
      return [k.toUpperCase(), v];
    })
  );
  const freq = parts.FREQ;
  if (freq === "DAILY") {
    return { type: "weekly", daysOfWeek: [0, 1, 2, 3, 4, 5, 6], advanceDays: 0 };
  }
  if (freq === "WEEKLY") {
    const byday = (parts.BYDAY || "").split(",").filter(Boolean);
    const daysOfWeek = byday
      .map(d => DAY_MAP.indexOf(d.toUpperCase()))
      .filter(i => i >= 0);
    return { type: "weekly", daysOfWeek, advanceDays: 0 };
  }
  if (freq === "MONTHLY") {
    if (parts.BYMONTHDAY === "-1") {
      return { type: "monthly", monthlyMode: "last-day", advanceDays: 0 };
    }
    if (parts.BYDAY) {
      const m = parts.BYDAY.match(/^(-?\d+)([A-Z]{2})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        const wd = DAY_MAP.indexOf(m[2]);
        const nthWeek = (n === -1 ? -1 : Math.max(1, Math.min(4, n))) as 1 | 2 | 3 | 4 | -1;
        if (wd >= 0) return { type: "monthly", monthlyMode: "nth-weekday", nthWeek, nthWeekday: wd, advanceDays: 0 };
      }
    }
    const day = parseInt(parts.BYMONTHDAY || "1", 10);
    return { type: "monthly", monthlyMode: "day-of-month", dayOfMonth: day, advanceDays: 0 };
  }
  return undefined;
}

/**
 * Converte um datetime ISO (Google: "2026-06-17T15:00:00-03:00") para o par
 * { date: "YYYY-MM-DD", time: "HH:MM" } no fuso passado.
 */
export function isoToLocalDateTime(iso: string, tz: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
  return { date, time };
}

/**
 * Constrói um datetime ISO com offset do fuso para enviar à API do Google.
 * Recebe "YYYY-MM-DD" + "HH:MM" + IANA tz.
 */
export function localToIso(date: string, time: string, tz: string): string {
  // Calcula o offset do fuso para esse instante e monta string ISO.
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  // Cria a data como se fosse UTC primeiro
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Descobre o offset desse instante no fuso
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(asUtc));
  const get = (t: string) => Number(parts.find(p => p.type === t)!.value);
  const tzAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offsetMin = Math.round((tzAsUtc - asUtc) / 60000);
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const offH = String(Math.floor(abs / 60)).padStart(2, "0");
  const offM = String(abs % 60).padStart(2, "0");
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:00${sign}${offH}:${offM}`;
}

/**
 * Hash simples e estável do conteúdo da task que importa pro Google.
 * Usa só os campos que sincronizamos para detectar mudanças.
 */
export function taskContentHash(t: {
  text: string;
  dueDate?: string;
  dueTime?: string;
  endDate?: string;
  endTime?: string;
  priority?: TaskPriority;
  comments?: { text: string }[];
  subtasks?: { text: string; done: boolean }[];
  recurrence?: RecurrenceRule;
}): string {
  const payload = JSON.stringify({
    text: t.text,
    dueDate: t.dueDate,
    dueTime: t.dueTime,
    endDate: t.endDate,
    endTime: t.endTime,
    priority: t.priority || "none",
    desc: (t.comments || []).map(c => c.text).join("|"),
    subs: (t.subtasks || []).map(s => `${s.done ? "x" : "-"}${s.text}`).join("|"),
    rec: t.recurrence || null,
  });
  // FNV-1a 32-bit (suficiente pra detectar diff)
  let h = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16);
}
