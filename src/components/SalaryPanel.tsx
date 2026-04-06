import { useState } from "react";
import { ManualExpense, ManualIncome, InvestmentArea, StockPosition } from "@/lib/types";
import { getAreaTotals } from "@/lib/investmentCalc";
import { Wallet, Plus, Trash2, Edit3, Check, TrendingDown, TrendingUp, PiggyBank, CreditCard, BarChart3, DollarSign } from "lucide-react";

interface Props {
  salary: number;
  manualExpenses: ManualExpense[];
  manualIncomes: ManualIncome[];
  investmentAreas: InvestmentArea[];
  stockPositions: StockPosition[];
  onSetSalary: (v: number) => void;
  onAddExpense: (name: string, amount: number) => void;
  onDeleteExpense: (id: string) => void;
  onAddIncome: (name: string, amount: number) => void;
  onDeleteIncome: (id: string) => void;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function SalaryPanel({
  salary, manualExpenses, manualIncomes, investmentAreas, stockPositions,
  onSetSalary, onAddExpense, onDeleteExpense, onAddIncome, onDeleteIncome,
}: Props) {
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState(salary.toString());
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expName, setExpName] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [incName, setIncName] = useState("");
  const [incAmount, setIncAmount] = useState("");

  // Auto expenses from investments (using override if active)
  const allInvestments = investmentAreas.flatMap(a => a.investments);
  const now = new Date();
  const monthlyInvestments = allInvestments.reduce((s, inv) => {
    if (inv.monthlyOverride && inv.monthlyOverride.month === now.getMonth() && inv.monthlyOverride.year === now.getFullYear()) {
      return s + inv.monthlyOverride.amount;
    }
    return s + inv.monthlyContribution;
  }, 0);

  // Debts from investments
  const allDebts = investmentAreas.flatMap(a => a.debts || []);
  const monthlyDebts = allDebts.reduce((s, d) => s + d.monthlyAmount, 0);

  // Manual expenses & incomes
  const totalManualExpenses = manualExpenses.reduce((s, e) => s + e.amount, 0);
  const totalManualIncomes = manualIncomes.reduce((s, i) => s + i.amount, 0);

  // Investment profit (auto income)
  const grandTotals = getAreaTotals(allInvestments);
  const investmentProfit = Math.max(0, grandTotals.totalProfit);

  // Totals
  const totalAutoExpenses = monthlyInvestments + monthlyDebts;
  const totalExpenses = totalAutoExpenses + totalManualExpenses;
  const totalIncomes = totalManualIncomes + investmentProfit;
  const finalBalance = salary + totalIncomes - totalExpenses;

  const handleSaveSalary = () => {
    onSetSalary(Number(salaryInput) || 0);
    setEditingSalary(false);
  };

  const handleAddExpense = () => {
    if (!expName.trim() || !expAmount) return;
    onAddExpense(expName.trim(), Number(expAmount));
    setExpName("");
    setExpAmount("");
    setShowAddExpense(false);
  };

  const handleAddIncome = () => {
    if (!incName.trim() || !incAmount) return;
    onAddIncome(incName.trim(), Number(incAmount));
    setIncName("");
    setIncAmount("");
    setShowAddIncome(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Salary Card */}
      <div className="glass-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold">Meu Salário</h2>
          </div>
          <button
            onClick={() => { setEditingSalary(true); setSalaryInput(salary.toString()); }}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Edit3 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {editingSalary ? (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-muted-foreground">R$</span>
            <input
              type="number"
              value={salaryInput}
              onChange={e => setSalaryInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSaveSalary()}
              className="flex-1 bg-muted rounded-lg px-4 py-2.5 text-lg font-bold outline-none border border-border focus:border-primary/40 transition-colors"
              autoFocus
            />
            <button onClick={handleSaveSalary} className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="text-3xl font-bold text-primary mb-4">{formatCurrency(salary)}</p>
        )}

        {/* Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard icon={TrendingDown} label="Total Despesas" value={formatCurrency(totalExpenses)} color="text-destructive" />
          <SummaryCard icon={TrendingUp} label="Total Lucros" value={formatCurrency(totalIncomes)} color="text-success" />
          <SummaryCard icon={PiggyBank} label="Aportes/mês" value={formatCurrency(monthlyInvestments)} color="text-amber-500" />
          <SummaryCard
            icon={DollarSign}
            label="Saldo Final"
            value={formatCurrency(finalBalance)}
            color={finalBalance >= 0 ? "text-success" : "text-destructive"}
            highlight
          />
        </div>
      </div>

      {/* Auto Expenses Breakdown */}
      <div className="glass-card rounded-xl p-5 border border-border">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Despesas Automáticas
        </h3>
        <div className="space-y-2">
          {monthlyInvestments > 0 && (
            <ExpenseRow label="Aportes em investimentos" value={monthlyInvestments} auto />
          )}
          {allDebts.map(d => (
            <ExpenseRow key={d.id} label={`Dívida: ${d.name}`} value={d.monthlyAmount} auto />
          ))}
          {totalAutoExpenses === 0 && (
            <p className="text-xs text-muted-foreground italic">Nenhuma despesa automática cadastrada</p>
          )}
        </div>
      </div>

      {/* Incomes Section */}
      <div className="glass-card rounded-xl p-5 border border-border">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-success" /> Lucros / Renda Extra
        </h3>
        <div className="space-y-2">
          {/* Auto: investment profit */}
          {investmentProfit > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-success/5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">AUTO</span>
                <span className="text-sm">Lucro dos investimentos</span>
              </div>
              <span className="text-sm font-semibold text-success">+{formatCurrency(investmentProfit)}</span>
            </div>
          )}

