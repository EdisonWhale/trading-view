import { Router, Request, Response } from 'express';
import { getAllSessionsForAnalytics, getAllTradesForAnalytics } from '../db.js';
import type { SessionRow, TradeRow } from '../db.js';

const router = Router();
const ACCOUNT_BASELINE = 5000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isWinningTrade(trade: TradeRow): boolean {
  return trade.gross_pnl > 0;
}

function isLosingTrade(trade: TradeRow): boolean {
  return trade.gross_pnl < 0;
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
  const wins = trades.filter(isWinningTrade).length;
  const losses = trades.filter(isLosingTrade).length;
  const breakeven = totalTrades - wins - losses;
  const winRate = totalTrades > 0 ? round2((wins / totalTrades) * 100) : 0;

  const dailyPnl = sessions.map((session) => ({
    date: session.date,
    netPnl: round2(session.net_pnl),
    grossPnl: round2(session.gross_pnl),
  }));

  const winPnls = trades.filter(isWinningTrade).map((t) => t.net_pnl);
  const lossPnls = trades.filter(isLosingTrade).map((t) => t.net_pnl);
  const avgWin = winPnls.length > 0 ? round2(winPnls.reduce((sum, value) => sum + value, 0) / winPnls.length) : 0;
  const avgLoss = lossPnls.length > 0 ? round2(lossPnls.reduce((sum, value) => sum + value, 0) / lossPnls.length) : 0;
  const totalWinAmount = winPnls.reduce((sum, value) => sum + value, 0);
  const totalLossAmount = Math.abs(lossPnls.reduce((sum, value) => sum + value, 0));
  const profitFactor = totalLossAmount > 0 ? round2(totalWinAmount / totalLossAmount) : totalWinAmount > 0 ? Infinity : 0;
  const maxWin = winPnls.length > 0 ? round2(Math.max(...winPnls)) : 0;
  const maxLoss = lossPnls.length > 0 ? round2(Math.min(...lossPnls)) : 0;
  const totalCommissions = round2(sessions.reduce(
    (sum, s) => sum + (Number(s.trading_fees ?? s.commissions) || 0),
    0,
  ));
  const totalNetPnl = round2(sessions.reduce((sum, s) => sum + (Number(s.net_pnl) || 0), 0));

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

  const tradeScatter = trades
    .filter((trade) => trade.entry_time)
    .map((trade) => ({
      entryTime: trade.entry_time as string,
      netPnl: round2(trade.net_pnl),
      qty: trade.qty,
      direction: trade.direction ?? 'unknown',
      durationSeconds: trade.duration_seconds,
    }));

  // ── Direction split stats ──────────────────────────────────────────────────
  function calcDirectionStats(subset: TradeRow[]) {
    const w = subset.filter(isWinningTrade);
    const l = subset.filter(isLosingTrade);
    const totalPnl = round2(subset.reduce((s, t) => s + t.net_pnl, 0));
    const winRate = subset.length > 0 ? round2((w.length / subset.length) * 100) : 0;
    const avgWin = w.length > 0 ? round2(w.reduce((s, t) => s + t.net_pnl, 0) / w.length) : 0;
    const avgLoss = l.length > 0 ? round2(l.reduce((s, t) => s + t.net_pnl, 0) / l.length) : 0;
    const avgDuration = subset.length > 0
      ? round2(subset.reduce((s, t) => s + t.duration_seconds, 0) / subset.length)
      : 0;
    return { count: subset.length, wins: w.length, losses: l.length, winRate, totalPnl, avgWin, avgLoss, avgDuration };
  }

  const longTrades = trades.filter((t) => t.direction === 'long');
  const shortTrades = trades.filter((t) => t.direction === 'short');
  const directionStats = {
    long: calcDirectionStats(longTrades),
    short: calcDirectionStats(shortTrades),
  };

  // ── Duration stats ─────────────────────────────────────────────────────────
  const winTrades = trades.filter(isWinningTrade);
  const lossTrades = trades.filter(isLosingTrade);
  const allDurations = trades.map((t) => t.duration_seconds);
  const durationStats = {
    avgDuration:    trades.length > 0 ? round2(allDurations.reduce((s, v) => s + v, 0) / trades.length) : 0,
    avgWinDuration: winTrades.length > 0 ? round2(winTrades.reduce((s, t) => s + t.duration_seconds, 0) / winTrades.length) : 0,
    avgLossDuration: lossTrades.length > 0 ? round2(lossTrades.reduce((s, t) => s + t.duration_seconds, 0) / lossTrades.length) : 0,
    maxDuration:    allDurations.length > 0 ? Math.max(...allDurations) : 0,
    minDuration:    allDurations.length > 0 ? Math.min(...allDurations) : 0,
  };

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
      maxWin,
      maxLoss,
      totalCommissions,
      totalNetPnl,
    },
    pnlDistribution,
    timeHeatmap,
    tradeScatter,
    directionStats,
    durationStats,
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
    if (isWinningTrade(trade)) {
      currentWin += 1;
      currentLoss = 0;
      if (currentWin > longestWinStreak) longestWinStreak = currentWin;
    } else if (isLosingTrade(trade)) {
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

  if (isWinningTrade(lastTrade)) {
    currentStreak = { type: 'win', count: currentWin };
  } else if (isLosingTrade(lastTrade)) {
    currentStreak = { type: 'loss', count: currentLoss };
  } else {
    currentStreak = { type: 'none', count: 0 };
  }

  return { currentStreak, longestWinStreak, longestLossStreak };
}

export default router;
