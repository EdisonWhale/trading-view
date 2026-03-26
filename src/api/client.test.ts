/* @vitest-environment node */

import { describe, expect, it } from 'vitest';
import { normalizeSessionDetail, normalizeSessionSummary } from './client';

describe('session api normalizers', () => {
  it('maps session summaries from snake_case to camelCase', () => {
    const summary = normalizeSessionSummary({
      date: '2026-03-13',
      instrument: 'MESH6',
      instrument_name: 'Micro E-mini S&P 500',
      net_pnl: -447.06,
      trade_count: 8,
    });

    expect(summary).toEqual({
      date: '2026-03-13',
      instrument: 'MESH6',
      instrumentName: 'Micro E-mini S&P 500',
      netPnl: -447.06,
      tradeCount: 8,
    });
  });

  it('maps session detail payloads, including fills and trades, to frontend types', () => {
    const detail = normalizeSessionDetail({
      session: {
        date: '2026-03-13',
        instrument: 'MESH6',
        instrument_name: 'Micro E-mini S&P 500',
        beginning_balance: 5212.64,
        ending_balance: 4765.58,
        gross_pnl: -432.5,
        commissions: 14.56,
        net_pnl: -447.06,
        realized_net_pnl: -447.06,
        open_trade_equity_change: 0,
        ending_open_trade_equity: 0,
        trade_count: 8,
        created_at: '2026-03-15T00:00:00',
        updated_at: '2026-03-15T00:00:00',
      },
      fills: [
        {
          id: 1,
          session_date: '2026-03-13',
          timestamp: '2026-03-13T14:04:39',
          side: 'sell',
          qty: 1,
          price: 6715,
          order_id: '1246790783',
        },
      ],
      trades: [
        {
          id: 1,
          session_date: '2026-03-13',
          instrument: 'MESH6',
          direction: 'short',
          entry_time: '2026-03-13T14:04:39',
          entry_price: 6715,
          exit_time: '2026-03-13T14:20:27',
          exit_price: 6702.5,
          qty: 1,
          gross_pnl: 62.5,
          commission: 1.82,
          net_pnl: 60.68,
          duration_seconds: 948,
          annotation: null,
        },
      ],
      open_positions: [
        {
          id: 9,
          session_date: '2026-03-13',
          instrument: 'MESH6',
          side: 'short',
          qty: 1,
          entry_time: '2026-03-13T20:41:35',
          entry_price: 6634.5,
          mark_time: '2026-03-13T20:59:59',
          mark_price: 6640.25,
          open_pnl: -28.75,
          order_id: '1248394071',
        },
      ],
      journal: {
        session_date: '2026-03-13',
        emotion_score: 7,
        energy_score: 8,
        execution_score: 6,
        market_regime: '趋势',
        premarket_notes: 'notes',
        review_summary: 'summary',
        what_worked: 'discipline',
        what_failed: 'late entry',
        next_focus: 'size down',
        rule_breaks: 'none',
        updated_at: '2026-03-15T00:00:00',
      },
    });

    expect(detail.session.tradeCount).toBe(8);
    expect(detail.session.netPnl).toBe(-447.06);
    expect((detail.session as any).realizedNetPnl).toBe(-447.06);
    expect(detail.fills[0].orderId).toBe('1246790783');
    expect(detail.trades[0].entryTime).toBe('2026-03-13T14:04:39');
    expect((detail as any).openPositions[0].openPnl).toBe(-28.75);
    expect(detail.journal?.emotionScore).toBe(7);
    expect(detail.journal?.whatWorked).toEqual(['discipline']);
    expect(detail.journal?.ruleBreaks).toEqual(['none']);
  });
});
