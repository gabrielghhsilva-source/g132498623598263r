import { useState } from "react";
import { DebtItem } from "@/lib/types";
import { CreditCard, Plus, Trash2, Check, AlertTriangle, Calendar, CircleCheck, Circle } from "lucide-react";

interface Props {
  debts: DebtItem[];
  onAdd: (input: Omit<DebtItem, "id" | "createdAt" | "paid">) => void;
  onTogglePaid: (id: string) => void;
  onDelete: (id: string) => void;
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function isOverdue(d: DebtItem) {
  if (d.paid || !d.dueDate) return false;
  return new Date(d.dueDate) < new Date(new Date().toISOString().split("T")[0]);
}

export function DebtsPanel({ debts, onAdd, onTogglePaid, onDelete }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");

  const pending = debts.filter(d => !d.paid);
  const paid = debts.filter(d => d.paid);
  const totalPending = pending.reduce((s, d) => s + d.amount, 0);
  const totalPaid = paid.reduce((s, d) => s + d.amount, 0);
  const overdueCount = pending.filter(isOverdue).length;

  const handleAdd = () => {
    if (!name.trim() || !amount) return;
    onAdd({
      name: name.trim(),
      amount: Number(amount),
      dueDate: dueDate || undefined,
      category: category.trim() || undefined,
    });
    setName("");
    setAmount("");
    setDueDate("");
    setCategory("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Kpi label="Total a pagar" value={fmt(totalPending)} accent="destructive" big />
        <Kpi label="Pagas no período" value={fmt(totalPaid)} accent="success" />
        <Kpi
          label="Em atraso"
          value={`${overdueCount}`}
          accent={overdueCount > 0 ? "warning" : "muted"}
          icon={overdueCount > 0 ? AlertTriangle : undefined}
        />
      </div>

      {/* Add form */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold tracking-wide uppercase text-foreground/80 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Despesas & Dívidas
          </h3>
          <button
            onClick={() => setShowAdd(s => !s)}
            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Nova
          </button>
        </div>

        {showAdd && (
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-4 gap-2 border-b border-border bg-muted/30">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome (ex: Cartão Nubank)"
              className="bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
              autoFocus
            />
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Valor"
              className="bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <input
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Categoria"
                className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={handleAdd}
                className="px-3 rounded-md bg-primary text-primary-foreground hover:opacity-90"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Pending list */}
        <div className="divide-y divide-border">
          {pending.length === 0 && (
            <p className="px-5 py-6 text-sm text-muted-foreground italic text-center">
              Sem dívidas pendentes 🎉
            </p>
          )}
          {pending.map(d => (
            <DebtRow key={d.id} debt={d} onTogglePaid={onTogglePaid} onDelete={onDelete} />
          ))}
        </div>

        {paid.length > 0 && (
          <details className="border-t border-border">
            <summary className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer hover:bg-muted/50">
              Pagas ({paid.length})
            </summary>
            <div className="divide-y divide-border">
              {paid.map(d => (
                <DebtRow key={d.id} debt={d} onTogglePaid={onTogglePaid} onDelete={onDelete} />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function DebtRow({
  debt,
  onTogglePaid,
  onDelete,
}: {
  debt: DebtItem;
  onTogglePaid: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const overdue = isOverdue(debt);
  return (
    <div
      className={`flex items-center gap-3 px-5 py-3 group transition-colors ${
        overdue ? "bg-destructive/5" : ""
      }`}
    >
      <button
        onClick={() => onTogglePaid(debt.id)}
        className="flex-shrink-0 transition-transform hover:scale-110"
        title={debt.paid ? "Marcar como pendente" : "Marcar como paga"}
      >
        {debt.paid ? (
          <CircleCheck className="w-5 h-5 text-success" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${debt.paid ? "line-through text-muted-foreground" : ""}`}>
            {debt.name}
          </span>
          {debt.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium uppercase tracking-wide">
              {debt.category}
            </span>
          )}
          {overdue && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground font-bold uppercase">
              Atrasada
            </span>
          )}
        </div>
        {debt.dueDate && (
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(debt.dueDate + "T00:00").toLocaleDateString("pt-BR")}
          </div>
        )}
      </div>
      <span className={`text-base font-bold tabular-nums ${debt.paid ? "text-muted-foreground" : "text-destructive"}`}>
        {fmt(debt.amount)}
      </span>
      <button
        onClick={() => onDelete(debt.id)}
        className="p-1.5 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </button>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  big,
  icon: Icon,
}: {
  label: string;
  value: string;
  accent: "destructive" | "success" | "warning" | "muted";
  big?: boolean;
  icon?: typeof AlertTriangle;
}) {
  const colorMap = {
    destructive: "text-destructive border-l-destructive",
    success: "text-success border-l-success",
    warning: "text-warning border-l-warning",
    muted: "text-muted-foreground border-l-border",
  } as const;
  return (
    <div className={`bg-card border border-border border-l-4 ${colorMap[accent]} rounded-md shadow-sm p-4`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      <p className={`mt-2 font-bold tabular-nums ${colorMap[accent]} ${big ? "text-3xl" : "text-2xl"}`}>
        {value}
      </p>
    </div>
  );
}
