import { useMemo } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  step?: number;
  quickAmounts?: number[];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

/** Auto-generate chips from step when no quickAmounts are provided. */
function chipsFor(step?: number, quickAmounts?: number[]): number[] {
  if (quickAmounts && quickAmounts.length) return quickAmounts;
  if (!step || step <= 0) return [];
  return [step, step * 2, step * 3, step * 5];
}

export function ContributionAmountInput({
  value, onChange, step, quickAmounts, placeholder = "Valor", autoFocus, className = "",
}: Props) {
  const chips = useMemo(() => chipsFor(step, quickAmounts), [step, quickAmounts]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        step={step || "any"}
        min={step || 0}
        autoFocus={autoFocus}
        className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border focus:border-primary/40 placeholder:text-muted-foreground"
      />
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(String(v))}
              className="px-2 py-0.5 text-[11px] rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
            >
              R$ {v.toLocaleString("pt-BR")}
            </button>
          ))}
        </div>
      )}
      {step && step > 0 && value && Number(value) % step !== 0 && (
        <p className="text-[10px] text-amber-500">
          Valor não é múltiplo de R$ {step.toLocaleString("pt-BR")}.
        </p>
      )}
    </div>
  );
}
