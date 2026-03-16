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
});
