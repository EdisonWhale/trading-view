/* @vitest-environment node */

import { describe, expect, it } from 'vitest';
import type { SessionRow, TradeRow } from '../db';
import { buildAnalyticsPayload } from './analytics';

const sessions: SessionRow[] = [
  {
    date: '2026-03-09',
    instrument: '',
    instrument_name: 'Unknown',
    beginning_balance: 0,
    ending_balance: 3000,
    gross_pnl: 0,
    commissions: 0,
    net_pnl: 0,
    trade_count: 0,
    created_at: '',
    updated_at: '',
  },
  {
    date: '2026-03-10',
    instrument: 'MESH6',
    instrument_name: 'Micro E-mini S&P 500',
    beginning_balance: 3000,
    ending_balance: 3003.04,
    gross_pnl: 12.5,
    commissions: 9.46,
    net_pnl: 3.04,
    trade_count: 3,
    created_at: '',
    updated_at: '',
  },
  {
    date: '2026-03-11',
    instrument: 'MESH6',
    instrument_name: 'Micro E-mini S&P 500',
    beginning_balance: 3003.04,
    ending_balance: 3230.95,
    gross_pnl: 249.75,
    commissions: 21.84,
    net_pnl: 227.91,
    trade_count: 12,
    created_at: '',
    updated_at: '',
  },
  {
    date: '2026-03-12',
    instrument: 'MESH6',
    instrument_name: 'Micro E-mini S&P 500',
    beginning_balance: 3230.95,
    ending_balance: 5212.64,
    gross_pnl: -3.75,
    commissions: 14.56,
    net_pnl: -18.31,
    trade_count: 8,
    created_at: '',
    updated_at: '',
  },
  {
    date: '2026-03-13',
    instrument: 'MESH6',
    instrument_name: 'Micro E-mini S&P 500',
    beginning_balance: 5212.64,
    ending_balance: 4765.58,
    gross_pnl: -432.5,
    commissions: 14.56,
    net_pnl: -447.06,
    trade_count: 8,
    created_at: '',
    updated_at: '',
  },
];

const trades: TradeRow[] = [
  {
    id: 1,
    session_date: '2026-03-10',
    instrument: 'MESH6',
    direction: 'long',
    entry_time: '2026-03-10T15:00:00',
    entry_price: 0,
    exit_time: '2026-03-10T15:05:00',
    exit_price: 0,
    qty: 1,
    gross_pnl: 12.5,
    commission: 3.15,
    net_pnl: 9.35,
    duration_seconds: 300,
    annotation: null,
  },
  {
    id: 2,
    session_date: '2026-03-11',
    instrument: 'MNQH6',
    direction: 'short',
    entry_time: '2026-03-11T14:00:00',
    entry_price: 0,
    exit_time: '2026-03-11T14:02:00',
    exit_price: 0,
    qty: 1,
    gross_pnl: 8.5,
    commission: 1.44,
    net_pnl: 7.06,
    duration_seconds: 120,
    annotation: null,
  },
  {
    id: 3,
    session_date: '2026-03-12',
    instrument: 'MESH6',
    direction: 'long',
    entry_time: '2026-03-12T14:45:00',
    entry_price: 0,
    exit_time: '2026-03-12T14:50:00',
    exit_price: 0,
    qty: 1,
    gross_pnl: -3.75,
    commission: 1.82,
    net_pnl: -5.57,
    duration_seconds: 300,
    annotation: null,
  },
  {
    id: 4,
    session_date: '2026-03-13',
    instrument: 'MESH6',
    direction: 'short',
    entry_time: '2026-03-13T14:04:39',
    entry_price: 0,
    exit_time: '2026-03-13T14:20:27',
    exit_price: 0,
    qty: 1,
    gross_pnl: 62.5,
    commission: 1.82,
    net_pnl: 60.68,
    duration_seconds: 948,
    annotation: null,
  },
];

describe('buildAnalyticsPayload', () => {
  it('returns camelCase analytics fields and starts equity from 5000', () => {
    const payload = buildAnalyticsPayload(sessions, trades, 5000);

    expect(payload.equityCurve.map((point) => point.balance)).toEqual([
      5000,
      5003.04,
      5230.95,
      5212.64,
      4765.58,
    ]);
    expect(payload.tradeStats.totalTrades).toBe(4);
    expect(payload.tradeStats.winRate).toBe(75);
    expect(payload.tradeStats.avgWin).toBeCloseTo(25.7, 2);
    expect(payload.tradeStats.avgLoss).toBeCloseTo(-5.57, 2);
    expect(payload.tradeStats.maxDrawdown).toBeCloseTo(465.37, 2);
    expect(payload.tradeStats.maxDrawdownDate).toBe('2026-03-13');
    expect(payload.timeHeatmap[14]).toEqual({
      hour: 14,
      totalPnl: 62.17,
      tradeCount: 3,
    });
  });

  it('returns trade-level scatter points from real trades', () => {
    const payload = buildAnalyticsPayload(sessions, trades, 5000);

    expect(payload.tradeScatter).toEqual([
      { entryTime: '2026-03-10T15:00:00', netPnl: 9.35, qty: 1, direction: 'long', durationSeconds: 300 },
      { entryTime: '2026-03-11T14:00:00', netPnl: 7.06, qty: 1, direction: 'short', durationSeconds: 120 },
      { entryTime: '2026-03-12T14:45:00', netPnl: -5.57, qty: 1, direction: 'long', durationSeconds: 300 },
      { entryTime: '2026-03-13T14:04:39', netPnl: 60.68, qty: 1, direction: 'short', durationSeconds: 948 },
    ]);
  });
});