          {/* Manual incomes */}
          {manualIncomes.map(inc => (
            <div key={inc.id} className="flex items-center justify-between bg-success/5 rounded-lg px-3 py-2.5 group">
              <div>
                <span className="text-sm font-medium">{inc.name}</span>
                <span className="text-xs text-success ml-2">+{formatCurrency(inc.amount)}</span>
              </div>
              <button
                onClick={() => onDeleteIncome(inc.id)}
                className="p-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          ))}

          {showAddIncome ? (
            <div className="flex gap-2 animate-fade-in">
              <input
                value={incName}
                onChange={e => setIncName(e.target.value)}
                placeholder="Nome (ex: Freelance, Venda)"
                className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border placeholder:text-muted-foreground"
                autoFocus
              />
              <input
                type="number"
                value={incAmount}
                onChange={e => setIncAmount(e.target.value)}
                placeholder="Valor"
                className="w-28 bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border placeholder:text-muted-foreground"
              />
              <button onClick={handleAddIncome} className="px-3 py-2 text-sm rounded-lg bg-success text-primary-foreground hover:opacity-90">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setShowAddIncome(false)} className="px-3 py-2 text-sm rounded-lg hover:bg-muted text-muted-foreground">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddIncome(true)}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Plus className="w-4 h-4" /> Nova renda extra
            </button>
          )}
        </div>
      </div>

      {/* Manual Expenses */}
      <div className="glass-card rounded-xl p-5 border border-border">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-destructive" /> Despesas Manuais
        </h3>
        <div className="space-y-2">
          {manualExpenses.map(exp => (
            <div key={exp.id} className="flex items-center justify-between bg-destructive/5 rounded-lg px-3 py-2.5 group">
              <div>
                <span className="text-sm font-medium">{exp.name}</span>
                <span className="text-xs text-destructive ml-2">-{formatCurrency(exp.amount)}</span>
              </div>
              <button
                onClick={() => onDeleteExpense(exp.id)}
                className="p-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          ))}

          {showAddExpense ? (
            <div className="flex gap-2 animate-fade-in">
              <input
                value={expName}
                onChange={e => setExpName(e.target.value)}
                placeholder="Nome da despesa"
                className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border placeholder:text-muted-foreground"
                autoFocus
              />
              <input
                type="number"
                value={expAmount}
                onChange={e => setExpAmount(e.target.value)}
                placeholder="Valor"
                className="w-28 bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border placeholder:text-muted-foreground"
              />
              <button onClick={handleAddExpense} className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setShowAddExpense(false)} className="px-3 py-2 text-sm rounded-lg hover:bg-muted text-muted-foreground">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Plus className="w-4 h-4" /> Nova despesa manual
            </button>
          )}
        </div>
      </div>

      {/* Visual Bar */}
      <div className="glass-card rounded-xl p-5 border border-border">
        <h3 className="text-sm font-semibold mb-3">Distribuição do Salário</h3>
        <div className="h-4 rounded-full bg-muted overflow-hidden flex">
          {(salary + totalIncomes) > 0 && (
            <>
              {monthlyInvestments > 0 && (
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (monthlyInvestments / (salary + totalIncomes)) * 100)}%` }}
                  title={`Aportes: ${formatCurrency(monthlyInvestments)}`}
                />
              )}
              {monthlyDebts > 0 && (
                <div
                  className="h-full bg-destructive transition-all duration-500"
                  style={{ width: `${Math.min(100, (monthlyDebts / (salary + totalIncomes)) * 100)}%` }}
                  title={`Dívidas: ${formatCurrency(monthlyDebts)}`}
                />
              )}
              {totalManualExpenses > 0 && (
                <div
                  className="h-full bg-orange-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalManualExpenses / (salary + totalIncomes)) * 100)}%` }}
                  title={`Manual: ${formatCurrency(totalManualExpenses)}`}
                />
              )}
              {finalBalance > 0 && (
                <div
                  className="h-full bg-success transition-all duration-500"
                  style={{ width: `${Math.min(100, (finalBalance / (salary + totalIncomes)) * 100)}%` }}
                  title={`Saldo: ${formatCurrency(finalBalance)}`}
                />
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Aportes</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Dívidas</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Manual</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Saldo</span>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, highlight }: {
  icon: any; label: string; value: string; color: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-muted/80 ring-1 ring-border" : "bg-muted/40"}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ExpenseRow({ label, value, auto }: { label: string; value: number; auto?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        {auto && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">AUTO</span>}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-semibold text-destructive">-{formatCurrency(value)}</span>
    </div>
  );
}