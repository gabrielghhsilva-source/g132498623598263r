import { useState } from "react";
import { InvestmentArea, Investment, InvestmentGoal, Debt } from "@/lib/types";
import { getAreaTotals, calculateGrowth, simulateUntilDate, getCurrentValue, simulateGlobalUntilDate } from "@/lib/investmentCalc";
import { Plus, Trash2, ChevronDown, ChevronRight, Target, TrendingUp, DollarSign, Calendar, BarChart3, Minus, History } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ContributionAmountInput } from "./ContributionAmountInput";
import { QuickContributionDialog } from "./QuickContributionDialog";
import { HistoryBuilderDialog } from "./HistoryBuilderDialog";

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
  onCreateTaskReminder?: (text: string) => void;
}

export function InvestmentDashboard({
  areas, onAddArea, onDeleteArea, onAddInvestment, onDeleteInvestment,
  onAddContribution, onAddBulkContributions, onAddGoal, onDeleteGoal, onAddDebt, onDeleteDebt, onSetMonthlyOverride, onCreateTaskReminder,
}: Props) {
  const [showAddArea, setShowAddArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaColor, setNewAreaColor] = useState("#3b82f6");
  const [newAreaEmoji, setNewAreaEmoji] = useState("🏦");
  const [globalSimDate, setGlobalSimDate] = useState("");

  const allInvestments = areas.flatMap(a => a.investments);
  const allDebts = areas.flatMap(a => a.debts || []);
  const grandTotals = getAreaTotals(allInvestments, allDebts);

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
  onAddContribution, onAddBulkContributions, onAddGoal, onDeleteGoal, onAddDebt, onDeleteDebt, onSetMonthlyOverride, onCreateTaskReminder,
}: {
  area: InvestmentArea;
  onDeleteArea: () => void;
  onAddInvestment: (inv: Omit<Investment, "id" | "contributions">) => void;
  onDeleteInvestment: (id: string) => void;
  onAddContribution: (invId: string, date: string, amount: number) => void;
  onAddBulkContributions: (invId: string, entries: { date: string; amount: number }[]) => void;
  onAddGoal: (name: string, target: number) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddDebt: (name: string, amount: number) => void;
  onDeleteDebt: (debtId: string) => void;
  onSetMonthlyOverride: (invId: string, override: import("@/lib/types").MonthlyOverride | undefined) => void;
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
            <InvestmentItem key={inv.id} investment={inv} color={area.color} onDelete={() => onDeleteInvestment(inv.id)} onAddContribution={(date, amount) => onAddContribution(inv.id, date, amount)} onSetOverride={(override) => onSetMonthlyOverride(inv.id, override)} />
          ))}
          {showAddInv ? (
            <AddInvestmentForm onAdd={inv => { onAddInvestment(inv); setShowAddInv(false); }} onCancel={() => setShowAddInv(false)} />
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

function InvestmentItem({ investment: inv, color, onDelete, onAddContribution, onSetOverride }: {
  investment: Investment; color: string;
  onDelete: () => void;
  onAddContribution: (date: string, amount: number) => void;
  onSetOverride: (override: import("@/lib/types").MonthlyOverride | undefined) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [contDate, setContDate] = useState("");
  const [contAmount, setContAmount] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState("");
  const currentVal = getCurrentValue(inv);
  const baseInvested = inv.initialValue + inv.previouslyInvested;
  const profit = currentVal - baseInvested;

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
              {formatCurrency(currentVal)} <span className={profit >= 0 ? "text-success" : "text-destructive"}>({profit >= 0 ? "+" : ""}{formatCurrency(profit)})</span>
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
            <p className="text-xs font-medium mb-1">Aportes manuais ({inv.contributions.length})</p>
            {inv.contributions.slice(-3).map(c => (
              <p key={c.id} className="text-xs text-muted-foreground">{new Date(c.date + "T12:00:00").toLocaleDateString("pt-BR")}: {formatCurrency(c.amount)}</p>
            ))}
            <div className="flex gap-2 mt-1">
              <input type="date" value={contDate} onChange={e => setContDate(e.target.value)} className="bg-secondary/60 rounded px-2 py-1 text-xs border border-border" />
              <input type="number" value={contAmount} onChange={e => setContAmount(e.target.value)} placeholder="Valor" className="bg-secondary/60 rounded px-2 py-1 text-xs border border-border w-24" />
              <button onClick={() => { if (contDate && contAmount) { onAddContribution(contDate, Number(contAmount)); setContDate(""); setContAmount(""); } }}
                className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90">+</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddInvestmentForm({ onAdd, onCancel }: {
  onAdd: (inv: Omit<Investment, "id" | "contributions">) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [monthly, setMonthly] = useState("");
  const [invested, setInvested] = useState("");
  const [thisMonth, setThisMonth] = useState("");
  const [accruedProfit, setAccruedProfit] = useState("");
  const [monthlyRate, setMonthlyRate] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    const monthlyN = Number(monthly) || 0;
    const investedN = Number(invested) || 0;
    const accruedN = Number(accruedProfit) || 0;
    const rate = Number(monthlyRate) || 0;
    const thisMonthN = thisMonth === "" ? null : Number(thisMonth);

    const now = new Date();
    onAdd({
      name: name.trim(),
      initialValue: accruedN,
      previouslyInvested: investedN,
      monthlyContribution: monthlyN,
      rateOfReturn: rate,
      rateType: "monthly",
      passiveIncome: 0,
      startDate: now.toISOString().split("T")[0],
      ...(thisMonthN !== null && {
        monthlyOverride: { month: now.getMonth(), year: now.getFullYear(), amount: thisMonthN },
      }),
    });
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
        <Field label="Aporte mensal" hint="Valor que entra todo mês">
          <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="R$ 0,00"
            className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border placeholder:text-muted-foreground" />
        </Field>
        <Field label="Quantidade investida" hint="Total já investido como capital">
          <input type="number" value={invested} onChange={e => setInvested(e.target.value)} placeholder="R$ 0,00"
            className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border placeholder:text-muted-foreground" />
        </Field>
        <Field label="Investimento deste mês" hint="Substitui o aporte automático no mês atual">
          <input type="number" value={thisMonth} onChange={e => setThisMonth(e.target.value)} placeholder="opcional"
            className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border placeholder:text-muted-foreground" />
        </Field>
        <Field label="Juros já gerados" hint="Quanto o capital anterior já rendeu">
          <input type="number" value={accruedProfit} onChange={e => setAccruedProfit(e.target.value)} placeholder="R$ 0,00"
            className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border placeholder:text-muted-foreground" />
        </Field>
        <Field label="Juros ao mês (%)" hint="Taxa de rendimento mensal em %" full>
          <input type="number" step="0.01" value={monthlyRate} onChange={e => setMonthlyRate(e.target.value)} placeholder="ex: 0,85"
            className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border placeholder:text-muted-foreground" />
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-lg hover:bg-accent text-muted-foreground">Cancelar</button>
        <button onClick={handleAdd} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-medium">Adicionar</button>
      </div>
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
