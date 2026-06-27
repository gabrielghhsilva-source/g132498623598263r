import { useMemo, useState } from "react";
import { InvestmentArea } from "@/lib/types";
import { getAreaTotals, calculateGrowth, getMonthlyRate } from "@/lib/investmentCalc";
import { TrendingUp, Calendar, AlertCircle, Check } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Props {
  areas: InvestmentArea[];
  onConfirmContribution: (areaId: string, investmentId: string, date: string, amount: number) => void;
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function shortMonth(idx: number) {
  return ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][idx];
}

export function PatrimonyOverview({ areas, onConfirmContribution }: Props) {
  const [horizonMonths, setHorizonMonths] = useState(12);
  const allInvestments = useMemo(() => areas.flatMap(a => a.investments.map(inv => ({ inv, areaId: a.id }))), [areas]);

  // Aportes pendentes do mês corrente
  const pending = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return allInvestments
      .filter(({ inv }) => inv.monthlyContribution > 0)
      .filter(({ inv }) => {
        const hasInMonth = inv.contributions.some(c => {
          const d = new Date(c.date + "T00:00");
          return d.getMonth() === m && d.getFullYear() === y;
        });
        return !hasInMonth;
      });
  }, [allInvestments]);

  // Projeção consolidada
  const projection = useMemo(() => {
    if (allInvestments.length === 0) return [];
    const points: { month: number; label: string; total: number; invested: number }[] = [];
    for (let m = 0; m <= horizonMonths; m++) {
      let total = 0;
      let invested = 0;
      for (const { inv } of allInvestments) {
        const data = calculateGrowth(inv, m);
        const last = data[data.length - 1];
        total += last.total;
        invested += last.invested;
      }
      const d = new Date();
      d.setMonth(d.getMonth() + m);
      points.push({
        month: m,
        label: `${shortMonth(d.getMonth())}/${String(d.getFullYear()).slice(2)}`,
        total: Math.round(total),
        invested: Math.round(invested),
      });
    }
    return points;
  }, [allInvestments, horizonMonths]);

  const totals = useMemo(() => getAreaTotals(allInvestments.map(x => x.inv)), [allInvestments]);

  if (allInvestments.length === 0) return null;

  const future = projection[projection.length - 1];

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-bold text-foreground">Aportes pendentes este mês ({pending.length})</h3>
          </div>
          <div className="space-y-1.5">
            {pending.map(({ inv, areaId }) => {
              const area = areas.find(a => a.id === areaId);
              const today = new Date().toISOString().split("T")[0];
              return (
                <div key={inv.id} className="flex items-center justify-between gap-2 bg-card border border-border rounded-md px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{area?.logoEmoji} {inv.name}</p>
                    <p className="text-[10px] text-muted-foreground">Valor configurado: {fmt(inv.monthlyContribution)}</p>
                  </div>
                  <button
                    onClick={() => onConfirmContribution(areaId, inv.id, today, inv.monthlyContribution)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-success text-success-foreground hover:opacity-90 text-xs font-semibold flex-shrink-0"
                  >
                    <Check className="w-3 h-3" /> Confirmar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg shadow-sm p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/80">Patrimônio Projetado</h3>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/40 rounded-md p-0.5">
            {[6, 12, 24, 60].map(m => (
              <button
                key={m}
                onClick={() => setHorizonMonths(m)}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded ${horizonMonths === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/30 rounded-md p-2">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Hoje</p>
            <p className="text-sm font-bold text-primary tabular-nums">{fmt(totals.totalCurrent)}</p>
          </div>
          <div className="bg-muted/30 rounded-md p-2">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Em {horizonMonths}m</p>
            <p className="text-sm font-bold text-success tabular-nums">{fmt(future?.total || 0)}</p>
          </div>
          <div className="bg-muted/30 rounded-md p-2">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Ganho proj.</p>
            <p className="text-sm font-bold text-warning tabular-nums">{fmt((future?.total || 0) - (future?.invested || 0))}</p>
          </div>
        </div>
        <div className="h-48 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projection}>
              <defs>
                <linearGradient id="patrimony" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="invested" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" fill="none" name="Investido" />
              <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#patrimony)" name="Patrimônio" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Projeção mantendo o ritmo atual de aportes e juros.
        </p>
      </div>
    </div>
  );
}
