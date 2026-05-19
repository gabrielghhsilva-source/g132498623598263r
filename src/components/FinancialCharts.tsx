import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { TrendingUp, PieChart as PieIcon, LineChart as LineIcon, Layers, Layers2 } from "lucide-react";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export interface ExpenseSlice {
  name: string;
  value: number;
  recurring?: boolean;
}

interface Props {
  salary: number;
  manualIncomes: number;
  /** Lucro só de investimentos (juros / valorização de fundos, RF, etc.) */
  investmentProfit: number;
  /** Lucro só de ações (PnL ao vivo) */
  stocksProfit?: number;
  monthlyInvestments: number;
  monthlyDebts: number;
  /** Cada despesa manual separada (já inclui as recorrentes) */
  expenseBreakdown?: ExpenseSlice[];
  /** Fallback: total agregado de despesas (caso breakdown não venha) */
  manualExpenses?: number;
  pendingDebts?: number;
  finalBalance: number;
  totalPatrimony?: number;
}

const COLOR_INCOME = "hsl(142 70% 45%)";
const COLOR_PROFIT_INV = "hsl(160 80% 50%)";
const COLOR_PROFIT_STK = "hsl(190 90% 55%)";
const COLOR_INVEST = "hsl(38 92% 55%)";
const COLOR_DEBT = "hsl(0 75% 60%)";
const COLOR_BALANCE = "hsl(var(--primary))";

// Paleta para fatias de despesas individuais
const EXPENSE_PALETTE = [
  "hsl(20 90% 60%)",
  "hsl(340 80% 60%)",
  "hsl(280 75% 65%)",
  "hsl(45 95% 55%)",
  "hsl(10 85% 60%)",
  "hsl(320 70% 60%)",
  "hsl(60 80% 55%)",
  "hsl(0 70% 55%)",
];

const tooltipStyle: React.CSSProperties = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--primary) / 0.6)",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
  fontWeight: 600,
  boxShadow: "0 8px 24px -8px hsl(var(--primary) / 0.35)",
};
const tooltipItem: React.CSSProperties = { color: "hsl(var(--popover-foreground))" };
const tooltipLabel: React.CSSProperties = { color: "hsl(var(--popover-foreground))", fontWeight: 700, marginBottom: 4 };

