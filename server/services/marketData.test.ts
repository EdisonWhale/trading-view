/* @vitest-environment node */

import { describe, expect, it } from 'vitest';
import { aggregateBars, getHistoryWindow, splitFetchWindows } from './marketData';

describe('aggregateBars', () => {
  it('rolls 1m bars into larger windows using first open, last close, high, low, and summed volume', () => {
    const bars = [
      { time: '2026-03-13T14:00:00Z', open: 100, high: 101, low: 99, close: 100.5, volume: 10 },
      { time: '2026-03-13T14:01:00Z', open: 100.5, high: 102, low: 100, close: 101.5, volume: 12 },
      { time: '2026-03-13T14:02:00Z', open: 101.5, high: 103, low: 101, close: 102.5, volume: 8 },
      { time: '2026-03-13T14:03:00Z', open: 102.5, high: 104, low: 102, close: 103.5, volume: 7 },
      { time: '2026-03-13T14:04:00Z', open: 103.5, high: 105, low: 103, close: 104.5, volume: 9 },
    ];

    expect(aggregateBars(bars, '5m')).toEqual([
      {
        time: '2026-03-13T14:00:00Z',
        open: 100,
        high: 105,
        low: 99,
        close: 104.5,
        volume: 46,
      },
    ]);
  });
});

describe('getHistoryWindow', () => {
  it('returns trailing continuous history windows instead of single-session windows', () => {
    expect(getHistoryWindow('2026-03-13', '1m')).toEqual({
      start: '2026-03-07T00:00:00Z',
      end: '2026-03-14T00:00:00Z',
    });

    expect(getHistoryWindow('2026-03-13', '5m')).toEqual({
      start: '2026-01-23T00:00:00Z',
      end: '2026-03-14T00:00:00Z',
    });

    expect(getHistoryWindow('2026-03-13', '1h')).toEqual({
      start: '2024-04-13T00:00:00Z',
      end: '2026-03-14T00:00:00Z',
    });

    expect(getHistoryWindow('2026-03-13', '1d')).toEqual({
      start: '2021-03-15T00:00:00Z',
      end: '2026-03-14T00:00:00Z',
    });
  });
});

describe('splitFetchWindows', () => {
  it('splits 1m requests into Yahoo-compatible 8 day windows', () => {
    expect(splitFetchWindows('1m', '2026-02-12T00:00:00Z', '2026-03-14T00:00:00Z')).toEqual([
      { start: '2026-02-12T00:00:00Z', end: '2026-02-20T00:00:00Z' },
      { start: '2026-02-20T00:00:00Z', end: '2026-02-28T00:00:00Z' },
      { start: '2026-02-28T00:00:00Z', end: '2026-03-08T00:00:00Z' },
      { start: '2026-03-08T00:00:00Z', end: '2026-03-14T00:00:00Z' },
    ]);
  });

  it('keeps larger timeframes as a single request window', () => {
    expect(splitFetchWindows('1d', '2021-03-15T00:00:00Z', '2026-03-14T00:00:00Z')).toEqual([
      { start: '2021-03-15T00:00:00Z', end: '2026-03-14T00:00:00Z' },
    ]);
  });
});
