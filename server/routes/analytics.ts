import { Router, Request, Response } from 'express';
import { getAllSessionsForAnalytics, getAllTradesForAnalytics } from '../db.js';
import type { SessionRow, TradeRow } from '../db.js';

const router = Router();
const ACCOUNT_BASELINE = 5000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Extract the hour (0–23) from an ISO-ish timestamp string */
function extractHour(timestamp: string | null): number | null {
  if (!timestamp) return null;
  // Handles "2026-03-13T09:04:39" and "2026-03-13 09:04:39"
  const m = timestamp.match(/T?(\d{2}):\d{2}:\d{2}/);
  return m ? parseInt(m[1], 10) : null;
}

// ─── GET /api/analytics ───────────────────────────────────────────────────────
router.get('/', (_req: Request, res: Response) => {
  try {
    const sessions: SessionRow[] = getAllSessionsForAnalytics();
    const trades: TradeRow[] = getAllTradesForAnalytics();
    res.json(buildAnalyticsPayload(sessions, trades, ACCOUNT_BASELINE));
  } catch (err) {
    console.error('[GET /analytics]', err);
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
});

export function buildAnalyticsPayload(
  sessions: SessionRow[],
  trades: TradeRow[],
  startingBalance = ACCOUNT_BASELINE
) {
  let runningBalance = startingBalance;

  const equityCurve = sessions.map((session) => {
    runningBalance += session.net_pnl;
    return {
      date: session.date,
      balance: round2(runningBalance),
      netPnl: round2(session.net_pnl),
    };
  });

  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.net_pnl > 0).length;
  const losses = trades.filter((t) => t.net_pnl < 0).length;
  const breakeven = totalTrades - wins - losses;
  const winRate = totalTrades > 0 ? round2((wins / totalTrades) * 100) : 0;

  const dailyPnl = sessions.map((session) => ({
    date: session.date,
    netPnl: round2(session.net_pnl),
    grossPnl: round2(session.gross_pnl),
  }));

  const winPnls = trades.filter((t) => t.net_pnl > 0).map((t) => t.net_pnl);
  const lossPnls = trades.filter((t) => t.net_pnl < 0).map((t) => t.net_pnl);
  const avgWin = winPnls.length > 0 ? round2(winPnls.reduce((sum, value) => sum + value, 0) / winPnls.length) : 0;
  const avgLoss = lossPnls.length > 0 ? round2(lossPnls.reduce((sum, value) => sum + value, 0) / lossPnls.length) : 0;
  const totalWinAmount = winPnls.reduce((sum, value) => sum + value, 0);
  const totalLossAmount = Math.abs(lossPnls.reduce((sum, value) => sum + value, 0));
  const profitFactor = totalLossAmount > 0 ? round2(totalWinAmount / totalLossAmount) : totalWinAmount > 0 ? Infinity : 0;

  let maxDrawdown = 0;
  let maxDrawdownDate = '';
  let peak = equityCurve.length > 0 ? equityCurve[0].balance : startingBalance;

  for (const point of equityCurve) {
    if (point.balance > peak) peak = point.balance;
    const drawdown = peak - point.balance;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownDate = point.date;
    }
  }

  const pnlDistribution = buildHistogram(trades.map((t) => t.net_pnl), 10);

  const hourMap = new Map<number, { totalPnl: number; tradeCount: number }>();
  for (const trade of trades) {
    const hour = extractHour(trade.entry_time);
    if (hour === null) continue;
    const existing = hourMap.get(hour) ?? { totalPnl: 0, tradeCount: 0 };
    existing.totalPnl += trade.net_pnl;
    existing.tradeCount += 1;
    hourMap.set(hour, existing);
  }

  const timeHeatmap = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    totalPnl: round2(hourMap.get(hour)?.totalPnl ?? 0),
    tradeCount: hourMap.get(hour)?.tradeCount ?? 0,
  }));

  const { currentStreak, longestWinStreak, longestLossStreak } = calcStreaks(trades);

  return {
    equityCurve,
    winRateStats: {
      totalTrades,
      wins,
      losses,
      breakeven,
      winRate,
    },
    dailyPnl,
    tradeStats: {
      avgWin,
      avgLoss,
      profitFactor,
      maxDrawdown: round2(maxDrawdown),
      maxDrawdownDate,
      totalSessions: sessions.length,
      totalTrades,
      wins,
      losses,
      breakeven,
      winRate,
    },
    pnlDistribution,
    timeHeatmap,
    streaks: {
      current: currentStreak,
      longestWin: longestWinStreak,
      longestLoss: longestLossStreak,
    },
  };
}

// ─── Histogram builder ────────────────────────────────────────────────────────

function buildHistogram(values: number[], bucketCount: number): Array<{ range: string; count: number; min: number; max: number }> {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return [{ range: `${round2(min)}`, count: values.length, min, max }];
  }

  const bucketSize = (max - min) / bucketCount;
  const buckets: Array<{ range: string; count: number; min: number; max: number }> = [];

  for (let i = 0; i < bucketCount; i++) {
    const lo = min + i * bucketSize;
    const hi = lo + bucketSize;
    const count = values.filter((v) => v >= lo && (i === bucketCount - 1 ? v <= hi : v < hi)).length;
    buckets.push({
      range: `${round2(lo)} to ${round2(hi)}`,
      count,
      min: round2(lo),
      max: round2(hi),
    });
  }

  return buckets;
}

// ─── Streak calculator ────────────────────────────────────────────────────────

function calcStreaks(trades: TradeRow[]): {
  currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
  longestWinStreak: number;
  longestLossStreak: number;
} {
  if (trades.length === 0) {
    return {
      currentStreak: { type: 'none', count: 0 },
      longestWinStreak: 0,
      longestLossStreak: 0,
    };
  }

  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWin = 0;
  let currentLoss = 0;

  for (const trade of trades) {
    if (trade.net_pnl > 0) {
      currentWin += 1;
      currentLoss = 0;
      if (currentWin > longestWinStreak) longestWinStreak = currentWin;
    } else if (trade.net_pnl < 0) {
      currentLoss += 1;
      currentWin = 0;
      if (currentLoss > longestLossStreak) longestLossStreak = currentLoss;
    } else {
      currentWin = 0;
      currentLoss = 0;
    }
  }

  // Current streak is determined by the last sequence of results
  const lastTrade = trades[trades.length - 1];
  let currentStreak: { type: 'win' | 'loss' | 'none'; count: number };

  if (lastTrade.net_pnl > 0) {
    currentStreak = { type: 'win', count: currentWin };
  } else if (lastTrade.net_pnl < 0) {
    currentStreak = { type: 'loss', count: currentLoss };
  } else {
    currentStreak = { type: 'none', count: 0 };
  }

  return { currentStreak, longestWinStreak, longestLossStreak };
}

export default router;
