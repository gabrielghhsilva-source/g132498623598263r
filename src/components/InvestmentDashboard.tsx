import { useState } from "react";
import { InvestmentArea, Investment, InvestmentGoal, Debt } from "@/lib/types";
import { getAreaTotals, calculateGrowth, simulateUntilDate, getCurrentValue, simulateGlobalUntilDate } from "@/lib/investmentCalc";
import { Plus, Trash2, ChevronDown, ChevronRight, Target, TrendingUp, DollarSign, Calendar, BarChart3, Minus } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const BANK_EMOJIS = ["🏦", "💰", "📊", "🪙", "💎", "🏛️", "📈", "💳", "🔐", "🌐"];

interface Props {
  areas: InvestmentArea[];
  onAddArea: (name: string, color: string, logoEmoji: string) => void;
  onDeleteArea: (areaId: string) => void;
  onAddInvestment: (areaId: string, investment: Omit<Investment, "id" | "contributions">) => void;
  onDeleteInvestment: (areaId: string, investmentId: string) => void;
  onAddContribution: (areaId: string, investmentId: string, date: string, amount: number) => void;
  onAddGoal: (areaId: string, name: string, target: number) => void;
  onDeleteGoal: (areaId: string, goalId: string) => void;
  onAddDebt: (areaId: string, name: string, monthlyAmount: number) => void;
  onDeleteDebt: (areaId: string, debtId: string) => void;
  onCreateTaskReminder?: (text: string) => void;
}

export function InvestmentDashboard({
  areas, onAddArea, onDeleteArea, onAddInvestment, onDeleteInvestment,
  onAddContribution, onAddGoal, onDeleteGoal, onAddDebt, onDeleteDebt, onCreateTaskReminder,
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
    <div className="space-y-6 animate-fade-in">
      {/* Grand total card */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-success" />
          Patrimônio Total
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatBlock label="Investido" value={formatCurrency(grandTotals.totalInvested)} color="text-muted-foreground" />
          <StatBlock label="Valor Atual" value={formatCurrency(grandTotals.totalCurrent)} color="text-foreground" />
          <StatBlock label="Lucro" value={formatCurrency(grandTotals.totalProfit)} color={grandTotals.totalProfit >= 0 ? "text-success" : "text-destructive"} />
        </div>

        {/* Global simulation */}
        <div className="mt-4 pt-3 border-t border-border">
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Simulação Global (todos investimentos + dívidas)
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
          onAddGoal={(name, target) => onAddGoal(area.id, name, target)}
          onDeleteGoal={goalId => onDeleteGoal(area.id, goalId)}
          onAddDebt={(name, amount) => onAddDebt(area.id, name, amount)}
          onDeleteDebt={debtId => onDeleteDebt(area.id, debtId)}
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
  onAddContribution, onAddGoal, onDeleteGoal, onAddDebt, onDeleteDebt, onCreateTaskReminder,
}: {
  area: InvestmentArea;
  onDeleteArea: () => void;
  onAddInvestment: (inv: Omit<Investment, "id" | "contributions">) => void;
  onDeleteInvestment: (id: string) => void;
  onAddContribution: (invId: string, date: string, amount: number) => void;
  onAddGoal: (name: string, target: number) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddDebt: (name: string, amount: number) => void;
  onDeleteDebt: (debtId: string) => void;
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
        <button onClick={() => setCollapsed(!collapsed)} className="flex-1 flex items-center justify-between px-5 py-4 hover:bg-accent/30 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">{area.logoEmoji}</span>
            <h3 className="text-lg font-semibold">{area.name}</h3>
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{area.investments.length} inv.</span>
            {(area.debts?.length || 0) > 0 && (
              <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">{area.debts.length} dív.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold" style={{ color: area.color }}>{formatCurrency(totals.totalCurrent)}</span>
            {collapsed ? <ChevronRight className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </div>
        </button>
        <button onClick={onDeleteArea} className="px-3 py-2 mr-2 rounded-md hover:bg-destructive/10 transition-colors">
          <Trash2 className="w-4 h-4 text-destructive" />
        </button>
      </div>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatBlock label="Investido" value={formatCurrency(totals.totalInvested)} color="text-muted-foreground" />
            <StatBlock label="Valor Atual" value={formatCurrency(totals.totalCurrent)} color="text-foreground" />
            <StatBlock label="Lucro" value={formatCurrency(totals.totalProfit)} color={totals.totalProfit >= 0 ? "text-success" : "text-destructive"} />
          </div>

          {area.investments.length > 0 && <AreaGrowthChart investments={area.investments} color={area.color} />}

          {/* Investments */}
          {area.investments.map(inv => (
            <InvestmentItem key={inv.id} investment={inv} color={area.color} onDelete={() => onDeleteInvestment(inv.id)} onAddContribution={(date, amount) => onAddContribution(inv.id, date, amount)} />
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
  const combinedData: { month: number; invested: number; total: number }[] = [];
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
    combinedData.push({ month: m, invested: Math.round(totalInvested), total: Math.round(totalValue) });
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <AreaChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `M${v}`} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(value: number) => formatCurrency(value)} />
          <Area type="monotone" dataKey="invested" stackId="1" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground) / 0.2)" name="Investido" />
          <Area type="monotone" dataKey="total" stroke={color} fill={`${color}33`} name="Total" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function InvestmentItem({ investment: inv, color, onDelete, onAddContribution }: {
  investment: Investment; color: string;
  onDelete: () => void;
  onAddContribution: (date: string, amount: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [contDate, setContDate] = useState("");
  const [contAmount, setContAmount] = useState("");
  const currentVal = getCurrentValue(inv);
  const baseInvested = inv.initialValue + inv.previouslyInvested;
  const profit = currentVal - baseInvested;

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
  const [initial, setInitial] = useState("");
  const [prev, setPrev] = useState("");
  const [monthly, setMonthly] = useState("");
  const [rate, setRate] = useState("");
  const [rateType, setRateType] = useState<"monthly" | "annual">("monthly");
  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(), initialValue: Number(initial) || 0, previouslyInvested: Number(prev) || 0,
      monthlyContribution: Number(monthly) || 0, rateOfReturn: Number(rate) || 0, rateType,
      passiveIncome: 0, startDate: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="bg-secondary/30 rounded-lg border border-border p-3 space-y-2 animate-fade-in">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do investimento" className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border focus:border-primary/40 placeholder:text-muted-foreground" />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" value={initial} onChange={e => setInitial(e.target.value)} placeholder="Valor inicial" className="bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border placeholder:text-muted-foreground" />
        <input type="number" value={prev} onChange={e => setPrev(e.target.value)} placeholder="Já investido antes" className="bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border placeholder:text-muted-foreground" />
        <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="Aporte mensal" className="bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border placeholder:text-muted-foreground" />
        <div className="flex gap-1">
          <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="Taxa %" className="flex-1 bg-secondary/60 rounded-lg px-3 py-1.5 text-xs outline-none border border-border placeholder:text-muted-foreground" />
          <select value={rateType} onChange={e => setRateType(e.target.value as "monthly" | "annual")} className="bg-secondary rounded-lg px-2 py-1 text-xs border-none outline-none text-foreground">
            <option value="monthly">a.m.</option>
            <option value="annual">a.a.</option>
          </select>
        </div>
        
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-lg hover:bg-accent text-muted-foreground">Cancelar</button>
        <button onClick={handleAdd} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-medium">Adicionar</button>
      </div>
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
