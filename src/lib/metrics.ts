import type { SetupPerformance, TradingDay } from './types';

interface Summary {
  totalPnl: number;
  netDeposits: number;
  endingBalance: number;
  winRate: number;
  maxDrawdown: number;
  ruleBreakCount: number;
  complianceScore: number;
  bestSetup: SetupPerformance | null;
}

export function buildDashboardSummary(days: TradingDay[]): Summary {
  const totalPnl = round(days.reduce((sum, day) => sum + day.realizedPnl, 0));
  const netDeposits = round(days.reduce((sum, day) => sum + day.deposits, 0));
  const endingBalance = days[days.length - 1]?.endBalance ?? 0;

  const activeDays = days.filter((day) => day.realizedPnl !== 0);
  const wins = activeDays.filter((day) => day.realizedPnl > 0).length;
  const winRate = activeDays.length === 0 ? 0 : round((wins / activeDays.length) * 100);

  const maxDrawdown = calculateMaxDrawdown(days);
  const ruleBreakCount = days.reduce((sum, day) => sum + day.ruleBreaks.length, 0);
  const complianceScore = Math.max(0, 100 - ruleBreakCount * 12);
  const bestSetup = pickBestSetup(days);

  return {
    totalPnl,
    netDeposits,
    endingBalance,
    winRate,
    maxDrawdown,
    ruleBreakCount,
    complianceScore,
    bestSetup,
  };
}

function calculateMaxDrawdown(days: TradingDay[]): number {
  let peak = 0;
  let maxDrawdown = 0;

  for (const day of days) {
    peak = Math.max(peak, day.endBalance);
    maxDrawdown = Math.max(maxDrawdown, peak - day.endBalance);
  }

  return round(maxDrawdown);
}

function pickBestSetup(days: TradingDay[]): SetupPerformance | null {
  const merged = new Map<string, SetupPerformance>();

  for (const day of days) {
    for (const setup of day.setups) {
      const current = merged.get(setup.name);
      if (current) {
        current.trades += setup.trades;
        current.wins += setup.wins;
        current.pnl = round(current.pnl + setup.pnl);
      } else {
        merged.set(setup.name, { ...setup });
      }
    }
  }

  return [...merged.values()].sort((left, right) => right.pnl - left.pnl)[0] ?? null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
