import { useMemo } from "react";
import { TaskArea, InvestmentArea, SalaryData, DebtItem } from "@/lib/types";
import { getAreaTotals } from "@/lib/investmentCalc";
import { isTaskOverdue } from "@/lib/timeUtils";
import { Sun, ListTodo, AlertCircle, PiggyBank, TrendingUp, X, ChevronRight } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  taskAreas: TaskArea[];
  investmentAreas: InvestmentArea[];
  salary: SalaryData;
  debts: DebtItem[];
  timezone: string;
  onJumpToTasks: () => void;
  onJumpToMenu: () => void;
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function greet(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function MorningBriefing({
  open, onClose, taskAreas, investmentAreas, salary, debts, timezone,
  onJumpToTasks, onJumpToMenu,
}: Props) {
  const todayStr = new Date().toISOString().split("T")[0];

  const stats = useMemo(() => {
    const allTasks = taskAreas.flatMap(a => a.tasks.map(t => ({ task: t, area: a })));
    const dueToday = allTasks.filter(({ task }) =>
      task.status !== "done" && task.dueDate === todayStr
    );
    const overdue = allTasks.filter(({ task }) =>
      isTaskOverdue(task.dueDate, task.dueTime, task.status, timezone)
    );

    const allInvestments = investmentAreas.flatMap(a => a.investments);
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    const pendingContrib = allInvestments.filter(inv =>
      inv.monthlyContribution > 0 &&
      !inv.contributions.some(c => {
        const d = new Date(c.date + "T00:00");
        return d.getMonth() === m && d.getFullYear() === y;
      })
    );

    const totals = getAreaTotals(allInvestments);
    const pendingDebts = debts.filter(d => !d.paid);
    const debtTotal = pendingDebts.reduce((s, d) => s + d.amount, 0);

    return {
      dueToday: dueToday.length,
      overdue: overdue.length,
      pendingContrib: pendingContrib.length,
      pendingContribTotal: pendingContrib.reduce((s, i) => s + i.monthlyContribution, 0),
      patrimony: totals.totalCurrent,
      profit: totals.totalProfit,
      debtTotal,
      pendingDebts: pendingDebts.length,
      salary: salary.salary,
    };
  }, [taskAreas, investmentAreas, salary, debts, timezone, todayStr]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-5 pt-5 pb-4 border-b border-border">
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-primary">
            <Sun className="w-5 h-5" />
            <span className="text-[11px] uppercase font-bold tracking-wider">{greet()}</span>
          </div>
          <h2 className="text-xl font-bold mt-1">Seu dia em resumo</h2>
          <p className="text-xs text-muted-foreground mt-1 capitalize">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>

        <div className="p-4 space-y-2.5">
          <BriefingRow
            icon={ListTodo}
            tone="primary"
            label="Tarefas para hoje"
            value={stats.dueToday > 0 ? `${stats.dueToday} pendente${stats.dueToday > 1 ? "s" : ""}` : "Nada agendado"}
            onClick={onJumpToTasks}
            highlight={stats.dueToday > 0}
          />
          {stats.overdue > 0 && (
            <BriefingRow
              icon={AlertCircle}
              tone="destructive"
              label="Tarefas atrasadas"
              value={`${stats.overdue} em atraso`}
              onClick={onJumpToTasks}
              highlight
            />
          )}
          {stats.pendingContrib > 0 && (
            <BriefingRow
              icon={PiggyBank}
              tone="warning"
              label="Aportes do mês"
              value={`${stats.pendingContrib} pendente${stats.pendingContrib > 1 ? "s" : ""} (${fmt(stats.pendingContribTotal)})`}
              onClick={onJumpToMenu}
              highlight
            />
          )}
          <BriefingRow
            icon={TrendingUp}
            tone="success"
            label="Patrimônio total"
            value={`${fmt(stats.patrimony)} (+${fmt(Math.max(0, stats.profit))})`}
            onClick={onJumpToMenu}
          />
          {stats.pendingDebts > 0 && (
            <BriefingRow
              icon={AlertCircle}
              tone="destructive"
              label="Dívidas em aberto"
              value={`${stats.pendingDebts} · ${fmt(stats.debtTotal)}`}
              onClick={onJumpToMenu}
              highlight
            />
          )}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90"
          >
            Começar o dia
          </button>
        </div>
      </div>
    </div>
  );
}

function BriefingRow({
  icon: Icon, tone, label, value, onClick, highlight,
}: {
  icon: typeof Sun;
  tone: "primary" | "success" | "warning" | "destructive";
  label: string;
  value: string;
  onClick?: () => void;
  highlight?: boolean;
}) {
  const toneCls = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
  }[tone];
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-md border transition-colors ${
        highlight ? "border-border bg-muted/30 hover:bg-muted/50" : "border-border/60 hover:bg-muted/30"
      }`}
    >
      <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${toneCls}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}
