import { useMemo } from "react";
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
import { TrendingUp, TrendingDown, PieChart as PieIcon, LineChart as LineIcon } from "lucide-react";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

interface Props {
  salary: number;
  manualIncomes: number;
  investmentProfit: number;
  monthlyInvestments: number;
  monthlyDebts: number;
  manualExpenses: number;
  pendingDebts?: number;
  finalBalance: number;
  totalPatrimony?: number;
}

const COLOR_INCOME = "hsl(142 70% 45%)";
const COLOR_PROFIT = "hsl(160 80% 50%)";
const COLOR_EXTRA = "hsl(190 80% 55%)";
const COLOR_INVEST = "hsl(38 92% 55%)";
const COLOR_DEBT = "hsl(0 75% 60%)";
const COLOR_MANUAL = "hsl(20 90% 60%)";
const COLOR_BALANCE = "hsl(var(--primary))";

const tooltipStyle: React.CSSProperties = {
  background: "hsl(var(--card) / 0.95)",
  border: "1px solid hsl(var(--primary) / 0.4)",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 12,
  boxShadow: "0 0 0 1px hsl(var(--primary) / 0.1), 0 8px 24px -8px hsl(var(--primary) / 0.25)",
  backdropFilter: "blur(8px)",
};

export function FinancialCharts({
  salary,
  manualIncomes,
  investmentProfit,
  monthlyInvestments,
  monthlyDebts,
  manualExpenses,
  pendingDebts = 0,
  finalBalance,
  totalPatrimony = 0,
}: Props) {
  const distribution = useMemo(() => {
    const items = [
      { name: "Aportes", value: monthlyInvestments, color: COLOR_INVEST },
      { name: "Dívidas fixas", value: monthlyDebts, color: COLOR_DEBT },
      { name: "Despesas", value: manualExpenses, color: COLOR_MANUAL },
      { name: "Saldo", value: Math.max(0, finalBalance), color: COLOR_BALANCE },
    ].filter(i => i.value > 0);
    return items;
  }, [monthlyInvestments, monthlyDebts, manualExpenses, finalBalance]);

  const incomeVsExpense = useMemo(() => {
    const totalIn = salary + manualIncomes + investmentProfit;
    const totalOut = monthlyInvestments + monthlyDebts + manualExpenses + pendingDebts;
    return [
      {
        name: "Mês atual",
        Entradas: Math.round(totalIn),
        Saídas: Math.round(totalOut),
      },
    ];
  }, [salary, manualIncomes, investmentProfit, monthlyInvestments, monthlyDebts, manualExpenses, pendingDebts]);

  // 6-month forward projection of balance accumulation
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

  const totalIn = salary + manualIncomes + investmentProfit;
  const totalOut = monthlyInvestments + monthlyDebts + manualExpenses + pendingDebts;
  const flowRatio = totalIn > 0 ? Math.min(100, (totalOut / totalIn) * 100) : 0;

  return (
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
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2 text-xs pr-1">
              {distribution.map((d, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shadow-[0_0_8px] flex-shrink-0"
                    style={{ background: d.color, color: d.color }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="ml-auto tabular-nums font-semibold">{fmt(d.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ChartCard>

      {/* Income vs Expense */}
      <ChartCard
        title="Entradas vs Saídas"
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
                <linearGradient id="bar-out" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR_DEBT} stopOpacity={1} />
                  <stop offset="100%" stopColor={COLOR_DEBT} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border) / 0.4)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} cursor={{ fill: "hsl(var(--primary) / 0.05)" }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" />
              <Bar dataKey="Entradas" fill="url(#bar-in)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Saídas" fill="url(#bar-out)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Projection */}
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
                  <stop offset="0%" stopColor={COLOR_PROFIT} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={COLOR_PROFIT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border) / 0.4)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" />
              <Area type="monotone" dataKey="patrimonio" name="Patrimônio projetado" stroke={COLOR_PROFIT} strokeWidth={2} fill="url(#area-pat)" />
              <Area type="monotone" dataKey="saldo" name="Saldo acumulado" stroke={COLOR_BALANCE} strokeWidth={2} fill="url(#area-saldo)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
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
      {/* top accent line */}
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
