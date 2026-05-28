import { useState, useCallback, useEffect } from "react";
import { InvestmentArea, Investment, InvestmentGoal, ContributionRecord, Debt, MonthlyOverride } from "@/lib/types";
import { secureGet, secureSet } from "@/lib/crypto";

function loadSecure<T>(key: string, fallback: T): T {
  try {
    const stored = secureGet(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function useInvestmentStore() {
  const [areas, setAreas] = useState<InvestmentArea[]>(() => {
    const loaded = loadSecure<InvestmentArea[]>("investment-areas", []);
    return loaded.map(a => ({ ...a, debts: a.debts || [] }));
  });

  useEffect(() => {
    secureSet("investment-areas", JSON.stringify(areas));
  }, [areas]);

  const addArea = useCallback((name: string, color: string, logoEmoji: string) => {
    const area: InvestmentArea = {
      id: crypto.randomUUID(), name, color, logoEmoji,
      investments: [], goals: [], debts: [],
    };
    setAreas(prev => [...prev, area]);
  }, []);

  const deleteArea = useCallback((areaId: string) => {
    setAreas(prev => prev.filter(a => a.id !== areaId));
  }, []);

  const addInvestment = useCallback((areaId: string, investment: Omit<Investment, "id" | "contributions">): string => {
    const inv: Investment = { ...investment, id: crypto.randomUUID(), contributions: [] };
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, investments: [...a.investments, inv] } : a
    ));
    return inv.id;
  }, []);

  const deleteInvestment = useCallback((areaId: string, investmentId: string) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, investments: a.investments.filter(i => i.id !== investmentId) } : a
    ));
  }, []);

  const addContribution = useCallback((areaId: string, investmentId: string, date: string, amount: number) => {
    const record: ContributionRecord = { id: crypto.randomUUID(), date, amount };
    setAreas(prev => prev.map(a =>
      a.id === areaId ? {
        ...a,
        investments: a.investments.map(i =>
          i.id === investmentId ? { ...i, contributions: [...i.contributions, record] } : i
        ),
      } : a
    ));
  }, []);

  const addGoal = useCallback((areaId: string, name: string, targetAmount: number) => {
    const goal: InvestmentGoal = { id: crypto.randomUUID(), name, targetAmount };
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, goals: [...a.goals, goal] } : a
    ));
  }, []);

  const deleteGoal = useCallback((areaId: string, goalId: string) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, goals: a.goals.filter(g => g.id !== goalId) } : a
    ));
  }, []);

  const addDebt = useCallback((areaId: string, name: string, monthlyAmount: number) => {
    const debt: Debt = { id: crypto.randomUUID(), name, monthlyAmount };
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, debts: [...a.debts, debt] } : a
    ));
  }, []);

  const deleteDebt = useCallback((areaId: string, debtId: string) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, debts: a.debts.filter(d => d.id !== debtId) } : a
    ));
  }, []);

  const setMonthlyOverride = useCallback((areaId: string, investmentId: string, override: MonthlyOverride | undefined) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId ? {
        ...a,
        investments: a.investments.map(i =>
          i.id === investmentId ? { ...i, monthlyOverride: override } : i
        ),
      } : a
    ));
  }, []);

  return { areas, addArea, deleteArea, addInvestment, deleteInvestment, addContribution, addGoal, deleteGoal, addDebt, deleteDebt, setMonthlyOverride };
}
