import { useState, useCallback, useEffect } from "react";
import { SalaryData, ManualExpense, ManualIncome, DEFAULT_SALARY_DATA } from "@/lib/types";
import { secureGet, secureSet } from "@/lib/crypto";

function loadSecure<T>(key: string, fallback: T): T {
  try {
    const stored = secureGet(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function useSalaryStore() {
  const [data, setData] = useState<SalaryData>(() => {
    const loaded = loadSecure("salary-data", DEFAULT_SALARY_DATA);
    return { ...loaded, manualIncomes: loaded.manualIncomes || [] };
  });

  useEffect(() => {
    secureSet("salary-data", JSON.stringify(data));
  }, [data]);

  const setSalary = useCallback((salary: number) => {
    setData(prev => ({ ...prev, salary }));
  }, []);

  const addExpense = useCallback((name: string, amount: number, recurring = false) => {
    const expense: ManualExpense = { id: crypto.randomUUID(), name, amount, recurring };
    setData(prev => ({
      ...prev,
      manualExpenses: [...prev.manualExpenses, expense],
    }));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      manualExpenses: prev.manualExpenses.filter(e => e.id !== id),
    }));
  }, []);

  const addIncome = useCallback((name: string, amount: number) => {
    const income: ManualIncome = { id: crypto.randomUUID(), name, amount };
    setData(prev => ({
      ...prev,
      manualIncomes: [...(prev.manualIncomes || []), income],
    }));
  }, []);

  const deleteIncome = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      manualIncomes: (prev.manualIncomes || []).filter(i => i.id !== id),
    }));
  }, []);

  return { data, setSalary, addExpense, deleteExpense, addIncome, deleteIncome };
}
