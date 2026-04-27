/**
 * Get current date and time strings in the user's selected timezone.
 */
export function getNowInTimezone(tz: string): { date: string; time: string } {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  return { date, time };
}

/**
 * Check if a task is overdue based on its dueDate, dueTime and the user's timezone.
 * A task without dueTime is considered due at end of day (23:59).
 */
export function isTaskOverdue(
  dueDate: string | undefined,
  dueTime: string | undefined,
  status: string,
  tz: string
): boolean {
  if (!dueDate || status === "done") return false;
  const now = getNowInTimezone(tz);
  const effectiveTime = dueTime || "23:59";

  if (dueDate < now.date) return true;
  if (dueDate === now.date && effectiveTime < now.time) return true;
  return false;
}

/**
 * Get minutes until a task is due, relative to the user's timezone.
 * Returns negative if overdue, positive if in the future.
 */
export function minutesUntilDue(
  dueDate: string,
  dueTime: string | undefined,
  tz: string
): number {
  const now = getNowInTimezone(tz);
  const effectiveTime = dueTime || "23:59";

  // Parse dates into comparable minutes
  const [nowY, nowM, nowD] = now.date.split("-").map(Number);
  const [nowH, nowMin] = now.time.split(":").map(Number);
  const [dueY, dueM, dueD] = dueDate.split("-").map(Number);
  const [dueH, dueMin] = effectiveTime.split(":").map(Number);

  const nowTotal = new Date(nowY, nowM - 1, nowD, nowH, nowMin).getTime();
  const dueTotal = new Date(dueY, dueM - 1, dueD, dueH, dueMin).getTime();

  return Math.round((dueTotal - nowTotal) / 60000);
}

/**
 * Adiciona `minutes` a um par dueDate/dueTime e retorna a nova data/hora.
 * Se dueTime não estiver definido, usa "23:59" como base.
 */
export function addMinutesToDue(
  dueDate: string,
  dueTime: string | undefined,
  minutes: number,
): { date: string; time: string } {
  const effectiveTime = dueTime || "23:59";
  const [y, m, d] = dueDate.split("-").map(Number);
  const [h, min] = effectiveTime.split(":").map(Number);
  const base = new Date(y, m - 1, d, h, min);
  base.setMinutes(base.getMinutes() + minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`,
    time: `${pad(base.getHours())}:${pad(base.getMinutes())}`,
  };
}
