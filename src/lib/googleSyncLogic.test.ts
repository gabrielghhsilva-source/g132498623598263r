import { describe, it, expect } from "vitest";
import {
  priorityToGoogleColor,
  googleColorToPriority,
  computeAutoStatus,
  recurrenceToRRule,
  rruleToRecurrence,
  taskContentHash,
} from "./googleSyncLogic";

describe("priority ↔ google color", () => {
  it("mapeia ida e volta para todas as prioridades", () => {
    expect(googleColorToPriority(priorityToGoogleColor("urgent"))).toBe("urgent");
    expect(googleColorToPriority(priorityToGoogleColor("high"))).toBe("high");
    expect(googleColorToPriority(priorityToGoogleColor("medium"))).toBe("medium");
    expect(googleColorToPriority(priorityToGoogleColor("low"))).toBe("low");
    expect(priorityToGoogleColor("none")).toBeUndefined();
    expect(googleColorToPriority(undefined)).toBe("none");
  });
});

describe("computeAutoStatus", () => {
  const base = { dueDate: "2026-06-17", dueTime: "15:00", endDate: "2026-06-17", endTime: "16:00" } as const;
  it("antes do início → todo", () => {
    expect(computeAutoStatus({ ...base, currentStatus: "todo", nowDate: "2026-06-17", nowTime: "14:30" })).toBeNull();
    expect(computeAutoStatus({ ...base, currentStatus: "in-progress", nowDate: "2026-06-17", nowTime: "14:30" })).toBe("todo");
  });
  it("durante a janela → in-progress", () => {
    expect(computeAutoStatus({ ...base, currentStatus: "todo", nowDate: "2026-06-17", nowTime: "15:30" })).toBe("in-progress");
  });
  it("após o fim → done", () => {
    expect(computeAutoStatus({ ...base, currentStatus: "in-progress", nowDate: "2026-06-17", nowTime: "16:30" })).toBe("done");
  });
  it("sem hora → null", () => {
    expect(computeAutoStatus({ dueDate: "2026-06-17", currentStatus: "todo", nowDate: "2026-06-17", nowTime: "14:00" })).toBeNull();
  });
});

describe("RRULE", () => {
  it("weekly com todos os dias vira DAILY", () => {
    expect(recurrenceToRRule({ type: "weekly", daysOfWeek: [0,1,2,3,4,5,6], advanceDays: 0 })).toBe("RRULE:FREQ=DAILY");
  });
  it("weekly subset", () => {
    expect(recurrenceToRRule({ type: "weekly", daysOfWeek: [1, 3, 5], advanceDays: 0 })).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR");
  });
  it("monthly", () => {
    expect(recurrenceToRRule({ type: "monthly", dayOfMonth: 15, advanceDays: 0 })).toBe("RRULE:FREQ=MONTHLY;BYMONTHDAY=15");
  });
  it("parse DAILY vira weekly com 7 dias", () => {
    const r = rruleToRecurrence("RRULE:FREQ=DAILY")!;
    expect(r.type).toBe("weekly");
    expect(r.daysOfWeek).toEqual([0,1,2,3,4,5,6]);
  });
  it("parse WEEKLY BYDAY", () => {
    const r = rruleToRecurrence("RRULE:FREQ=WEEKLY;BYDAY=MO,FR")!;
    expect(r.daysOfWeek).toEqual([1, 5]);
  });
});

describe("taskContentHash", () => {
  it("igual para conteúdo igual", () => {
    const a = { text: "x", dueDate: "2026-06-17", dueTime: "10:00", priority: "high" as const };
    expect(taskContentHash(a)).toBe(taskContentHash(a));
  });
  it("muda quando texto muda", () => {
    expect(taskContentHash({ text: "a" })).not.toBe(taskContentHash({ text: "b" }));
  });
});
