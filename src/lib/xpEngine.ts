/**
 * XP Engine — pure, testable logic for the level/XP system.
 *
 * Formula (granular & strategic):
 *  - Task done:       10 XP base
 *  - Priority bonus:  low +5 / medium +10 / high +20 / urgent +35
 *  - Subtask done:    +2
 *  - Early completion (before due): +15
 *  - Late completion (after due, but still done): -5
 *  - Daily bonus:     +50 once per day when reaching 5 done tasks
 *  - Monthly contribution registered: +200 (once per investment per calendar month)
 *  - Contribution amount bonus: +1 XP per R$10 invested
 *  - Streak: every 3 consecutive days completing >=1 task adds +0.1 multiplier (cap x2.0)
 *
 * Level curve (classic RPG):
 *   xpRequired(level n -> n+1) = n * 100
 *   So total XP to reach level L is sum_{i=1}^{L-1} i*100 = 100 * L*(L-1)/2
 *   Inverse: level = floor( (1 + sqrt(1 + 8*totalXp/100)) / 2 )
 */

import type { Task, TaskPriority, XpEntry, XpReason, XpState } from "./types";

// === Pure helpers ===

export const PRIORITY_XP: Record<TaskPriority, number> = {
  none: 0, low: 5, medium: 10, high: 20, urgent: 35,
};

export const TASK_BASE_XP = 10;
export const SUBTASK_XP = 2;
export const EARLY_XP = 15;
export const LATE_XP = -5;
export const DAILY_BONUS_XP = 50;
export const DAILY_BONUS_THRESHOLD = 5;
export const MONTHLY_CONTRIBUTION_XP = 200;
export const CONTRIBUTION_AMOUNT_DIVISOR = 10; // 1 XP per R$10
export const STREAK_STEP_DAYS = 3;
export const STREAK_STEP_MULT = 0.1;
export const STREAK_MAX_MULT = 2.0;

/** Total cumulative XP required to *reach* the given level (level 1 = 0 XP). */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * (level * (level - 1)) / 2);
}

/** Compute the current level from total cumulative XP. */
export function levelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  // Inverse of n*(n-1)/2 * 100 = totalXp => n = (1 + sqrt(1 + 8*totalXp/100)) / 2
  const n = Math.floor((1 + Math.sqrt(1 + (8 * totalXp) / 100)) / 2);
  return Math.max(1, n);
}

/** Returns { level, currentLevelXp, nextLevelXp, progress } for the given totalXp. */
export function progressFromXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  intoLevel: number;
  needed: number;
  progress: number; // 0..1
} {
  const level = levelFromXp(totalXp);
  const currentLevelXp = xpRequiredForLevel(level);
  const nextLevelXp = xpRequiredForLevel(level + 1);
  const intoLevel = totalXp - currentLevelXp;
  const needed = nextLevelXp - currentLevelXp;
  const progress = needed > 0 ? Math.max(0, Math.min(1, intoLevel / needed)) : 0;
  return { level, currentLevelXp, nextLevelXp, intoLevel, needed, progress };
}

/** Compute current streak multiplier given consecutive streak days. */
export function streakMultiplier(streakDays: number): number {
  const steps = Math.floor(streakDays / STREAK_STEP_DAYS);
  return Math.min(STREAK_MAX_MULT, 1 + steps * STREAK_STEP_MULT);
}

