import { useState, useEffect, useRef } from "react";
import { InvestmentArea, Investment, InvestmentGoal, Debt } from "@/lib/types";
import { getAreaTotals, calculateGrowth, simulateUntilDate, getCurrentValue, simulateGlobalUntilDate } from "@/lib/investmentCalc";
import { Plus, Trash2, ChevronDown, ChevronRight, Target, TrendingUp, DollarSign, Calendar, BarChart3, Minus, History, List, X, Link2, RefreshCw } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ContributionAmountInput } from "./ContributionAmountInput";
import { QuickContributionDialog } from "./QuickContributionDialog";
import { HistoryBuilderDialog } from "./HistoryBuilderDialog";
import { LinkSourceDialog } from "./LinkSourceDialog";
import { useQuotes } from "@/hooks/useQuotes";
import { deriveRateFromSource, fetchStockQuote } from "@/lib/quotesApi";

const BANK_EMOJIS = ["🏦", "💰", "📊", "🪙", "💎", "🏛️", "📈", "💳", "🔐", "🌐"];

/** Suggest a default contribution step based on the investment name. */
function suggestStep(name: string): number | undefined {
  const up = name.toUpperCase();
  if (/TESOURO|CDB|LCI|LCA/.test(up)) return 100;
  if (/RDB|CAIXINHA|POUPAN/.test(up)) return 1;
  return undefined;
}

interface Props {
  areas: InvestmentArea[];
  onAddArea: (name: string, color: string, logoEmoji: string) => void;
  onDeleteArea: (areaId: string) => void;
  onAddInvestment: (areaId: string, investment: Omit<Investment, "id" | "contributions">) => string;
  onDeleteInvestment: (areaId: string, investmentId: string) => void;
  onAddContribution: (areaId: string, investmentId: string, date: string, amount: number) => void;
  onAddBulkContributions: (areaId: string, investmentId: string, entries: { date: string; amount: number }[]) => void;
  onAddGoal: (areaId: string, name: string, target: number) => void;
  onDeleteGoal: (areaId: string, goalId: string) => void;
  onAddDebt: (areaId: string, name: string, monthlyAmount: number) => void;
  onDeleteDebt: (areaId: string, debtId: string) => void;
  onSetMonthlyOverride: (areaId: string, investmentId: string, override: import("@/lib/types").MonthlyOverride | undefined) => void;
  onUpdateInvestment: (areaId: string, investmentId: string, patch: Partial<Investment>) => void;
  onCreateTaskReminder?: (text: string) => void;
}

