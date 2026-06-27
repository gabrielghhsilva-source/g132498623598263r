import { useMemo, useState } from "react";
import { ManualExpense } from "@/lib/types";
import { CATEGORY_META, CATEGORY_LIST, ExpenseCategory } from "@/lib/categorize";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { AlertTriangle, Wallet, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";

interface Props {
  expenses: ManualExpense[];
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function CategoryBreakdown({ expenses }: Props) {
  const { budgets, setBudget } = useBudgetStore();
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [editVal, setEditVal] = useState("");

  const byCategory = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const e of expenses) {
      const c = e.category || "outros";
      sums[c] = (sums[c] || 0) + e.amount;
    }
    return CATEGORY_LIST
      .map(cat => ({ cat, total: sums[cat] || 0 }))
      .filter(r => r.total > 0 || budgets[r.cat])
      .sort((a, b) => b.total - a.total);
  }, [expenses, budgets]);

  const grandTotal = byCategory.reduce((s, r) => s + r.total, 0);

  const startEdit = (cat: ExpenseCategory) => {
    setEditing(cat);
    setEditVal(String(budgets[cat] ?? ""));
  };

  const saveEdit = () => {
    if (!editing) return;
    const v = parseFloat(editVal.replace(",", "."));
    setBudget(editing, isNaN(v) ? 0 : v);
    setEditing(null);
  };

  if (byCategory.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/80">
            Gastos por categoria
          </h3>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="p-3 sm:p-4 space-y-2.5">
          {byCategory.map(({ cat, total }) => {
            const meta = CATEGORY_META[cat];
            const budget = budgets[cat] || 0;
            const pctOfTotal = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
            const pctOfBudget = budget > 0 ? (total / budget) * 100 : 0;
            const overBudget = budget > 0 && total > budget;
            const isEditing = editing === cat;

            return (
              <div key={cat} className={`rounded-md border px-3 py-2 ${overBudget ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/20"}`}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{meta.emoji}</span>
                    <span className="text-sm font-semibold truncate">{meta.label}</span>
                    {overBudget && <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums">{fmt(total)}</span>
                    {!isEditing && (
                      <button
                        onClick={() => startEdit(cat)}
                        title="Definir orçamento"
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${budget > 0 ? Math.min(100, pctOfBudget) : pctOfTotal}%`,
                      backgroundColor: overBudget ? "hsl(var(--destructive))" : meta.color,
                    }}
                  />
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-[10px] text-muted-foreground">Limite R$:</span>
                    <input
                      autoFocus
                      type="number"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null); }}
                      placeholder="0 = sem limite"
                      className="flex-1 text-xs bg-background border border-border rounded px-2 py-1 outline-none focus:border-primary"
                    />
                    <button onClick={saveEdit} className="p-1 rounded bg-success/20 text-success hover:bg-success/30"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setEditing(null)} className="p-1 rounded bg-muted hover:bg-accent"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                    {budget > 0
                      ? <>Orçamento {fmt(budget)} · {pctOfBudget.toFixed(0)}% usado{overBudget && <span className="text-destructive font-semibold"> · estourou {fmt(total - budget)}</span>}</>
                      : <>{pctOfTotal.toFixed(0)}% dos gastos · sem orçamento</>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