// === Date helpers (pure) ===
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function ym(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// === Award computation ===

export interface TaskAwardContext {
  task: Pick<Task, "id" | "text" | "priority" | "dueDate" | "dueTime" | "subtasks">;
  /** ISO string of the moment the task was completed (defaults to now). */
  completedAt?: string;
}

/** Compute base XP earned from completing a single task (no streak multiplier yet). */
export function computeTaskBase(ctx: TaskAwardContext): { base: number; reasonBreakdown: Array<{ reason: XpReason; amount: number }> } {
  const breakdown: Array<{ reason: XpReason; amount: number }> = [];
  let total = TASK_BASE_XP;
  breakdown.push({ reason: "task_done", amount: TASK_BASE_XP });

  const prio: TaskPriority = (ctx.task.priority || "none") as TaskPriority;
  const prioBonus = PRIORITY_XP[prio] || 0;
  if (prioBonus !== 0) {
    total += prioBonus;
    // bundled into "task_done" for display brevity
    breakdown[0].amount += prioBonus;
  }

  // Subtasks done
  const subs = ctx.task.subtasks || [];
  const subDone = subs.filter(s => s.done).length;
  if (subDone > 0) {
    const sub = subDone * SUBTASK_XP;
    total += sub;
    breakdown.push({ reason: "subtask_done", amount: sub });
  }

  // Early / late
  if (ctx.task.dueDate) {
    const due = parseDue(ctx.task.dueDate, ctx.task.dueTime);
    const completed = ctx.completedAt ? new Date(ctx.completedAt) : new Date();
    if (completed.getTime() < due.getTime()) {
      total += EARLY_XP;
      breakdown.push({ reason: "early_completion", amount: EARLY_XP });
    } else {
      total += LATE_XP;
      breakdown.push({ reason: "late_completion", amount: LATE_XP });
    }
  }

  return { base: Math.max(0, total), reasonBreakdown: breakdown };
}

function parseDue(dueDate: string, dueTime?: string): Date {
  const t = dueTime && /^\d{2}:\d{2}$/.test(dueTime) ? dueTime : "23:59";
  return new Date(`${dueDate}T${t}:00`);
}

// === State transitions (pure) ===

const HISTORY_LIMIT = 200;

export interface ApplyResult {
  state: XpState;
  entries: XpEntry[];
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
}

function pushEntries(
  state: XpState,
  entries: XpEntry[],
): XpState {
  const totalXp = state.totalXp + entries.reduce((a, e) => a + e.amount, 0);
  const history = [...state.history, ...entries].slice(-HISTORY_LIMIT);
  const today = entries[0] ? entries[0].ts.slice(0, 10) : ymd(new Date());
  const dailyXp = { ...state.dailyXp };
  const inc = entries.reduce((a, e) => a + e.amount, 0);
  dailyXp[today] = (dailyXp[today] || 0) + inc;
  return {
    ...state,
    totalXp,
    currentLevel: levelFromXp(totalXp),
    history,
    dailyXp,
  };
}

function makeEntry(reason: XpReason, base: number, mult: number, detail?: string, ts?: string): XpEntry {
  return {
    id: (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    ts: ts || new Date().toISOString(),
    amount: Math.round(base * mult),
    base,
    multiplier: mult,
    reason,
    detail,
  };
}

/** Update streak based on a new "active" day. Returns new streak state. */
export function bumpStreak(state: XpState, today: string): XpState {
  if (state.lastStreakDate === today) return state; // already counted today
  let newStreak = 1;
  if (state.lastStreakDate) {
    const prev = new Date(state.lastStreakDate);
    const cur = new Date(today);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) newStreak = state.streakDays + 1;
    else if (diff <= 0) newStreak = state.streakDays || 1;
    else newStreak = 1;
  }
  return { ...state, streakDays: newStreak, lastStreakDate: today };
}

/** Apply task completion: increments daily count, awards XP, daily bonus if threshold hit, bumps streak. */
export function applyTaskCompletion(state: XpState, ctx: TaskAwardContext, now = new Date()): ApplyResult {
  const oldLevel = state.currentLevel;
  const today = ymd(now);

  // 1) Bump streak first (today becomes active)
  let next = bumpStreak(state, today);
  const mult = streakMultiplier(next.streakDays);

  // 2) Compute task base XP
  const { base } = computeTaskBase(ctx);
  const taskEntry = makeEntry("task_done", base, mult, ctx.task.text, now.toISOString());
  const entries: XpEntry[] = [taskEntry];

  // 3) Increment daily done count, check daily bonus threshold
  const newCount = (next.dailyDoneCount[today] || 0) + 1;
  const newDailyDone = { ...next.dailyDoneCount, [today]: newCount };
  next = { ...next, dailyDoneCount: newDailyDone };

  if (newCount === DAILY_BONUS_THRESHOLD) {
    entries.push(makeEntry("daily_bonus", DAILY_BONUS_XP, mult, `${DAILY_BONUS_THRESHOLD} tarefas em ${today}`, now.toISOString()));
  }

  // 4) Streak bonus entry (cosmetic) — only when streak just crossed a step
  if (next.streakDays > 1 && next.streakDays % STREAK_STEP_DAYS === 0 && next.lastStreakDate === today) {
    entries.push(makeEntry("streak_bonus", 25, mult, `Streak de ${next.streakDays} dias!`, now.toISOString()));
  }

  next = pushEntries(next, entries);
  const newLevel = next.currentLevel;
  return { state: next, entries, leveledUp: newLevel > oldLevel, oldLevel, newLevel };
}

/** Award subtask completion. */
export function applySubtaskCompletion(state: XpState, taskText: string, now = new Date()): ApplyResult {
  const oldLevel = state.currentLevel;
  const today = ymd(now);
  let next = bumpStreak(state, today);
  const mult = streakMultiplier(next.streakDays);
  const entry = makeEntry("subtask_done", SUBTASK_XP, mult, taskText, now.toISOString());
  next = pushEntries(next, [entry]);
  return { state: next, entries: [entry], leveledUp: next.currentLevel > oldLevel, oldLevel, newLevel: next.currentLevel };
}

/** Award monthly contribution + amount-based bonus. Only credits +200 once per (investmentId, month). */
export function applyContribution(
  state: XpState,
  investmentId: string,
  amount: number,
  now = new Date(),
): ApplyResult {
  const oldLevel = state.currentLevel;
  const monthKey = ym(now);
  const entries: XpEntry[] = [];
  const credited = state.monthlyContributions[monthKey] || [];
  let next = state;

  if (!credited.includes(investmentId)) {
    entries.push(makeEntry("monthly_contribution", MONTHLY_CONTRIBUTION_XP, 1, `Aporte do mês`, now.toISOString()));
    next = {
      ...next,
      monthlyContributions: {
        ...next.monthlyContributions,
        [monthKey]: [...credited, investmentId],
      },
    };
  }

  // Amount bonus (always, even on multiple contributions same month)
  if (amount > 0) {
    const amountXp = Math.floor(amount / CONTRIBUTION_AMOUNT_DIVISOR);
    if (amountXp > 0) {
      entries.push(makeEntry("contribution_amount", amountXp, 1, `R$ ${amount.toFixed(2)} aportados`, now.toISOString()));
    }
  }

  if (entries.length === 0) {
    return { state: next, entries: [], leveledUp: false, oldLevel, newLevel: oldLevel };
  }

  next = pushEntries(next, entries);
  return { state: next, entries, leveledUp: next.currentLevel > oldLevel, oldLevel, newLevel: next.currentLevel };
}
