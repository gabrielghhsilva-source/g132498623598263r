import { useState, useCallback, useEffect } from "react";
import { InvestmentArea, Investment, InvestmentGoal, ContributionRecord } from "@/lib/types";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function useInvestmentStore() {
  const [areas, setAreas] = useState<InvestmentArea[]>(() =>
    loadFromStorage("investment-areas", [])
  );

  useEffect(() => {
    localStorage.setItem("investment-areas", JSON.stringify(areas));
  }, [areas]);

  const addArea = useCallback((name: string, color: string, logoEmoji: string) => {
    const area: InvestmentArea = {
      id: crypto.randomUUID(),
      name, color, logoEmoji,
      investments: [],
      goals: [],
    };
    setAreas(prev => [...prev, area]);
  }, []);

  const deleteArea = useCallback((areaId: string) => {
    setAreas(prev => prev.filter(a => a.id !== areaId));
  }, []);

  const addInvestment = useCallback((areaId: string, investment: Omit<Investment, "id" | "contributions">) => {
    const inv: Investment = { ...investment, id: crypto.randomUUID(), contributions: [] };
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, investments: [...a.investments, inv] } : a
    ));
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

  return { areas, addArea, deleteArea, addInvestment, deleteInvestment, addContribution, addGoal, deleteGoal };
}