export function InvestmentDashboard({
  areas, onAddArea, onDeleteArea, onAddInvestment, onDeleteInvestment,
  onAddContribution, onAddBulkContributions, onAddGoal, onDeleteGoal, onAddDebt, onDeleteDebt, onSetMonthlyOverride, onUpdateInvestment, onCreateTaskReminder,
}: Props) {
  const [showAddArea, setShowAddArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaColor, setNewAreaColor] = useState("#3b82f6");
  const [newAreaEmoji, setNewAreaEmoji] = useState("🏦");
  const [globalSimDate, setGlobalSimDate] = useState("");
  const { rates, tesouro, loading: quotesLoading, refresh: refreshQuotes } = useQuotes();
  const appliedRef = useRef<string>("");

  const allInvestments = areas.flatMap(a => a.investments);
  const allDebts = areas.flatMap(a => a.debts || []);
  const grandTotals = getAreaTotals(allInvestments, allDebts);

  // Auto-apply fetched quotes to investments linked to external sources.
  useEffect(() => {
    if (!rates) return;
    const stamp = `${rates.fetchedAt}|${tesouro.length}`;
    if (appliedRef.current === stamp) return;
    appliedRef.current = stamp;

    for (const area of areas) {
      for (const inv of area.investments) {
        if (!inv.source) continue;
        if (inv.source.type === "stock") {
          if (!inv.source.stockSymbol) continue;
          fetchStockQuote(inv.source.stockSymbol).then(price => {
            if (price == null) return;
            const shares = inv.source!.stockShares ?? 0;
            onUpdateInvestment(area.id, inv.id, {
              manualCurrentValue: Math.round(price * shares * 100) / 100,
              lastQuoteAt: new Date().toISOString(),
            });
          });
          continue;
        }
        const derived = deriveRateFromSource(inv.source, rates, tesouro);
        if (!derived) continue;
        const newRate = Math.round(derived.rateOfReturn * 100) / 100;
        if (newRate === inv.rateOfReturn && derived.rateType === inv.rateType) continue;
        onUpdateInvestment(area.id, inv.id, {
          rateOfReturn: newRate,
          rateType: derived.rateType,
          lastQuoteAt: new Date().toISOString(),
        });
      }
    }
  }, [rates, tesouro, areas, onUpdateInvestment]);

  const handleAddArea = () => {
    if (!newAreaName.trim()) return;
    onAddArea(newAreaName.trim(), newAreaColor, newAreaEmoji);
    setNewAreaName("");
    setShowAddArea(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Grand total card */}
      <div className="glass-card rounded-xl p-3 sm:p-5">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" />
            Patrimônio Total
          </h2>
          <QuickContributionDialog areas={areas} onAddContribution={onAddContribution} />
          <button
            onClick={() => refreshQuotes(true)}
            disabled={quotesLoading}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Atualizar cotações (CDI, Selic, IPCA, Tesouro, ações)"
          >
            <RefreshCw className={`w-3 h-3 ${quotesLoading ? "animate-spin" : ""}`} /> Cotações
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatBlock label="Investido" value={formatCurrency(grandTotals.totalInvested)} color="text-muted-foreground" />
          <StatBlock label="Valor Atual" value={formatCurrency(grandTotals.totalCurrent)} color="text-foreground" />
          <StatBlock label="Lucro" value={formatCurrency(grandTotals.totalProfit)} color={grandTotals.totalProfit >= 0 ? "text-success" : "text-destructive"} />
        </div>

        {/* Global simulation */}
        <div className="mt-4 pt-3 border-t border-border">
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" /> <span className="truncate">Simulação Global</span>
          </h4>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={globalSimDate} onChange={e => setGlobalSimDate(e.target.value)}
              className="bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border text-muted-foreground" />
            {globalSimDate && allInvestments.length > 0 && (
              <GlobalSimResult investments={allInvestments} debts={allDebts} targetDate={globalSimDate} />
            )}
          </div>
        </div>
      </div>

      {/* Areas */}
      {areas.map(area => (
        <InvestmentAreaCard
          key={area.id} area={area}
          onDeleteArea={() => onDeleteArea(area.id)}
          onAddInvestment={inv => onAddInvestment(area.id, inv)}
          onDeleteInvestment={invId => onDeleteInvestment(area.id, invId)}
          onAddContribution={(invId, date, amount) => onAddContribution(area.id, invId, date, amount)}
          onAddBulkContributions={(invId, entries) => onAddBulkContributions(area.id, invId, entries)}
          onAddGoal={(name, target) => onAddGoal(area.id, name, target)}
          onDeleteGoal={goalId => onDeleteGoal(area.id, goalId)}
          onAddDebt={(name, amount) => onAddDebt(area.id, name, amount)}
          onDeleteDebt={debtId => onDeleteDebt(area.id, debtId)}
          onSetMonthlyOverride={(invId, override) => onSetMonthlyOverride(area.id, invId, override)}
          onUpdateInvestment={(invId, patch) => onUpdateInvestment(area.id, invId, patch)}
          rates={rates}
          tesouro={tesouro}
          onCreateTaskReminder={onCreateTaskReminder}
        />
      ))}

      {/* Add area */}
      {showAddArea ? (
        <div className="glass-card rounded-xl p-4 space-y-3 animate-fade-in">
          <input autoFocus value={newAreaName} onChange={e => setNewAreaName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddArea()}
            placeholder="Nome (ex: Nubank, Tesouro, Cripto)..." className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary/40 transition-colors placeholder:text-muted-foreground" />
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Cor:</span>
              <input type="color" value={newAreaColor} onChange={e => setNewAreaColor(e.target.value)} className="w-7 h-7 rounded border border-border cursor-pointer" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Ícone:</span>
              {BANK_EMOJIS.map(e => (
                <button key={e} onClick={() => setNewAreaEmoji(e)} className={`text-lg px-1 rounded ${newAreaEmoji === e ? "bg-accent ring-1 ring-primary" : "hover:bg-accent/50"}`}>{e}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddArea(false)} className="px-3 py-1.5 text-xs rounded-lg hover:bg-accent text-muted-foreground">Cancelar</button>
            <button onClick={handleAddArea} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-medium">Criar Área</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddArea(true)} className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors">
          <Plus className="w-4 h-4" /> Nova Área de Investimento
        </button>
      )}
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-base sm:text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
function InvestmentAreaCard({
  area, onDeleteArea, onAddInvestment, onDeleteInvestment,
  onAddContribution, onAddBulkContributions, onAddGoal, onDeleteGoal, onAddDebt, onDeleteDebt, onSetMonthlyOverride, onUpdateInvestment, rates, tesouro, onCreateTaskReminder,
}: {
  area: InvestmentArea;
  onDeleteArea: () => void;
  onAddInvestment: (inv: Omit<Investment, "id" | "contributions">) => string;
  onDeleteInvestment: (id: string) => void;
  onAddContribution: (invId: string, date: string, amount: number) => void;
  onAddBulkContributions: (invId: string, entries: { date: string; amount: number }[]) => void;
  onAddGoal: (name: string, target: number) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddDebt: (name: string, amount: number) => void;
  onDeleteDebt: (debtId: string) => void;
  onSetMonthlyOverride: (invId: string, override: import("@/lib/types").MonthlyOverride | undefined) => void;
  onUpdateInvestment: (invId: string, patch: Partial<Investment>) => void;
  rates: import("@/lib/quotesApi").MarketRates | null;
  tesouro: import("@/lib/quotesApi").TesouroTitulo[];
  onCreateTaskReminder?: (text: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAddInv, setShowAddInv] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [simDate, setSimDate] = useState("");

  const totals = getAreaTotals(area.investments, area.debts || []);

  return (
    <div className="glass-card rounded-xl overflow-hidden animate-fade-in" style={{ borderLeft: `3px solid ${area.color}` }}>
      <div className="flex items-center">
        <button onClick={() => setCollapsed(!collapsed)} className="flex-1 flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 hover:bg-accent/30 transition-colors min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <span className="text-xl flex-shrink-0">{area.logoEmoji}</span>
            <h3 className="text-base sm:text-lg font-semibold truncate">{area.name}</h3>
            <span className="hidden sm:inline text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground flex-shrink-0">{area.investments.length} inv.</span>
            {(area.debts?.length || 0) > 0 && (
              <span className="hidden sm:inline text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full flex-shrink-0">{area.debts.length} dív.</span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <span className="text-xs sm:text-sm font-bold whitespace-nowrap" style={{ color: area.color }}>{formatCurrency(totals.totalCurrent)}</span>
            {collapsed ? <ChevronRight className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </div>
        </button>
        <button onClick={onDeleteArea} className="px-3 py-2 mr-1 sm:mr-2 rounded-md hover:bg-destructive/10 transition-colors flex-shrink-0" aria-label="Excluir área">
          <Trash2 className="w-4 h-4 text-destructive" />
        </button>
      </div>

      {!collapsed && (
        <div className="px-3 sm:px-5 pb-5 space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatBlock label="Investido" value={formatCurrency(totals.totalInvested)} color="text-muted-foreground" />
            <StatBlock label="Valor Atual" value={formatCurrency(totals.totalCurrent)} color="text-foreground" />
            <StatBlock label="Lucro" value={formatCurrency(totals.totalProfit)} color={totals.totalProfit >= 0 ? "text-success" : "text-destructive"} />
          </div>

          {area.investments.length > 0 && <AreaGrowthChart investments={area.investments} color={area.color} />}

          {/* Investments */}
          {area.investments.map(inv => (
            <InvestmentItem
              key={inv.id}
              investment={inv}
              color={area.color}
              onDelete={() => onDeleteInvestment(inv.id)}
              onAddContribution={(date, amount) => onAddContribution(inv.id, date, amount)}
              onAddBulkContributions={entries => onAddBulkContributions(inv.id, entries)}
              onSetOverride={(override) => onSetMonthlyOverride(inv.id, override)}
              onUpdate={(patch) => onUpdateInvestment(inv.id, patch)}
              rates={rates}
              tesouro={tesouro}
            />
          ))}
          {showAddInv ? (
            <AddInvestmentForm
              onAdd={(inv, bulkEntries) => {
                const id = onAddInvestment(inv);
                if (bulkEntries && bulkEntries.length > 0) {
                  onAddBulkContributions(id, bulkEntries);
                }
                setShowAddInv(false);
              }}
              onCancel={() => setShowAddInv(false)}
            />
          ) : (
            <button onClick={() => setShowAddInv(true)} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors">
              <Plus className="w-4 h-4" /> Novo Investimento
            </button>
          )}

          {/* Debts section */}
          <div className="border-t border-border pt-3">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Minus className="w-4 h-4 text-destructive" /> Dívidas / Despesas Fixas
            </h4>
            {(area.debts || []).map(debt => (
              <div key={debt.id} className="flex items-center justify-between bg-destructive/5 rounded-lg px-3 py-2 mb-1.5">
                <div>
                  <span className="text-sm font-medium">{debt.name}</span>
                  <span className="text-xs text-destructive ml-2">-{formatCurrency(debt.monthlyAmount)}/mês</span>
                </div>
                <button onClick={() => onDeleteDebt(debt.id)} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="w-3 h-3 text-destructive" /></button>
              </div>
            ))}
            {showAddDebt ? (
              <AddDebtForm onAdd={(name, amount) => { onAddDebt(name, amount); setShowAddDebt(false); }} onCancel={() => setShowAddDebt(false)} />
            ) : (
              <button onClick={() => setShowAddDebt(true)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Plus className="w-3 h-3" /> Nova dívida
              </button>
            )}
          </div>

          {/* Goals */}
          <div className="border-t border-border pt-3">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Target className="w-4 h-4" style={{ color: area.color }} /> Metas
            </h4>
            {area.goals.map(goal => {
              const progress = Math.min(100, (totals.totalCurrent / goal.targetAmount) * 100);
              return (
                <div key={goal.id} className="flex items-center gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground font-medium">{goal.name}</span>
                      <span className="text-muted-foreground">{formatCurrency(totals.totalCurrent)} / {formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: area.color }} />
                    </div>
                  </div>
                  <span className="text-xs font-medium" style={{ color: area.color }}>{progress.toFixed(0)}%</span>
                  <button onClick={() => onDeleteGoal(goal.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3 h-3" /></button>
                </div>
              );
            })}
            {showAddGoal ? (
              <AddGoalForm onAdd={(name, target) => { onAddGoal(name, target); setShowAddGoal(false); }} onCancel={() => setShowAddGoal(false)} />
            ) : (
              <button onClick={() => setShowAddGoal(true)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Plus className="w-3 h-3" /> Nova meta
              </button>
            )}
          </div>

          {/* Simulation */}
          <div className="border-t border-border pt-3">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4" style={{ color: area.color }} /> Simular até uma data
            </h4>
            <div className="flex items-center gap-2">
              <input type="date" value={simDate} onChange={e => setSimDate(e.target.value)} className="bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border text-muted-foreground" />
              {simDate && area.investments.length > 0 && (
                <SimulationResult investments={area.investments} targetDate={simDate} />
              )}
            </div>
          </div>

          {onCreateTaskReminder && (
            <div className="border-t border-border pt-3">
              <button onClick={() => onCreateTaskReminder(`Verificar investimentos em ${area.name}`)} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Calendar className="w-3 h-3" /> Criar lembrete de tarefa
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AreaGrowthChart({ investments, color }: { investments: Investment[]; color: string }) {
  const months = 12;
  const combinedData: { month: number; capital: number; juros: number; total: number }[] = [];
  for (let m = 0; m <= months; m++) {
    let totalInvested = 0;
    let totalValue = 0;
    for (const inv of investments) {
      const growth = calculateGrowth(inv, months);
      if (growth[m]) {
        totalInvested += growth[m].invested;
        totalValue += growth[m].total;
      }
    }
    const capital = Math.round(totalInvested);
    const juros = Math.max(0, Math.round(totalValue - totalInvested));
    combinedData.push({ month: m, capital, juros, total: Math.round(totalValue) });
  }

  const PROFIT_GREEN = "hsl(142 70% 45%)";

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <AreaChart data={combinedData}>
          <defs>
            <linearGradient id={`grad-capital-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.55} />
              <stop offset="100%" stopColor={color} stopOpacity={0.15} />
            </linearGradient>
            <linearGradient id="grad-juros-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PROFIT_GREEN} stopOpacity={0.7} />
              <stop offset="100%" stopColor={PROFIT_GREEN} stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `M${v}`} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--primary) / 0.6)", borderRadius: 10, fontSize: 12, padding: "10px 14px", color: "hsl(var(--popover-foreground))", fontWeight: 600, boxShadow: "0 8px 24px -8px hsl(var(--primary) / 0.35)" }}
            itemStyle={{ color: "hsl(var(--popover-foreground))" }}
            labelStyle={{ color: "hsl(var(--popover-foreground))", fontWeight: 700, marginBottom: 4 }}
            labelFormatter={l => `Mês ${l}`}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Area type="monotone" dataKey="capital" stackId="1" stroke={color} strokeWidth={2} fill={`url(#grad-capital-${color})`} name="Capital alocado" />
          <Area type="monotone" dataKey="juros" stackId="1" stroke={PROFIT_GREEN} strokeWidth={2} fill="url(#grad-juros-area)" name="Lucro (juros)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function InvestmentItem({ investment: inv, color, onDelete, onAddContribution, onAddBulkContributions, onSetOverride, onUpdate, rates, tesouro }: {
  investment: Investment; color: string;
  onDelete: () => void;
  onAddContribution: (date: string, amount: number) => void;
  onAddBulkContributions: (entries: { date: string; amount: number }[]) => void;
  onSetOverride: (override: import("@/lib/types").MonthlyOverride | undefined) => void;
  onUpdate: (patch: Partial<Investment>) => void;
  rates: import("@/lib/quotesApi").MarketRates | null;
  tesouro: import("@/lib/quotesApi").TesouroTitulo[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [contDate, setContDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [contAmount, setContAmount] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showLinkSource, setShowLinkSource] = useState(false);
  const [showAllContributions, setShowAllContributions] = useState(false);
  const currentVal = getCurrentValue(inv);
  // Capital investido (sem juros): histórico de aportes + aportes automáticos + aportes manuais.
  // NÃO inclui `initialValue` porque esse campo guarda o juros gerado pelo histórico.
  const startD = new Date(inv.startDate);
  const nowD = new Date();
  const monthsElapsed = Math.max(0, (nowD.getFullYear() - startD.getFullYear()) * 12 + (nowD.getMonth() - startD.getMonth()));
  const manualTotal = inv.contributions.reduce((s, c) => s + c.amount, 0);
  const investedCapital = inv.previouslyInvested + inv.monthlyContribution * monthsElapsed + manualTotal;
  const profit = currentVal - investedCapital;

  const now = new Date();
  const hasActiveOverride = inv.monthlyOverride && inv.monthlyOverride.month === now.getMonth() && inv.monthlyOverride.year === now.getFullYear();
  const effectiveMonthly = hasActiveOverride ? inv.monthlyOverride!.amount : inv.monthlyContribution;

  return (
    <div className="bg-secondary/30 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <TrendingUp className="w-4 h-4" style={{ color }} />
          <div>
            <p className="text-sm font-medium">{inv.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(investedCapital)} <span className={profit >= 0 ? "text-success" : "text-destructive"}>({profit >= 0 ? "+" : ""}{formatCurrency(profit)})</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <button onClick={onDelete} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="w-3 h-3 text-destructive" /></button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2 animate-fade-in">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-muted-foreground">Valor inicial: <span className="text-foreground font-medium">{formatCurrency(inv.initialValue)}</span></span>
            <span className="text-muted-foreground">Já investido: <span className="text-foreground font-medium">{formatCurrency(inv.previouslyInvested)}</span></span>
            <span className="text-muted-foreground">Aporte mensal: <span className="text-foreground font-medium">{formatCurrency(inv.monthlyContribution)}</span></span>
            <span className="text-muted-foreground">Taxa: <span className="text-foreground font-medium">{inv.rateOfReturn}% {inv.rateType === "monthly" ? "a.m." : "a.a."}</span></span>
          </div>

          {/* Monthly Override */}
          <div className="bg-accent/30 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                Aporte este mês: <span className={hasActiveOverride ? "text-amber-500" : "text-foreground"}>{formatCurrency(effectiveMonthly)}</span>
                {hasActiveOverride && <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">EXCEÇÃO</span>}
              </span>
              <div className="flex gap-1">
                {hasActiveOverride && (
                  <button onClick={() => onSetOverride(undefined)} className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    Resetar
                  </button>
                )}
                <button onClick={() => { setShowOverride(!showOverride); setOverrideAmount(effectiveMonthly.toString()); }} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  {hasActiveOverride ? "Editar" : "Alterar este mês"}
                </button>
              </div>
            </div>
            {showOverride && (
              <div className="flex gap-2 animate-fade-in">
                <input type="number" value={overrideAmount} onChange={e => setOverrideAmount(e.target.value)} placeholder="Valor deste mês" className="flex-1 bg-secondary/60 rounded px-2 py-1 text-xs border border-border outline-none" autoFocus />
                <button onClick={() => {
                  onSetOverride({ month: now.getMonth(), year: now.getFullYear(), amount: Number(overrideAmount) || 0 });
                  setShowOverride(false);
                }} className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90">✓</button>
                <button onClick={() => setShowOverride(false)} className="px-2 py-1 text-xs rounded hover:bg-muted text-muted-foreground">✕</button>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
              <p className="text-xs font-medium">Aportes manuais ({inv.contributions.length})</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowAllContributions(true)}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-secondary text-foreground hover:bg-accent transition-colors"
                  title="Ver trajetória completa de aportes"
                >
                  <List className="w-3 h-3" /> Ver todos
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  title="Preencher meses anteriores em lote"
                >
                  <History className="w-3 h-3" /> Preencher histórico
                </button>
              </div>
            </div>
            {inv.contributions.slice(-3).map(c => (
              <p key={c.id} className="text-xs text-muted-foreground">{new Date(c.date + "T12:00:00").toLocaleDateString("pt-BR")}: {formatCurrency(c.amount)}</p>
            ))}
            <div className="flex gap-2 mt-1 items-start">
              <input type="date" value={contDate} onChange={e => setContDate(e.target.value)} className="bg-secondary/60 rounded px-2 py-1 text-xs border border-border h-[30px]" />
              <div className="flex-1">
                <ContributionAmountInput
                  value={contAmount}
                  onChange={setContAmount}
                  step={inv.contributionStep}
                  quickAmounts={inv.quickAmounts}
                  placeholder="Valor"
                />
              </div>
              <button
                onClick={() => {
                  if (contDate && contAmount && Number(contAmount) > 0) {
                    onAddContribution(contDate, Number(contAmount));
                    setContAmount("");
                  }
                }}
                className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90 h-[30px]"
              >+</button>
            </div>
          </div>
          {showHistory && (
            <HistoryBuilderDialog
              investment={inv}
              onClose={() => setShowHistory(false)}
              onConfirm={entries => { onAddBulkContributions(entries); setShowHistory(false); }}
            />
          )}
          {showAllContributions && (
            <AllContributionsDialog investment={inv} onClose={() => setShowAllContributions(false)} />
          )}
        </div>
      )}
    </div>
  );
}

function AllContributionsDialog({ investment, onClose }: { investment: Investment; onClose: () => void }) {
  // Build a unified, chronological list:
  //  - manual contributions (from inv.contributions)
  //  - implicit monthly auto-contributions (monthlyContribution applied each month from startDate to now,
  //    respecting monthlyOverride for the current month)
  const start = new Date(investment.startDate + "T12:00:00");
  const now = new Date();
  const autoEntries: { date: string; amount: number; kind: "auto" | "manual" | "inicial" | "override" }[] = [];

  if (investment.previouslyInvested > 0) {
    autoEntries.push({ date: investment.startDate, amount: investment.previouslyInvested, kind: "inicial" });
  }

  if (investment.monthlyContribution > 0 || investment.monthlyOverride) {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endCursor = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor <= endCursor) {
      const isCurrent = cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth();
      const override = investment.monthlyOverride;
      const useOverride = override && override.month === cursor.getMonth() && override.year === cursor.getFullYear();
      const amount = useOverride ? override!.amount : investment.monthlyContribution;
      if (amount > 0) {
        const day = Math.min(5, new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate());
        const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        autoEntries.push({ date: dateStr, amount, kind: useOverride ? "override" : "auto" });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  const manualEntries = investment.contributions.map(c => ({ date: c.date, amount: c.amount, kind: "manual" as const }));
  const all = [...autoEntries, ...manualEntries].sort((a, b) => a.date.localeCompare(b.date));
  const total = all.reduce((s, e) => s + e.amount, 0);

  const KIND_META: Record<string, { label: string; cls: string }> = {
    inicial: { label: "Inicial", cls: "bg-primary/15 text-primary" },
    auto: { label: "Auto", cls: "bg-secondary text-muted-foreground" },
    override: { label: "Exceção", cls: "bg-amber-500/15 text-amber-500" },
    manual: { label: "Manual", cls: "bg-success/15 text-success" },
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-sm">Trajetória de aportes</h3>
            <p className="text-xs text-muted-foreground">{investment.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-2 border-b border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{all.length} aporte{all.length === 1 ? "" : "s"}</span>
          <span className="font-medium">Total: {formatCurrency(total)}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {all.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum aporte registrado ainda.</p>
          ) : (
            <ul className="space-y-1">
              {all.map((e, i) => {
                const meta = KIND_META[e.kind];
                return (
                  <li key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-accent/30 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${meta.cls}`}>{meta.label}</span>
                      <span className="text-muted-foreground">{new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                    <span className="font-medium text-foreground">{formatCurrency(e.amount)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AddInvestmentForm({ onAdd, onCancel }: {
  onAdd: (inv: Omit<Investment, "id" | "contributions">, bulkEntries?: { date: string; amount: number }[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [monthlyRate, setMonthlyRate] = useState("");
  const [baseAmount, setBaseAmount] = useState("");
  const [multiplier, setMultiplier] = useState(1);

  const [showHistory, setShowHistory] = useState(false);
  const [bulkEntries, setBulkEntries] = useState<{ date: string; amount: number }[] | null>(null);
  const [historySummary, setHistorySummary] = useState<{ contrib: number; profit: number; balance: number } | null>(null);

  const base = Number(baseAmount) || 0;
  const monthlyContribution = base * multiplier;
  const suggested = suggestStep(name);
  const effectiveBase = base > 0 ? base : (suggested || 0);

  const handleAdd = () => {
    if (!name.trim()) return;
    const rate = Number(monthlyRate) || 0;
    const now = new Date();
    // Se preencheu histórico: salvamos os aportes mês a mês como contributions
    // (para aparecerem individualmente na trajetória), startDate = hoje para os
    // aportes automáticos só valerem daqui pra frente, e initialValue guarda
    // os juros gerados pelo histórico. previouslyInvested fica 0 porque o
    // capital já está nas contributions.
    const usingHistory = !!(historySummary && bulkEntries && bulkEntries.length > 0);
    const effectiveStart = usingHistory ? now.toISOString().split("T")[0] : startDate;

    onAdd({
      name: name.trim(),
      initialValue: historySummary?.profit || 0,
      previouslyInvested: usingHistory ? 0 : (historySummary?.contrib || 0),
      monthlyContribution,
      rateOfReturn: rate,
      rateType: "monthly",
      passiveIncome: 0,
      startDate: effectiveStart,
      ...(effectiveBase > 0 && { contributionStep: effectiveBase }),
    }, usingHistory ? bulkEntries! : undefined);
  };

  const pseudoInvestment: Investment = {
    id: "draft",
    name: name || "Novo investimento",
    initialValue: 0,
    previouslyInvested: 0,
    monthlyContribution,
    rateOfReturn: Number(monthlyRate) || 0,
    rateType: "monthly",
    passiveIncome: 0,
    startDate,
    contributions: [],
    ...(effectiveBase > 0 && { contributionStep: effectiveBase }),
  };

  return (
    <div className="bg-secondary/30 rounded-lg border border-border p-3 space-y-2.5 animate-fade-in">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nome do investimento"
        className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary/40 placeholder:text-muted-foreground"
        autoFocus
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label="Investindo desde" hint="Mês/ano de início do investimento">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border" />
        </Field>
        <Field label="Juros ao mês (%)" hint="Taxa de rendimento mensal em %">
          <input type="number" step="0.01" value={monthlyRate} onChange={e => setMonthlyRate(e.target.value)} placeholder="ex: 0,85"
            className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border placeholder:text-muted-foreground" />
        </Field>
      </div>

      <Field label="Aporte mensal" hint={suggested && !base ? `Sugestão de múltiplo para ${name}: R$ ${suggested}` : "Defina um valor base (múltiplo) e quantas vezes ele entra por mês."} full>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[120px]">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">R$</span>
            <input
              type="number"
              value={baseAmount}
              onChange={e => setBaseAmount(e.target.value)}
              placeholder={suggested ? String(suggested) : "100"}
              className="w-full pl-8 bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border placeholder:text-muted-foreground"
            />
          </div>
          <span className="text-xs text-muted-foreground">×</span>
          <select
            value={multiplier}
            onChange={e => setMultiplier(Number(e.target.value))}
            className="bg-secondary/60 rounded-lg px-2 py-1.5 text-sm border border-border outline-none"
          >
            {[1,2,3,4,5,6,7,8,9,10,15,20].map(n => <option key={n} value={n}>{n}x</option>)}
          </select>
          <span className="text-xs font-semibold text-foreground whitespace-nowrap">
            = {formatCurrency(monthlyContribution)}
          </span>
        </div>
      </Field>

      {/* Histórico */}
      <div className="border border-dashed border-primary/30 rounded-lg p-2.5 bg-primary/5 space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <History className="w-3.5 h-3.5" />
            Já investia antes? Preencha o histórico mês a mês
          </div>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            disabled={!startDate}
            className="px-2.5 py-1 text-[11px] rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 font-semibold"
          >
            {historySummary ? "Editar histórico" : "Abrir builder"}
          </button>
        </div>
        {historySummary && (
          <div className="text-[11px] flex flex-wrap gap-x-3 gap-y-0.5 items-center">
            <span className="text-muted-foreground">
              Investido: <span className="text-success font-semibold">+{formatCurrency(historySummary.contrib)}</span>
            </span>
            <span className="text-muted-foreground">
              Juros: <span className="text-success font-semibold">+{formatCurrency(historySummary.profit)}</span>
            </span>
            <span className="text-muted-foreground">
              Total: <span className="text-foreground font-semibold">{formatCurrency(historySummary.balance)}</span>
            </span>
            <button
              type="button"
              onClick={() => { setBulkEntries(null); setHistorySummary(null); }}
              className="text-destructive hover:underline ml-auto"
            >Limpar</button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-lg hover:bg-accent text-muted-foreground">Cancelar</button>
        <button onClick={handleAdd} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-medium">Adicionar</button>
      </div>

      {showHistory && (
        <HistoryBuilderDialog
          investment={pseudoInvestment}
          onClose={() => setShowHistory(false)}
          onConfirm={(entries, meta) => {
            setBulkEntries(entries);
            setHistorySummary({ contrib: meta.totalContrib, profit: meta.totalProfit, balance: meta.finalBalance });
            if (meta.rate > 0) {
              const monthlyR = meta.rateType === "monthly"
                ? meta.rate
                : (Math.pow(1 + meta.rate / 100, 1 / 12) - 1) * 100;
              setMonthlyRate(String(Math.round(monthlyR * 10000) / 10000));
            }
            setShowHistory(false);
          }}
        />
      )}
    </div>
  );
}

function Field({ label, hint, full, children }: { label: string; hint?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-[11px] font-semibold text-foreground/80 mb-0.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function AddGoalForm({ onAdd, onCancel }: { onAdd: (name: string, target: number) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  return (
    <div className="flex gap-2 animate-fade-in">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da meta" className="flex-1 bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border placeholder:text-muted-foreground" />
      <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="Valor alvo" className="w-28 bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border placeholder:text-muted-foreground" />
      <button onClick={() => { if (name && target) onAdd(name, Number(target)); }} className="px-2 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90">✓</button>
      <button onClick={onCancel} className="px-2 py-1.5 text-xs rounded-lg hover:bg-accent text-muted-foreground">✕</button>
    </div>
  );
}

function AddDebtForm({ onAdd, onCancel }: { onAdd: (name: string, amount: number) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  return (
    <div className="flex gap-2 animate-fade-in">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da dívida (ex: Aluguel)" className="flex-1 bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border placeholder:text-muted-foreground" />
      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Valor/mês" className="w-28 bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border placeholder:text-muted-foreground" />
      <button onClick={() => { if (name && amount) onAdd(name, Number(amount)); }} className="px-2 py-1.5 text-xs rounded-lg bg-destructive text-destructive-foreground hover:opacity-90">✓</button>
      <button onClick={onCancel} className="px-2 py-1.5 text-xs rounded-lg hover:bg-accent text-muted-foreground">✕</button>
    </div>
  );
}

function SimulationResult({ investments, targetDate }: { investments: Investment[]; targetDate: string }) {
  let totalInvested = 0;
  let totalValue = 0;
  for (const inv of investments) {
    const result = simulateUntilDate(inv, targetDate);
    totalInvested += result.invested;
    totalValue += result.total;
  }
  const profit = totalValue - totalInvested;

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-muted-foreground">Investido: <span className="text-foreground font-medium">{formatCurrency(totalInvested)}</span></span>
      <span className="text-muted-foreground">Total: <span className="text-foreground font-bold">{formatCurrency(totalValue)}</span></span>
      <span className={profit >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>
        {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
      </span>
    </div>
  );
}

function GlobalSimResult({ investments, debts, targetDate }: { investments: Investment[]; debts: Debt[]; targetDate: string }) {
  const result = simulateGlobalUntilDate(investments, debts, targetDate);
  return (
    <div className="flex items-center gap-3 text-xs flex-wrap">
      <span className="text-muted-foreground">Investido: <span className="text-foreground font-medium">{formatCurrency(result.totalInvested)}</span></span>
      <span className="text-muted-foreground">Total: <span className="text-foreground font-bold">{formatCurrency(result.totalValue)}</span></span>
      <span className={result.totalProfit >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>
        Lucro: {formatCurrency(result.totalProfit)}
      </span>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
