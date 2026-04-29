import { describe, it, expect } from "vitest";
import {
  levelFromXp, xpRequiredForLevel, progressFromXp, streakMultiplier,
  computeTaskBase, applyTaskCompletion, applyContribution, bumpStreak,
} from "./xpEngine";
import { DEFAULT_XP_STATE } from "./types";

describe("xpEngine - level curve", () => {
  it("level 1 requires 0 xp", () => {
    expect(xpRequiredForLevel(1)).toBe(0);
    expect(levelFromXp(0)).toBe(1);
  });
  it("level 2 requires 100 xp (1*100)", () => {
    expect(xpRequiredForLevel(2)).toBe(100);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(99)).toBe(1);
  });
  it("level 3 requires 300 xp cumulative (100+200)", () => {
    expect(xpRequiredForLevel(3)).toBe(300);
    expect(levelFromXp(300)).toBe(3);
  });
  it("progress reports correct fraction", () => {
    const p = progressFromXp(150);
    expect(p.level).toBe(2);
    expect(p.intoLevel).toBe(50);
    expect(p.needed).toBe(200);
    expect(p.progress).toBeCloseTo(0.25);
  });
});

describe("xpEngine - streak", () => {
  it("multiplier is 1.0 below 3 days, +0.1 every 3", () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(2)).toBe(1);
    expect(streakMultiplier(3)).toBeCloseTo(1.1);
    expect(streakMultiplier(6)).toBeCloseTo(1.2);
  });
  it("caps at x2.0", () => {
    expect(streakMultiplier(1000)).toBe(2.0);
  });
  it("bumpStreak resets after a gap", () => {
    const s = { ...DEFAULT_XP_STATE, streakDays: 5, lastStreakDate: "2026-01-01" };
    const next = bumpStreak(s, "2026-01-10");
    expect(next.streakDays).toBe(1);
  });
  it("bumpStreak increments on consecutive day", () => {
    const s = { ...DEFAULT_XP_STATE, streakDays: 5, lastStreakDate: "2026-01-01" };
    const next = bumpStreak(s, "2026-01-02");
    expect(next.streakDays).toBe(6);
  });
});

describe("xpEngine - task XP", () => {
  it("base is 10 + priority bonus", () => {
    const { base } = computeTaskBase({ task: { id: "t", text: "x", priority: "urgent", subtasks: [] } });
    expect(base).toBe(10 + 35);
  });
  it("subtasks add +2 each", () => {
    const { base } = computeTaskBase({
      task: { id: "t", text: "x", priority: "none", subtasks: [
        { id: "1", text: "a", done: true },
        { id: "2", text: "b", done: true },
        { id: "3", text: "c", done: false },
      ] },
    });
    expect(base).toBe(10 + 2 + 2);
  });
  it("applyTaskCompletion levels up when crossing threshold", () => {
    let s = { ...DEFAULT_XP_STATE, totalXp: 95 };
    s.currentLevel = 1;
    const res = applyTaskCompletion(s, { task: { id: "t", text: "x", priority: "none", subtasks: [] } });
    expect(res.leveledUp).toBe(true);
    expect(res.newLevel).toBe(2);
  });
});

describe("xpEngine - contributions", () => {
  it("credits +200 only once per investment per month", () => {
    const date = new Date("2026-04-15");
    const r1 = applyContribution(DEFAULT_XP_STATE, "inv1", 0, date);
    expect(r1.entries.find(e => e.reason === "monthly_contribution")).toBeDefined();
    const r2 = applyContribution(r1.state, "inv1", 0, date);
    expect(r2.entries.find(e => e.reason === "monthly_contribution")).toBeUndefined();
  });
  it("amount bonus = floor(amount/10) XP", () => {
    const r = applyContribution(DEFAULT_XP_STATE, "inv1", 250, new Date());
    const amountEntry = r.entries.find(e => e.reason === "contribution_amount");
    expect(amountEntry?.amount).toBe(25);
  });
});
