import { Investment } from "./types";

export interface GrowthDataPoint {
  month: number;
  invested: number;
  total: number;
  profit: number;
}

export function getMonthlyRate(investment: Investment): number {
  if (investment.rateType === "monthly") return investment.rateOfReturn / 100;
  return Math.pow(1 + investment.rateOfReturn / 100, 1 / 12) - 1;
}

export function calculateGrowth(investment: Investment, months: number): GrowthDataPoint[] {
  const monthlyRate = getMonthlyRate(investment);
  let total = investment.initialValue + investment.previouslyInvested;
  const baseInvested = investment.initialValue + investment.previouslyInvested;
  const data: GrowthDataPoint[] = [];

  for (let m = 0; m <= months; m++) {
    const invested = baseInvested + investment.monthlyContribution * m;
    const profit = total - invested;
    data.push({ month: m, invested, total: Math.round(total * 100) / 100, profit: Math.round(profit * 100) / 100 });
    total = total * (1 + monthlyRate) + investment.monthlyContribution;
  }
  return data;
}

export function getCurrentValue(investment: Investment): number {
  const start = new Date(investment.startDate);
  const now = new Date();
  const months = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));

  // Add manual contributions
  const manualTotal = investment.contributions.reduce((sum, c) => sum + c.amount, 0);

  const monthlyRate = getMonthlyRate(investment);
  let total = investment.initialValue + investment.previouslyInvested;

  for (let m = 0; m < months; m++) {
    total = total * (1 + monthlyRate) + investment.monthlyContribution;
  }

  total += manualTotal * (1 + monthlyRate); // simplified: contributions earn one period of interest
  return Math.round(total * 100) / 100;
}

export function getAreaTotals(investments: Investment[]) {
  let totalInvested = 0;
  let totalCurrent = 0;
  let totalPassiveIncome = 0;

  for (const inv of investments) {
    const baseInvested = inv.initialValue + inv.previouslyInvested;
    const start = new Date(inv.startDate);
    const now = new Date();
    const months = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
    const manualTotal = inv.contributions.reduce((sum, c) => sum + c.amount, 0);

    totalInvested += baseInvested + inv.monthlyContribution * months + manualTotal;
    totalCurrent += getCurrentValue(inv);
    totalPassiveIncome += inv.passiveIncome || 0;
  }

  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    totalCurrent: Math.round(totalCurrent * 100) / 100,
    totalProfit: Math.round((totalCurrent - totalInvested) * 100) / 100,
    totalPassiveIncome: Math.round(totalPassiveIncome * 100) / 100,
  };
}

export function simulateUntilDate(investment: Investment, targetDate: string): GrowthDataPoint {
  const start = new Date(investment.startDate);
  const target = new Date(targetDate);
  const months = Math.max(0, (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth()));
  const data = calculateGrowth(investment, months);
  return data[data.length - 1];
}
