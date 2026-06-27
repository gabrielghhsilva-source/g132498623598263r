import { RecurrenceRule } from "@/lib/types";
import { Repeat } from "lucide-react";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];

export type RepeatMode =
  | "none"
  | "daily"
  | "weekly"
  | "weekdays"
  | "weekends"
  | "monthly-day"
  | "monthly-last"
  | "monthly-nth";

interface Props {
  rule: RecurrenceRule | undefined;
  sourceDate: string;
  onChange: (rule: RecurrenceRule | undefined) => void;
  disabled?: boolean;
  disabledReason?: string;
}

function sameSet(a: number[] = [], b: number[] = []) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort().join(",");
  const sb = [...b].sort().join(",");
  return sa === sb;
}

export function getRepeatMode(rule?: RecurrenceRule): RepeatMode {
  if (!rule) return "none";
  if (rule.type === "weekly") {
    const days = rule.daysOfWeek || [];
    if (days.length === 7) return "daily";
    if (sameSet(days, WEEKDAYS)) return "weekdays";
    if (sameSet(days, WEEKENDS)) return "weekends";
    return "weekly";
  }
  if (rule.type === "monthly") {
    const mode = rule.monthlyMode || "day-of-month";
    if (mode === "last-day") return "monthly-last";
    if (mode === "nth-weekday") return "monthly-nth";
    return "monthly-day";
  }
  return "none";
}

export function buildRecurrence(
  mode: RepeatMode,
  days: number[],
  sourceDate: string,
  nthWeek: 1 | 2 | 3 | 4 | -1 = 1,
  nthWeekday = 1,
): RecurrenceRule | undefined {
  const base = new Date((sourceDate || new Date().toISOString().split("T")[0]) + "T12:00:00");
  switch (mode) {
    case "daily": return { type: "weekly", daysOfWeek: [0, 1, 2, 3, 4, 5, 6], advanceDays: 0 };
    case "weekdays": return { type: "weekly", daysOfWeek: WEEKDAYS, advanceDays: 0 };
    case "weekends": return { type: "weekly", daysOfWeek: WEEKENDS, advanceDays: 0 };
    case "weekly": return { type: "weekly", daysOfWeek: days.length ? days : [base.getDay()], advanceDays: 0 };
    case "monthly-day": return { type: "monthly", monthlyMode: "day-of-month", dayOfMonth: base.getDate(), advanceDays: 0 };
    case "monthly-last": return { type: "monthly", monthlyMode: "last-day", advanceDays: 0 };
    case "monthly-nth": return { type: "monthly", monthlyMode: "nth-weekday", nthWeek, nthWeekday, advanceDays: 0 };
    default: return undefined;
  }
}

const NTH_LABELS: Record<string, string> = { "1": "1ª", "2": "2ª", "3": "3ª", "4": "4ª", "-1": "última" };

export function RecurrencePicker({ rule, sourceDate, onChange, disabled, disabledReason }: Props) {
  const mode = getRepeatMode(rule);
  const days = rule?.type === "weekly" ? (rule.daysOfWeek || []) : [];
  const nthWeek = (rule?.nthWeek ?? 1) as 1 | 2 | 3 | 4 | -1;
  const nthWeekday = rule?.nthWeekday ?? 1;

  const update = (m: RepeatMode) => onChange(buildRecurrence(m, days, sourceDate, nthWeek, nthWeekday));

  const toggleDay = (d: number) => {
    const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort();
    onChange(buildRecurrence("weekly", next, sourceDate));
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Repeat className="w-3.5 h-3.5" /> Repetição na agenda
      </label>
      {disabled ? (
        <p className="text-[11px] text-muted-foreground">{disabledReason}</p>
      ) : (
        <>
          <select
            value={mode}
            onChange={e => update(e.target.value as RepeatMode)}
            className="w-full bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
          >
            <option value="none">Não repetir</option>
            <optgroup label="Diário / Semanal">
              <option value="daily">Todos os dias</option>
              <option value="weekdays">Dias úteis (seg–sex)</option>
              <option value="weekends">Fins de semana (sáb/dom)</option>
              <option value="weekly">Dias da semana específicos</option>
            </optgroup>
            <optgroup label="Mensal">
              <option value="monthly-day">Todo mês no dia {new Date(sourceDate + "T12:00:00").getDate()}</option>
              <option value="monthly-last">Último dia do mês</option>
              <option value="monthly-nth">N-ésima semana (ex: 2ª terça)</option>
            </optgroup>
          </select>

          {mode === "weekly" && (
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, i) => {
                const active = days.includes(i);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`px-2 py-1 rounded-full text-[11px] border transition-colors ${
                      active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {mode === "monthly-nth" && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={String(nthWeek)}
                onChange={e => onChange(buildRecurrence("monthly-nth", days, sourceDate, parseInt(e.target.value, 10) as 1 | 2 | 3 | 4 | -1, nthWeekday))}
                className="bg-background rounded-md px-2 py-1.5 text-xs outline-none border border-border"
              >
                {Object.entries(NTH_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <select
                value={String(nthWeekday)}
                onChange={e => onChange(buildRecurrence("monthly-nth", days, sourceDate, nthWeek, parseInt(e.target.value, 10)))}
                className="bg-background rounded-md px-2 py-1.5 text-xs outline-none border border-border"
              >
                {DAY_LABELS.map((l, i) => <option key={l} value={i}>{l === "Dom" ? "Domingo" : l === "Seg" ? "Segunda" : l === "Ter" ? "Terça" : l === "Qua" ? "Quarta" : l === "Qui" ? "Quinta" : l === "Sex" ? "Sexta" : "Sábado"}</option>)}
              </select>
              <span className="text-[10px] text-muted-foreground">do mês</span>
            </div>
          )}

          {mode !== "none" && (
            <p className="text-[10px] text-muted-foreground">
              A original fica sempre na agenda na próxima data. Ao concluir, uma cópia vai pra Prontas.
            </p>
          )}
        </>
      )}
    </div>
  );
}
