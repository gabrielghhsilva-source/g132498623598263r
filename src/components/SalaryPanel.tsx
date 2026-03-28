import { useState } from "react";
import { ManualExpense, InvestmentArea, StockPosition } from "@/lib/types";
import { getAreaTotals } from "@/lib/investmentCalc";
import { Wallet, Plus, Trash2, Edit3, Check, TrendingDown, TrendingUp, PiggyBank, CreditCard, BarChart3 } from "lucide-react";

interface Props {
  salary: number;
  manualExpenses: ManualExpense[];
  investmentAreas: InvestmentArea[];
  stockPositions: StockPosition[];
  onSetSalary: (v: number) => void;
  onAddExpense: (name: string, amount: number) => void;
  onDeleteExpense: (id: string) => void;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function SalaryPanel({
  salary, manualExpenses, investmentAreas, stockPositions,
  onSetSalary, onAddExpense, onDeleteExpense,
}: Props) {
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState(salary.toString());
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expName, setExpName] = useState("");
  const [expAmount, setExpAmount] = useState("");

  // Auto expenses from investments
  const allInvestments = investmentAreas.flatMap(a => a.investments);
  const monthlyInvestments = allInvestments.reduce((s, inv) => s + inv.monthlyContribution, 0);

  // Monthly stock cost (avgPrice * shares / 12 as monthly approximation)
  const totalStockValue = stockPositions.reduce((s, p) => s + p.avgPrice * p.shares, 0);
  const monthlyStockCost = totalStockValue > 0 ? totalStockValue / 12 : 0;

  // Debts from investments
  const allDebts = investmentAreas.flatMap(a => a.debts || []);
  const monthlyDebts = allDebts.reduce((s, d) => s + d.monthlyAmount, 0);

  // Manual expenses
  const totalManualExpenses = manualExpenses.reduce((s, e) => s + e.amount, 0);

  // Totals
  const totalAutoExpenses = monthlyInvestments + monthlyDebts;
  const totalExpenses = totalAutoExpenses + totalManualExpenses;
  const finalBalance = salary - totalExpenses;

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
          <SummaryCard icon={PiggyBank} label="Aportes/mês" value={formatCurrency(monthlyInvestments)} color="text-amber-500" />
          <SummaryCard icon={CreditCard} label="Dívidas/mês" value={formatCurrency(monthlyDebts)} color="text-destructive" />
          <SummaryCard
            icon={TrendingUp}
            label="Saldo Final"
            value={formatCurrency(finalBalance)}
            color={finalBalance >= 0 ? "text-green-500" : "text-destructive"}
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
          {monthlyStockCost > 0 && (
            <ExpenseRow label="Ações (valor mensal estimado)" value={Math.round(monthlyStockCost)} auto />
          )}
          {totalAutoExpenses === 0 && (
            <p className="text-xs text-muted-foreground italic">Nenhuma despesa automática cadastrada</p>
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
          {salary > 0 && (
            <>
              {monthlyInvestments > 0 && (
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (monthlyInvestments / salary) * 100)}%` }}
                  title={`Aportes: ${formatCurrency(monthlyInvestments)}`}
                />
              )}
              {monthlyDebts > 0 && (
                <div
                  className="h-full bg-destructive transition-all duration-500"
                  style={{ width: `${Math.min(100, (monthlyDebts / salary) * 100)}%` }}
                  title={`Dívidas: ${formatCurrency(monthlyDebts)}`}
                />
              )}
              {totalManualExpenses > 0 && (
                <div
                  className="h-full bg-orange-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalManualExpenses / salary) * 100)}%` }}
                  title={`Manual: ${formatCurrency(totalManualExpenses)}`}
                />
              )}
              {finalBalance > 0 && (
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (finalBalance / salary) * 100)}%` }}
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
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Saldo</span>
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
