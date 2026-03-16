/* @vitest-environment node */

import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  parseNinjaTraderPDF: vi.fn(),
  upsertSessionWithData: vi.fn(),
  getSessionFull: vi.fn(),
  getJournalBySession: vi.fn(),
  getTradeById: vi.fn(),
  getFillById: vi.fn(),
  upsertJournal: vi.fn(),
  deleteSession: vi.fn(),
  updateTradeAnnotation: vi.fn(),
  updateFillReason: vi.fn(),
  getSessionMarketData: vi.fn(),
}));

vi.mock('../db.js', () => ({
  upsertSessionWithData: mocks.upsertSessionWithData,
  listSessions: vi.fn(() => []),
  getSessionFull: mocks.getSessionFull,
  getJournalBySession: mocks.getJournalBySession,
  getTradeById: mocks.getTradeById,
  getFillById: mocks.getFillById,
  upsertJournal: mocks.upsertJournal,
  deleteSession: mocks.deleteSession,
  updateTradeAnnotation: mocks.updateTradeAnnotation,
  updateFillReason: mocks.updateFillReason,
}));

vi.mock('../parsers/ninjatrader.js', () => ({
  parseNinjaTraderPDF: mocks.parseNinjaTraderPDF,
}));

vi.mock('../services/marketData.js', () => ({
  getSessionMarketData: mocks.getSessionMarketData,
}));

import sessionsRouter, { fillRouter, tradeRouter } from './sessions';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/trades', tradeRouter);
  app.use('/api/fills', fillRouter);
  return app.listen(0);
}

const sessionDetail = {
  session: {
    date: '2026-03-13',
    instrument: 'MESH6',
    instrument_name: 'Micro E-mini S&P 500',
    beginning_balance: 5212.64,
    ending_balance: 4765.58,
    gross_pnl: -432.5,
    commissions: 14.56,
    net_pnl: -447.06,
    trade_count: 8,
    created_at: '2026-03-15T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
  },
  fills: [
    {
      id: 1,
      session_date: '2026-03-13',
      timestamp: '2026-03-13T14:04:39Z',
      side: 'sell',
      qty: 1,
      price: 6715,
      order_id: 'abc',
    },
  ],
  trades: [
    {
      id: 7,
      session_date: '2026-03-13',
      instrument: 'MESH6',
      direction: 'short',
      entry_time: '2026-03-13T14:04:39Z',
      entry_price: 6715,
      exit_time: '2026-03-13T14:20:27Z',
      exit_price: 6702.5,
      qty: 1,
      gross_pnl: 62.5,
      commission: 1.82,
      net_pnl: 60.68,
      duration_seconds: 948,
      annotation: 'Fade opening pop',
    },
  ],
  journal: {
    session_date: '2026-03-13',
    emotion_score: 7,
    energy_score: 8,
    execution_score: 6,
    market_regime: '趋势',
    premarket_notes: 'Wait for range extension.',
    review_summary: 'Stayed patient.',
    what_worked: 'risk control',
    what_failed: 'late trim',
    next_focus: 'first pullback only',
    rule_breaks: 'none',
    updated_at: '2026-03-15T00:00:00Z',
  },
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('sessions routes', () => {
  it('returns full session detail after a PDF import succeeds', async () => {
    mocks.parseNinjaTraderPDF.mockResolvedValue({
      date: '2026-03-13',
      instrument: 'MESH6',
      instrumentName: 'Micro E-mini S&P 500',
      beginningBalance: 5212.64,
      endingBalance: 4765.58,
      grossPnl: -432.5,
      commissions: 14.56,
      netPnl: -447.06,
      fills: sessionDetail.fills.map((fill) => ({
        id: fill.id,
        session_date: fill.session_date,
        instrument: 'MESH6',
        timestamp: fill.timestamp,
        side: fill.side,
        qty: fill.qty,
        price: fill.price,
        order_id: fill.order_id,
      })),
      trades: sessionDetail.trades.map((trade) => ({
        session_date: trade.session_date,
        instrument: trade.instrument,
        direction: trade.direction,
        entry_time: trade.entry_time,
        entry_price: trade.entry_price,
        exit_time: trade.exit_time,
        exit_price: trade.exit_price,
        qty: trade.qty,
        gross_pnl: trade.gross_pnl,
        commission: trade.commission,
        net_pnl: trade.net_pnl,
        duration_seconds: trade.duration_seconds,
        annotation: trade.annotation,
      })),
    });
    mocks.getSessionFull.mockReturnValue(sessionDetail);

    const server = buildApp();
    const port = (server.address() as any).port;

    const form = new FormData();
    form.append('pdf', new Blob(['fake'], { type: 'application/pdf' }), 'statement.pdf');

    const response = await fetch(`http://127.0.0.1:${port}/api/sessions/import`, {
      method: 'POST',
      body: form,
    });
    const payload = await response.json();

    server.close();

    expect(response.status).toBe(201);
    expect(payload).toMatchObject({
      session: {
        date: '2026-03-13',
      },
      fills: expect.any(Array),
      trades: expect.any(Array),
    });
  });

  it('returns the saved journal entry after patching a session journal', async () => {
    mocks.getJournalBySession.mockReturnValue(sessionDetail.journal);

    const server = buildApp();
    const port = (server.address() as any).port;

    const response = await fetch(`http://127.0.0.1:${port}/api/sessions/2026-03-13/journal`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emotion_score: 7,
        energy_score: 8,
        execution_score: 6,
        market_regime: '趋势',
      }),
    });
    const payload = await response.json();

    server.close();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      session_date: '2026-03-13',
      emotion_score: 7,
      energy_score: 8,
      execution_score: 6,
    });
  });

  it('returns the updated trade after saving an annotation', async () => {
    mocks.getTradeById.mockReturnValue(sessionDetail.trades[0]);

    const server = buildApp();
    const port = (server.address() as any).port;

    const response = await fetch(`http://127.0.0.1:${port}/api/trades/7`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annotation: 'Fade opening pop' }),
    });
    const payload = await response.json();

    server.close();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      id: 7,
      annotation: 'Fade opening pop',
      entry_time: expect.any(String),
      exit_time: expect.any(String),
    });
  });

  it('returns session market replay data for the requested timeframe', async () => {
    mocks.getSessionMarketData.mockResolvedValue({
      symbol: 'ES=F',
      timeframe: '1m',
      source: 'yahoo',
      note: null,
      bars: [
        {
          time: '2026-03-13T14:00:00Z',
          open: 5600,
          high: 5601,
          low: 5599.5,
          close: 5600.5,
          volume: 100,
        },
      ],
      fills: sessionDetail.fills,
    });

    const server = buildApp();
    const port = (server.address() as any).port;

    const response = await fetch(`http://127.0.0.1:${port}/api/sessions/2026-03-13/market?timeframe=1m`);
    const payload = await response.json();

    server.close();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      symbol: 'ES=F',
      timeframe: '1m',
      bars: expect.any(Array),
      fills: expect.any(Array),
    });
  });

  it('returns the updated fill after saving a reason', async () => {
    mocks.getFillById.mockReturnValue({
      ...sessionDetail.fills[0],
      reason: 'Opening drive breakout after reclaim',
    });

    const server = buildApp();
    const port = (server.address() as any).port;

    const response = await fetch(`http://127.0.0.1:${port}/api/fills/1/reason`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Opening drive breakout after reclaim' }),
    });
    const payload = await response.json();

    server.close();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      id: 1,
      reason: 'Opening drive breakout after reclaim',
      timestamp: expect.any(String),
    });
  });
});
