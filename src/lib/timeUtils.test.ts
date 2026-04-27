import { describe, it, expect } from "vitest";
import { addMinutesToDue, minutesUntilDue } from "./timeUtils";

describe("addMinutesToDue", () => {
  it("adiciona minutos dentro do mesmo dia", () => {
    expect(addMinutesToDue("2026-04-27", "10:00", 30)).toEqual({ date: "2026-04-27", time: "10:30" });
    expect(addMinutesToDue("2026-04-27", "10:00", 5)).toEqual({ date: "2026-04-27", time: "10:05" });
  });

  it("vira para o próximo dia ao ultrapassar 23:59", () => {
    expect(addMinutesToDue("2026-04-27", "23:50", 30)).toEqual({ date: "2026-04-28", time: "00:20" });
  });

  it("usa 23:59 como base quando dueTime é undefined", () => {
    expect(addMinutesToDue("2026-04-27", undefined, 5)).toEqual({ date: "2026-04-28", time: "00:04" });
  });

  it("aceita minutos negativos (antecipa)", () => {
    expect(addMinutesToDue("2026-04-27", "10:00", -15)).toEqual({ date: "2026-04-27", time: "09:45" });
  });
});

describe("minutesUntilDue (sanity)", () => {
  it("retorna número finito", () => {
    const m = minutesUntilDue("2099-01-01", "12:00", "America/Sao_Paulo");
    expect(typeof m).toBe("number");
    expect(Number.isFinite(m)).toBe(true);
  });
});
