import { useState, useMemo } from "react";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  BarChart3,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { MenuSection, InvestmentArea, StockPosition, SalaryData, ManualExpense, ManualIncome, DebtItem } from "@/lib/types";
import { getAreaTotals } from "@/lib/investmentCalc";
import { InvestmentDashboard } from "@/components/InvestmentDashboard";
import { StockMarket } from "@/components/StockMarket";
import { SalaryPanel } from "@/components/SalaryPanel";
import { DebtsPanel } from "@/components/DebtsPanel";
import { FinancialCharts } from "@/components/FinancialCharts";
import { ImageConverter } from "@/components/ImageConverter";
import { useDebtStore } from "@/hooks/useDebtStore";

interface Props {
  invest: InvestApi;
  stocks: StocksApi;
  salary: SalaryApi;
  onCreateTaskReminder: (text: string) => void;
}

// Type helpers (imported usage shape from existing stores)
type InvestApi = {
  areas: InvestmentArea[];
  addArea: (n: string, c: string, e: string) => void;
  deleteArea: (id: string) => void;
  addInvestment: (areaId: string, inv: Omit<import("@/lib/types").Investment, "id" | "contributions">) => string;
  deleteInvestment: (...args: any[]) => void;
  addContribution: (areaId: string, investmentId: string, date: string, amount: number) => void;
  addBulkContributions: (areaId: string, investmentId: string, entries: { date: string; amount: number }[]) => void;
  updateInvestment: (areaId: string, investmentId: string, patch: Partial<import("@/lib/types").Investment>) => void;
  addGoal: (...args: any[]) => void;
  deleteGoal: (...args: any[]) => void;
  addDebt: (...args: any[]) => void;
  deleteDebt: (...args: any[]) => void;
  setMonthlyOverride: (...args: any[]) => void;
};
type StocksApi = {
  positions: StockPosition[];
  addPosition: (...args: any[]) => void;
  removePosition: (id: string) => void;
};
type SalaryApi = {
  data: SalaryData;
  setSalary: (v: number) => void;
  addExpense: (n: string, a: number) => void;
  deleteExpense: (id: string) => void;
  addIncome: (n: string, a: number) => void;
  deleteIncome: (id: string) => void;
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function MenuPage({ invest, stocks, salary, onCreateTaskReminder }: Props) {
  const [section, setSection] = useState<MenuSection>("overview");
  const [finTab, setFinTab] = useState<"investments" | "stocks" | "salary">("salary");
  const debtStore = useDebtStore();

  // Aggregations for overview
  const allInvestments = invest.areas.flatMap(a => a.investments);
  const totals = useMemo(() => getAreaTotals(allInvestments), [allInvestments]);
  const profit = Math.max(0, totals.totalProfit);
  const totalManualExpenses = salary.data.manualExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncomes = salary.data.manualIncomes.reduce((s, i) => s + i.amount, 0) + profit;
  const monthlyContrib = allInvestments.reduce((s, i) => s + i.monthlyContribution, 0);
  const debtPending = debtStore.totalPending;
  const finalBalance = salary.data.salary + totalIncomes - totalManualExpenses - monthlyContrib - debtPending;

  return (
    <div className="space-y-5">
      {/* Section tabs */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="flex">
          <SectionTab
            active={section === "overview"}
            onClick={() => setSection("overview")}
            icon={LayoutDashboard}
            label="Resumo"
          />
          <SectionTab
            active={section === "financial"}
            onClick={() => setSection("financial")}
            icon={Wallet}
            label="Financeiro"
          />
          <SectionTab
            active={section === "debts"}
            onClick={() => setSection("debts")}
            icon={CreditCard}
            label="Dívidas"
          />
        </div>
      </div>

      {section === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <OverviewCard
              label="Saldo Final"
              value={fmt(finalBalance)}
              tone={finalBalance >= 0 ? "success" : "destructive"}
              icon={finalBalance >= 0 ? ArrowUpRight : ArrowDownRight}
              big
            />
            <OverviewCard label="Salário" value={fmt(salary.data.salary)} tone="primary" icon={Wallet} />
            <OverviewCard label="Lucro Investimentos" value={fmt(profit)} tone="success" icon={TrendingUp} />
            <OverviewCard label="Aportes/mês" value={fmt(monthlyContrib)} tone="warning" icon={PiggyBank} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <OverviewCard label="Patrimônio Investido" value={fmt(totals.totalCurrent)} tone="primary" />
            <OverviewCard label="Despesas Manuais" value={fmt(totalManualExpenses)} tone="destructive" />
            <OverviewCard
              label="Dívidas Pendentes"
              value={fmt(debtPending)}
              tone={debtPending > 0 ? "destructive" : "muted"}
              icon={debtStore.overdue.length > 0 ? AlertTriangle : CreditCard}
            />
          </div>

          {/* Visual charts */}
          <FinancialCharts
            salary={salary.data.salary}
            manualIncomes={salary.data.manualIncomes.reduce((s, i) => s + i.amount, 0)}
            investmentProfit={profit}
            stocksProfit={0}
            monthlyInvestments={monthlyContrib}
            monthlyDebts={0}
            expenseBreakdown={[
              ...invest.areas.flatMap(a => (a.debts || []).map(d => ({ name: `Dívida: ${d.name}`, value: d.monthlyAmount, recurring: true }))),
              ...salary.data.manualExpenses.map(e => ({ name: e.name, value: e.amount, recurring: e.recurring })),
            ]}
            pendingDebts={debtPending}
            finalBalance={finalBalance}
            totalPatrimony={totals.totalCurrent}
          />




          {/* Quick debt list */}
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-wide uppercase text-foreground/80">
                Dívidas em aberto
              </h3>
              <button
                onClick={() => setSection("debts")}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Ver todas →
              </button>
            </div>
            <div className="divide-y divide-border">
              {debtStore.debts.filter(d => !d.paid).slice(0, 5).map(d => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold">{d.name}</p>
                    {d.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        Vence em {new Date(d.dueDate + "T00:00").toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-destructive tabular-nums">
                      {fmt(d.amount)}
                    </span>
                    <button
                      onClick={() => debtStore.togglePaid(d.id)}
                      className="text-xs px-2.5 py-1 rounded-md bg-success text-success-foreground hover:opacity-90 font-semibold"
                    >
                      Pagar
                    </button>
                  </div>
                </div>
              ))}
              {debtStore.debts.filter(d => !d.paid).length === 0 && (
                <p className="px-5 py-6 text-sm text-muted-foreground italic text-center">
                  Nenhuma dívida em aberto
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {section === "financial" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg shadow-sm p-1.5 flex gap-1">
            <FinTab active={finTab === "salary"} onClick={() => setFinTab("salary")} icon={Wallet} label="Salário" />
            <FinTab active={finTab === "investments"} onClick={() => setFinTab("investments")} icon={TrendingUp} label="Investimentos" />
            <FinTab active={finTab === "stocks"} onClick={() => setFinTab("stocks")} icon={BarChart3} label="Ações" />
          </div>

          {finTab === "salary" && (
            <SalaryPanel
              salary={salary.data.salary}
              manualExpenses={salary.data.manualExpenses}
              manualIncomes={salary.data.manualIncomes || []}
              investmentAreas={invest.areas}
              stockPositions={stocks.positions}
              onSetSalary={salary.setSalary}
              onAddExpense={salary.addExpense}
              onDeleteExpense={salary.deleteExpense}
              onAddIncome={salary.addIncome}
              onDeleteIncome={salary.deleteIncome}
              onAddInvestment={invest.addInvestment}
              onAddContribution={invest.addContribution}
            />
          )}
          {finTab === "investments" && (
            <InvestmentDashboard
              areas={invest.areas}
              onAddArea={invest.addArea}
              onDeleteArea={invest.deleteArea}
              onAddInvestment={invest.addInvestment}
              onDeleteInvestment={invest.deleteInvestment}
              onAddContribution={invest.addContribution}
              onAddBulkContributions={invest.addBulkContributions}
              onAddGoal={invest.addGoal}
              onDeleteGoal={invest.deleteGoal}
              onAddDebt={invest.addDebt}
              onDeleteDebt={invest.deleteDebt}
              onSetMonthlyOverride={invest.setMonthlyOverride}
              onCreateTaskReminder={onCreateTaskReminder}
            />
          )}
          {finTab === "stocks" && (
            <StockMarket
              positions={stocks.positions}
              onAdd={stocks.addPosition}
              onRemove={stocks.removePosition}
            />
          )}
        </div>
      )}

      {section === "debts" && (
        <DebtsPanel
          debts={debtStore.debts}
          onAdd={debtStore.addDebt}
          onTogglePaid={debtStore.togglePaid}
          onDelete={debtStore.deleteDebt}
        />
      )}
    </div>
  );
}

function _UnusedSectionEnd() { return null; }

function SectionTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof LayoutDashboard;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors border-b-2 ${
        active
          ? "border-primary text-primary bg-primary/5"
          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function FinTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Wallet;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-colors uppercase tracking-wide ${
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function OverviewCard({
  label,
  value,
  tone,
  icon: Icon,
  big,
}: {
  label: string;
  value: string;
  tone: "primary" | "success" | "destructive" | "warning" | "muted";
  icon?: typeof Wallet;
  big?: boolean;
}) {
  const toneCls = {
    primary: "text-primary border-l-primary",
    success: "text-success border-l-success",
    destructive: "text-destructive border-l-destructive",
    warning: "text-warning border-l-warning",
    muted: "text-muted-foreground border-l-border",
  }[tone];
  return (
    <div className={`bg-card border border-border border-l-4 ${toneCls} rounded-md shadow-sm p-4`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      <p className={`mt-2 font-bold tabular-nums ${toneCls} ${big ? "text-3xl" : "text-xl"}`}>
        {value}
      </p>
    </div>
  );
}
