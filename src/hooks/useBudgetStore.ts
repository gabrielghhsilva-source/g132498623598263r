import { useState, useEffect, useCallback } from "react";
import { secureGet, secureSet } from "@/lib/crypto";
import { ExpenseCategory } from "@/lib/categorize";

export type BudgetMap = Partial<Record<ExpenseCategory, number>>;

const KEY = "budgets-by-category";

export function useBudgetStore() {
  const [budgets, setBudgets] = useState<BudgetMap>(() => {
    try {
      const raw = secureGet(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    secureSet(KEY, JSON.stringify(budgets));
  }, [budgets]);

  const setBudget = useCallback((cat: ExpenseCategory, value: number) => {
    setBudgets(prev => {
      const next = { ...prev };
      if (!value || value <= 0) delete next[cat];
      else next[cat] = value;
      return next;
    });
  }, []);

  return { budgets, setBudget };
}