export function FinancialCharts({
  salary,
  manualIncomes,
  investmentProfit,
  stocksProfit = 0,
  monthlyInvestments,
  monthlyDebts,
  expenseBreakdown,
  manualExpenses,
  pendingDebts = 0,
  finalBalance,
  totalPatrimony = 0,
}: Props) {
  const [separated, setSeparated] = useState(false);

  // Despesas: usa breakdown se vier; senão agrega num único item
  const expensesList: ExpenseSlice[] = useMemo(() => {
    if (expenseBreakdown && expenseBreakdown.length > 0) {
      return expenseBreakdown.filter(e => e.value > 0);
    }
    if ((manualExpenses ?? 0) > 0) return [{ name: "Despesas", value: manualExpenses! }];
    return [];
  }, [expenseBreakdown, manualExpenses]);

  const totalManualExpenses = expensesList.reduce((s, e) => s + e.value, 0);

  // Distribuição mensal (donut) — cada despesa vira sua própria fatia
  const distribution = useMemo(() => {
    const items: { name: string; value: number; color: string }[] = [];
    if (monthlyInvestments > 0) items.push({ name: "Aportes", value: monthlyInvestments, color: COLOR_INVEST });
    if (monthlyDebts > 0) items.push({ name: "Dívidas fixas", value: monthlyDebts, color: COLOR_DEBT });
    expensesList.forEach((e, i) => {
      items.push({
        name: (e.recurring ? "↻ " : "") + e.name,
        value: e.value,
        color: EXPENSE_PALETTE[i % EXPENSE_PALETTE.length],
      });
    });
    if (finalBalance > 0) items.push({ name: "Saldo", value: finalBalance, color: COLOR_BALANCE });
    return items;
  }, [monthlyInvestments, monthlyDebts, expensesList, finalBalance]);

  const totalProfit = investmentProfit + stocksProfit;

  // Entradas vs Saídas — separado mostra os dois lucros como entradas distintas
  const incomeVsExpense = useMemo(() => {
    const totalOut = monthlyInvestments + monthlyDebts + totalManualExpenses + pendingDebts;
    if (separated) {
      return [{
        name: "Mês atual",
        Salário: Math.round(salary),
        "Renda extra": Math.round(manualIncomes),
        "Lucro Invest.": Math.round(investmentProfit),
        "Lucro Ações": Math.round(stocksProfit),
        Saídas: Math.round(totalOut),
      }];
    }
    return [{
      name: "Mês atual",
      Entradas: Math.round(salary + manualIncomes + totalProfit),
      Saídas: Math.round(totalOut),
    }];
  }, [separated, salary, manualIncomes, investmentProfit, stocksProfit, totalProfit, monthlyInvestments, monthlyDebts, totalManualExpenses, pendingDebts]);

  const totalIn = salary + manualIncomes + totalProfit;
  const totalOut = monthlyInvestments + monthlyDebts + totalManualExpenses + pendingDebts;
  const flowRatio = totalIn > 0 ? Math.min(100, (totalOut / totalIn) * 100) : 0;

  // Projeção 6 meses
  const projection = useMemo(() => {
    const monthlyNet = finalBalance;
    const data: { mes: string; saldo: number; patrimonio: number }[] = [];
    let acc = 0;
    let pat = totalPatrimony;
    const labels = ["Mês 1", "Mês 2", "Mês 3", "Mês 4", "Mês 5", "Mês 6"];
    for (let i = 0; i < 6; i++) {
      acc += monthlyNet;
      pat += monthlyInvestments + Math.max(0, monthlyNet) * 0.2;
      data.push({ mes: labels[i], saldo: Math.round(acc), patrimonio: Math.round(pat) });
    }
    return data;
  }, [finalBalance, monthlyInvestments, totalPatrimony]);

  return (
    <div className="space-y-3">
      {/* Toggle global */}
      <div className="flex items-center justify-end">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-card border border-border fut-surface">
          <button
            onClick={() => setSeparated(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              !separated ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Geral
          </button>
          <button
            onClick={() => setSeparated(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              separated ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers2 className="w-3.5 h-3.5" /> Invest. vs Ações
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribution Donut */}
        <ChartCard title="Distribuição mensal" icon={PieIcon} subtitle="Para onde seu dinheiro vai">
          {distribution.length === 0 ? (
            <Empty text="Sem dados suficientes" />
          ) : (
            <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
              <div className="h-52 -ml-2">
                <ResponsiveContainer>
                  <PieChart>
                    <defs>
                      {distribution.map((d, i) => (
                        <radialGradient key={i} id={`donut-${i}`} cx="50%" cy="50%" r="65%">
                          <stop offset="0%" stopColor={d.color} stopOpacity={0.95} />
                          <stop offset="100%" stopColor={d.color} stopOpacity={0.55} />
                        </radialGradient>
                      ))}
                    </defs>
                    <Pie
                      data={distribution}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      {distribution.map((d, i) => (
                        <Cell key={i} fill={`url(#donut-${i})`} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItem} labelStyle={tooltipLabel} formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-xs pr-1 max-h-52 overflow-y-auto no-scrollbar">
                {distribution.map((d, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shadow-[0_0_8px] flex-shrink-0"
                      style={{ background: d.color, color: d.color }}
                    />
                    <span className="text-muted-foreground truncate max-w-[100px]" title={d.name}>{d.name}</span>
                    <span className="ml-auto tabular-nums font-semibold text-foreground">{fmt(d.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>

        {/* Income vs Expense */}
        <ChartCard
          title={separated ? "Receitas detalhadas" : "Entradas vs Saídas"}
          icon={TrendingUp}
          subtitle={`${flowRatio.toFixed(0)}% do que entra está saindo`}
        >
          <div className="h-52 -ml-2">
            <ResponsiveContainer>
              <BarChart data={incomeVsExpense} barCategoryGap={40}>
                <defs>
                  <linearGradient id="bar-in" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_INCOME} stopOpacity={1} />
                    <stop offset="100%" stopColor={COLOR_INCOME} stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="bar-sal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_INCOME} stopOpacity={1} />
                    <stop offset="100%" stopColor={COLOR_INCOME} stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="bar-extra" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(120 60% 55%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(120 60% 55%)" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="bar-pinv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_PROFIT_INV} stopOpacity={1} />
                    <stop offset="100%" stopColor={COLOR_PROFIT_INV} stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="bar-pstk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_PROFIT_STK} stopOpacity={1} />
                    <stop offset="100%" stopColor={COLOR_PROFIT_STK} stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="bar-out" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_DEBT} stopOpacity={1} />
                    <stop offset="100%" stopColor={COLOR_DEBT} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border) / 0.4)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItem} labelStyle={tooltipLabel} formatter={(v: number) => fmt(v)} cursor={{ fill: "hsl(var(--primary) / 0.05)" }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" />
                {separated ? (
                  <>
                    <Bar dataKey="Salário" fill="url(#bar-sal)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Renda extra" fill="url(#bar-extra)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Lucro Invest." fill="url(#bar-pinv)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Lucro Ações" fill="url(#bar-pstk)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Saídas" fill="url(#bar-out)" radius={[6, 6, 0, 0]} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="Entradas" fill="url(#bar-in)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Saídas" fill="url(#bar-out)" radius={[6, 6, 0, 0]} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Projeção */}
        <ChartCard title="Projeção de saldo (6 meses)" icon={LineIcon} subtitle="Se você mantiver o ritmo atual" wide>
          <div className="h-56 -ml-2">
            <ResponsiveContainer>
              <AreaChart data={projection}>
                <defs>
                  <linearGradient id="area-saldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_BALANCE} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={COLOR_BALANCE} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="area-pat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_PROFIT_INV} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={COLOR_PROFIT_INV} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border) / 0.4)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItem} labelStyle={tooltipLabel} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" />
                <Area type="monotone" dataKey="patrimonio" name="Patrimônio projetado" stroke={COLOR_PROFIT_INV} strokeWidth={2} fill="url(#area-pat)" />
                <Area type="monotone" dataKey="saldo" name="Saldo acumulado" stroke={COLOR_BALANCE} strokeWidth={2} fill="url(#area-saldo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  wide,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: typeof TrendingUp;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative bg-card border border-border rounded-xl p-4 sm:p-5 overflow-hidden fut-surface ${
        wide ? "lg:col-span-2" : ""
      }`}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="flex items-start gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center shadow-[0_0_12px_-4px_hsl(var(--primary)/0.6)]">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold tracking-wide">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="h-52 flex items-center justify-center text-xs text-muted-foreground italic">
      {text}
    </div>
  );
}
