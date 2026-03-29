import { Investment, Debt } from "./types";

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
  const manualTotal = investment.contributions.reduce((sum, c) => sum + c.amount, 0);
  const monthlyRate = getMonthlyRate(investment);
  let total = investment.initialValue + investment.previouslyInvested;

  for (let m = 0; m < months; m++) {
    total = total * (1 + monthlyRate) + investment.monthlyContribution;
  }

  total += manualTotal * (1 + monthlyRate);
  return Math.round(total * 100) / 100;
}

export function getAreaTotals(investments: Investment[], debts: Debt[] = []) {
  let totalInvested = 0;
  let totalCurrent = 0;

  for (const inv of investments) {
    const baseInvested = inv.initialValue + inv.previouslyInvested;
    const start = new Date(inv.startDate);
    const now = new Date();
    const months = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
    const manualTotal = inv.contributions.reduce((sum, c) => sum + c.amount, 0);

    totalInvested += baseInvested + inv.monthlyContribution * months + manualTotal;
    totalCurrent += getCurrentValue(inv);
  }

  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    totalCurrent: Math.round(totalCurrent * 100) / 100,
    totalProfit: Math.round((totalCurrent - totalInvested) * 100) / 100,
  };
}

export function simulateUntilDate(investment: Investment, targetDate: string): GrowthDataPoint {
  const start = new Date(investment.startDate);
  const target = new Date(targetDate);
  const months = Math.max(0, (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth()));
  const data = calculateGrowth(investment, months);
  return data[data.length - 1];
}

// Global simulation across all investments and debts
export function simulateGlobalUntilDate(investments: Investment[], debts: Debt[], targetDate: string) {
  let totalInvested = 0;
  let totalValue = 0;
  const totalMonthlyDebts = debts.reduce((sum, d) => sum + d.monthlyAmount, 0);

  for (const inv of investments) {
    const result = simulateUntilDate(inv, targetDate);
    totalInvested += result.invested;
    totalValue += result.total;
  }

  const start = new Date(investments[0]?.startDate || new Date().toISOString());
  const target = new Date(targetDate);
  const months = Math.max(0, (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth()));
  const totalDebtsPaid = totalMonthlyDebts * months;

  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    totalValue: Math.round(totalValue * 100) / 100,
    totalProfit: Math.round((totalValue - totalInvested) * 100) / 100,
    totalDebtsPaid: Math.round(totalDebtsPaid * 100) / 100,
    netProfit: Math.round((totalValue - totalInvested - totalDebtsPaid) * 100) / 100,
  };
}
