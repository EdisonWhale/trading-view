/* @vitest-environment node */

import fs from 'fs';
import { describe, expect, it } from 'vitest';
import { parseNinjaTraderPDF } from './ninjatrader';

describe('parseNinjaTraderPDF', () => {
  it('parses a Daily Statement PDF into fills, trades, and pnl totals', async () => {
    const pdfPath = new URL('../../docs/pdfs/1326506_Daily_20260313.pdf', import.meta.url);
    const buffer = fs.readFileSync(pdfPath);

    const result = await parseNinjaTraderPDF(buffer);

    expect(result.date).toBe('2026-03-13');
    expect(result.instrument).toBe('MESH6');
    expect(result.instrumentName).toBe('Micro E-mini S&P 500');
    expect(result.beginningBalance).toBeCloseTo(5212.64, 2);
    expect(result.endingBalance).toBeCloseTo(4765.58, 2);
    expect(result.grossPnl).toBeCloseTo(-432.5, 2);
    expect(result.commissions).toBeCloseTo(14.56, 2);
    expect(result.netPnl).toBeCloseTo(-447.06, 2);
    expect(result.fills).toHaveLength(13);
    expect(result.trades).toHaveLength(8);
    expect(result.fills[0].timestamp.endsWith('Z')).toBe(true);
    expect(result.trades[0].entry_time.endsWith('Z')).toBe(true);
    expect(result.trades[0].exit_time.endsWith('Z')).toBe(true);
  });

  it('parses multi-instrument statements with instrument-specific multipliers', async () => {
    const pdfPath = new URL('../../docs/pdfs/1326506_Daily_20260311.pdf', import.meta.url);
    const buffer = fs.readFileSync(pdfPath);

    const result = await parseNinjaTraderPDF(buffer);

    expect(result.date).toBe('2026-03-11');
    expect(result.instrument).toBe('MESH6');
    expect(result.grossPnl).toBeCloseTo(249.75, 2);
    expect(result.commissions).toBeCloseTo(21.84, 2);
    expect(result.netPnl).toBeCloseTo(227.91, 2);
    expect(new Set(result.trades.map((trade) => trade.instrument))).toEqual(new Set(['MESH6', 'MNQH6']));
  });

  it('excludes ACH deposits from session net pnl', async () => {
    const pdfPath = new URL('../../docs/pdfs/1326506_Daily_20260312.pdf', import.meta.url);
    const buffer = fs.readFileSync(pdfPath);

    const result = await parseNinjaTraderPDF(buffer);

    expect(result.date).toBe('2026-03-12');
    expect(result.grossPnl).toBeCloseTo(-3.75, 2);
    expect(result.commissions).toBeCloseTo(14.56, 2);
    expect(result.netPnl).toBeCloseTo(-18.31, 2);
  });

  it('keeps no-trade funding days at zero trading pnl', async () => {
    const pdfPath = new URL('../../docs/pdfs/1326506_Daily_20260309.pdf', import.meta.url);
    const buffer = fs.readFileSync(pdfPath);

    const result = await parseNinjaTraderPDF(buffer);

    expect(result.date).toBe('2026-03-09');
    expect(result.grossPnl).toBe(0);
    expect(result.commissions).toBe(0);
    expect(result.netPnl).toBe(0);
    expect(result.fills).toHaveLength(0);
    expect(result.trades).toHaveLength(0);
  });

  it('keeps open-position fills separate from closed trades across instruments', async () => {
    const pdfPath = new URL('../../docs/pdfs/1326506_Daily_20260316.pdf', import.meta.url);
    const buffer = fs.readFileSync(pdfPath);

    const result = await parseNinjaTraderPDF(buffer);

    expect(result.date).toBe('2026-03-16');
    expect(result.beginningBalance).toBeCloseTo(4765.58, 2);
    expect(result.endingBalance).toBeCloseTo(4569.1, 2);
    expect(result.grossPnl).toBeCloseTo(-193.75, 2);
    expect(result.commissions).toBeCloseTo(2.73, 2);
    expect(result.netPnl).toBeCloseTo(-196.48, 2);
    expect(result.fills).toHaveLength(3);
    expect(result.fills.map((fill) => fill.instrument)).toEqual(['MESH6', 'MESM6', 'MESM6']);
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({
      instrument: 'MESM6',
      direction: 'short',
      qty: 1,
      gross_pnl: 17.5,
    });
    expect((result as any).realizedNetPnl).toBeCloseTo(14.77, 2);
    expect((result as any).openTradeEquityChange).toBeCloseTo(-211.25, 2);
    expect((result as any).endingOpenTradeEquity).toBeCloseTo(-211.25, 2);
    expect((result as any).openPositions).toEqual([
      expect.objectContaining({
        instrument: 'MESH6',
        side: 'short',
        qty: 1,
        entry_price: 6662.5,
        mark_price: 6704.75,
        open_pnl: -211.25,
      }),
    ]);
  });

  it('uses beginning-of-period positions as carry-ins when pairing the next session', async () => {
    const pdfPath = new URL('../../docs/pdfs/1326506_Daily_20260317.pdf', import.meta.url);
    const buffer = fs.readFileSync(pdfPath);

    const result = await parseNinjaTraderPDF(buffer);

    expect(result.date).toBe('2026-03-17');
    expect(result.grossPnl).toBeCloseTo(-362, 2);
    expect(result.commissions).toBeCloseTo(6.37, 2);
    expect(result.netPnl).toBeCloseTo(-368.37, 2);
    expect(result.trades).toHaveLength(4);
    expect(result.trades.map((trade) => ({
      instrument: trade.instrument,
      direction: trade.direction,
      gross: trade.gross_pnl,
    }))).toEqual([
      { instrument: 'MESH6', direction: 'short', gross: -75 },
      { instrument: 'MESM6', direction: 'short', gross: -293.75 },
      { instrument: 'MNQH6', direction: 'short', gross: -162 },
      { instrument: 'MESH6', direction: 'short', gross: -42.5 },
    ]);
    expect((result as any).openPositions).toEqual([]);
  });

  it('closes beginning-of-period positions before counting new same-day trades', async () => {
    const pdfPath = new URL('../../docs/pdfs/1326506_Daily_20260325.pdf', import.meta.url);
    const buffer = fs.readFileSync(pdfPath);

    const result = await parseNinjaTraderPDF(buffer);

    expect(result.date).toBe('2026-03-25');
    expect(result.grossPnl).toBeCloseTo(165, 2);
    expect(result.commissions).toBeCloseTo(8.19, 2);
    expect(result.netPnl).toBeCloseTo(156.81, 2);
    expect(result.trades).toHaveLength(5);
    expect(result.trades.map((trade) => trade.gross_pnl)).toEqual([61.25, 113.75, 122.5, 36.25, 66.25]);
    expect((result as any).openPositions).toEqual([]);
  });
});
