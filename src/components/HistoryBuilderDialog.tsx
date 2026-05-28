import { useState, useMemo, useEffect } from "react";
import { History, X, Wand2, TrendingUp } from "lucide-react";
import { Investment } from "@/lib/types";

interface Props {
  investment: Investment;
  onClose: () => void;
  onConfirm: (entries: { date: string; amount: number }[]) => void;
}

// Selic atual (maio/2026): 14,50% a.a. Fonte: Bacen/Copom.
const SELIC_ANNUAL = 14.5;

function monthsBetween(startIso: string): { ym: string; label: string; date: string }[] {
  const start = new Date(startIso + "T12:00:00");
  if (Number.isNaN(start.getTime())) return [];
  const now = new Date();
  const out: { ym: string; label: string; date: string }[] = [];
  let y = start.getFullYear();
  let m = start.getMonth();
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
    const ym = `${y}-${String(m + 1).padStart(2, "0")}`;
    const last =
      y === now.getFullYear() && m === now.getMonth()
        ? now.getDate()
        : new Date(y, m + 1, 0).getDate();
    const date = `${ym}-${String(last).padStart(2, "0")}`;
    const label = new Date(y, m, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    out.push({ ym, label, date });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return out;
}

function toMonthlyRate(rate: number, type: "monthly" | "annual"): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  if (type === "monthly") return rate / 100;
  return Math.pow(1 + rate / 100, 1 / 12) - 1;
}

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function HistoryBuilderDialog({ investment, onClose, onConfirm }: Props) {
  const months = useMemo(() => monthsBetween(investment.startDate), [investment.startDate]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [bulk, setBulk] = useState("");

  // Configuração de rendimento (preenche a partir do investimento)
  const [rate, setRate] = useState(String(investment.rateOfReturn || 0));
  const [rateType, setRateType] = useState<"monthly" | "annual">(investment.rateType || "monthly");
  const [initialBalance, setInitialBalance] = useState(
    String((investment.initialValue || 0) + (investment.previouslyInvested || 0)),
  );
  const [showCalc, setShowCalc] = useState(true);

  const step = investment.contributionStep;
  const stepMultipliers = step ? [1, 2, 3, 5] : [];

  useEffect(() => {
    if (investment.monthlyContribution > 0) {
      const v: Record<string, string> = {};
      months.forEach(mo => { v[mo.ym] = String(investment.monthlyContribution); });
      setValues(v);
    }
  }, [investment.monthlyContribution, months]);

  const monthlyRate = useMemo(
    () => toMonthlyRate(Number(rate), rateType),
    [rate, rateType],
  );

  // Calcula saldo + rendimento por mês: saldo_n = saldo_{n-1} * (1+r) + aporte_n
  const rows = useMemo(() => {
    let balance = Number(initialBalance) || 0;
    let accProfit = 0;
    let accContrib = 0;
    return months.map(mo => {
      const contribution = Number(values[mo.ym]) || 0;
      const interest = balance * monthlyRate;
      balance = balance + interest + contribution;
      accProfit += interest;
      accContrib += contribution;
      return { ...mo, contribution, interest, balance, accProfit, accContrib };
    });
  }, [months, values, initialBalance, monthlyRate]);

  const totalContrib = rows.reduce((s, r) => s + r.contribution, 0);
  const totalProfit = rows.length ? rows[rows.length - 1].accProfit : 0;
  const finalBalance = rows.length ? rows[rows.length - 1].balance : Number(initialBalance) || 0;

  const applyToAll = (mult = 1) => {
    if (!bulk) return;
    const n = Number(bulk) * mult;
    if (!Number.isFinite(n)) return;
    const v: Record<string, string> = {};
    months.forEach(mo => { v[mo.ym] = String(n); });
    setValues(v);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text").trim();
    if (!text || !/[\t\n;,]/.test(text)) return;
    e.preventDefault();
    const pasteRows = text.split(/\r?\n/).map(r => r.split(/\t|;|,/).map(c => c.trim()));
    const v: Record<string, string> = { ...values };
    months.forEach((mo, i) => {
      const row = pasteRows[i];
      if (!row) return;
      const num = row[row.length - 1].replace(/[^\d.-]/g, "").replace(",", ".");
      if (num) v[mo.ym] = num;
    });
    setValues(v);
  };

  const confirm = () => {
    const entries = rows
      .map(r => ({ date: r.date, amount: r.contribution }))
      .filter(e => e.amount > 0);
    onConfirm(entries);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-bold text-sm">Preencher histórico</h2>
              <p className="text-[11px] text-muted-foreground">{investment.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        {/* Bloco de configuração de rendimento */}
        <div className="px-5 py-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowCalc(s => !s)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Calcular rendimento com base no histórico {showCalc ? "▾" : "▸"}
            </button>
          </div>
          {showCalc && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-semibold mb-1 text-muted-foreground">Taxa</label>
                <input
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  className="w-full bg-secondary/60 rounded px-2 py-1 text-xs outline-none border border-border"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1 text-muted-foreground">Período</label>
                <select
                  value={rateType}
                  onChange={e => setRateType(e.target.value as "monthly" | "annual")}
                  className="w-full bg-secondary/60 rounded px-2 py-1 text-xs outline-none border border-border"
                >
                  <option value="monthly">% a.m.</option>
                  <option value="annual">% a.a.</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1 text-muted-foreground">Saldo anterior</label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={e => setInitialBalance(e.target.value)}
                  placeholder="0"
                  className="w-full bg-secondary/60 rounded px-2 py-1 text-xs outline-none border border-border"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => { setRate(String(SELIC_ANNUAL)); setRateType("annual"); }}
                  className="w-full px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-semibold border border-primary/20"
                  title={`Selic atual: ${SELIC_ANNUAL}% a.a.`}
                >
                  Usar Selic ({SELIC_ANNUAL}%)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bulk + multiplicadores */}
        <div className="px-5 py-3 border-b border-border space-y-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold mb-1">Aplicar valor em todos os meses</label>
              <input
                type="number"
                value={bulk}
                onChange={e => setBulk(e.target.value)}
                placeholder={step ? `múltiplo de ${step}` : "ex: 200"}
                step={step || "any"}
                className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border"
              />
            </div>
            <button
              onClick={() => applyToAll(1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold border border-primary/20"
            >
              <Wand2 className="w-3 h-3" /> Aplicar
            </button>
          </div>
          {stepMultipliers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-muted-foreground mr-1 self-center">Múltiplos de R$ {step}:</span>
              {stepMultipliers.map(mult => (
                <button
                  key={mult}
                  type="button"
                  onClick={() => { setBulk(String(step! * mult)); applyToAll(mult / (Number(bulk) > 0 ? 1 : 1)); setBulk(String(step! * mult)); applyToAll(1); }}
                  className="px-2 py-0.5 text-[11px] rounded-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                >
                  x{mult} (R$ {(step! * mult).toLocaleString("pt-BR")})
                </button>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            Dica: cole uma coluna do Excel direto na lista abaixo.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3" onPaste={onPaste}>
          {months.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Defina uma data de início no investimento para usar o builder de histórico.
            </p>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-3 px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
                <span className="w-20">Mês</span>
                <span className="flex-1">Aporte</span>
                {showCalc && monthlyRate > 0 && (
                  <>
                    <span className="w-20 text-right">Rendim.</span>
                    <span className="w-24 text-right">Saldo fim</span>
                  </>
                )}
              </div>
              {rows.map(r => (
                <div key={r.ym} className="flex items-center gap-3 px-3 py-1.5 rounded-md border border-border">
                  <span className="text-xs font-medium w-20 capitalize">{r.label}</span>
                  <input
                    type="number"
                    value={values[r.ym] || ""}
                    onChange={e => setValues(v => ({ ...v, [r.ym]: e.target.value }))}
                    placeholder="0"
                    step={step || "any"}
                    className="flex-1 bg-secondary/60 rounded px-2 py-1 text-xs border border-border outline-none"
                  />
                  {showCalc && monthlyRate > 0 && (
                    <>
                      <span className="w-20 text-right text-[11px] text-emerald-500 font-medium">
                        +R$ {BRL(r.interest)}
                      </span>
                      <span className="w-24 text-right text-[11px] font-semibold">
                        R$ {BRL(r.balance)}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-muted-foreground">
              Aportes: <span className="font-bold text-foreground">R$ {BRL(totalContrib)}</span>
            </span>
            {showCalc && monthlyRate > 0 && (
              <>
                <span className="text-muted-foreground">
                  Rendimento estimado: <span className="font-bold text-emerald-500">R$ {BRL(totalProfit)}</span>
                </span>
                <span className="text-muted-foreground">
                  Saldo final: <span className="font-bold text-foreground">R$ {BRL(finalBalance)}</span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg hover:bg-muted text-muted-foreground">Cancelar</button>
            <button
              onClick={confirm}
              disabled={totalContrib <= 0}
              className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 font-semibold"
            >
              Salvar aportes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
