import { getFillsInRange, getMarketBarsInRange, type FillRow, type MarketBarRow, upsertMarketBars } from '../db.js';

export type MarketTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface ReplayBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SessionMarketData {
  symbol: string;
  timeframe: MarketTimeframe;
  source: string;
  note: string | null;
  bars: ReplayBar[];
  fills: FillRow[];
}

const YAHOO_SYMBOL = 'ES=F';
const SOURCE = 'yahoo-finance';
const DAY_MS = 24 * 60 * 60 * 1000;
const FIVE_YEARS_DAYS = 365 * 5;
const YAHOO_1M_MAX_WINDOW_DAYS = 8;

function timeframeToBucketMs(timeframe: Exclude<MarketTimeframe, '1m'>): number {
  switch (timeframe) {
    case '5m':
      return 5 * 60 * 1000;
    case '15m':
      return 15 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '4h':
      return 4 * 60 * 60 * 1000;
    case '1d':
      return DAY_MS;
  }
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().replace('.000Z', 'Z');
}

export function getHistoryWindow(sessionDate: string, timeframe: MarketTimeframe): { start: string; end: string } {
  const endMs = Date.parse(`${sessionDate}T00:00:00Z`) + DAY_MS;

  switch (timeframe) {
    case '1m':
      return { start: toIso(endMs - 7 * DAY_MS), end: toIso(endMs) };
    case '5m':
    case '15m':
      return { start: toIso(endMs - 50 * DAY_MS), end: toIso(endMs) };
    case '1h':
      return { start: toIso(endMs - 700 * DAY_MS), end: toIso(endMs) };
    case '4h':
      return { start: toIso(endMs - 700 * DAY_MS), end: toIso(endMs) };
    case '1d':
      return { start: toIso(endMs - FIVE_YEARS_DAYS * DAY_MS), end: toIso(endMs) };
  }
}

function getYahooInterval(timeframe: MarketTimeframe): Exclude<MarketTimeframe, '4h'> {
  return timeframe === '4h' ? '1h' : timeframe;
}

export function splitFetchWindows(
  timeframe: Exclude<MarketTimeframe, '4h'>,
  start: string,
  end: string,
): Array<{ start: string; end: string }> {
  if (timeframe !== '1m') {
    return [{ start, end }];
  }

  const windows: Array<{ start: string; end: string }> = [];
  const endMs = Date.parse(end);
  let cursor = Date.parse(start);

  while (cursor < endMs) {
    const next = Math.min(cursor + YAHOO_1M_MAX_WINDOW_DAYS * DAY_MS, endMs);
    windows.push({ start: toIso(cursor), end: toIso(next) });
    cursor = next;
  }

  return windows;
}

function fromRows(rows: MarketBarRow[]): ReplayBar[] {
  return rows.map((row) => ({
    time: row.bar_time,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
  }));
}

function toRows(bars: ReplayBar[], timeframe: string): MarketBarRow[] {
  return bars.map((bar) => ({
    symbol: YAHOO_SYMBOL,
    timeframe,
    bar_time: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
    source: SOURCE,
  }));
}

export function aggregateBars(bars: ReplayBar[], timeframe: Exclude<MarketTimeframe, '1m'>): ReplayBar[] {
  if (bars.length === 0) return [];
  const bucketMs = timeframeToBucketMs(timeframe);
  const grouped = new Map<number, ReplayBar[]>();

  for (const bar of bars) {
    const bucket = Math.floor(Date.parse(bar.time) / bucketMs) * bucketMs;
    const current = grouped.get(bucket) ?? [];
    current.push(bar);
    grouped.set(bucket, current);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, group]) => ({
      time: toIso(bucket),
      open: group[0].open,
      high: Math.max(...group.map((bar) => bar.high)),
      low: Math.min(...group.map((bar) => bar.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, bar) => sum + (bar.volume ?? 0), 0),
    }));
}

async function fetchYahooBars(timeframe: Exclude<MarketTimeframe, '4h'>, start: string, end: string): Promise<ReplayBar[]> {
  const windows = splitFetchWindows(timeframe, start, end);
  const collected: ReplayBar[] = [];

  for (const window of windows) {
    const period1 = Math.floor(Date.parse(window.start) / 1000);
    const period2 = Math.floor(Date.parse(window.end) / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(YAHOO_SYMBOL)}?interval=${timeframe}&period1=${period1}&period2=${period2}&includePrePost=true`;
    const response = await fetch(url);
    const payload = await response.json();
    const error = payload.chart?.error;

    if (!response.ok || error) {
      throw new Error(error?.description || `Yahoo request failed with ${response.status}`);
    }

    const result = payload.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const timestamps: number[] = result?.timestamp ?? [];
    if (!quote || timestamps.length === 0) {
      continue;
    }

    collected.push(
      ...timestamps.flatMap((timestamp, index) => {
        const open = quote.open?.[index];
        const high = quote.high?.[index];
        const low = quote.low?.[index];
        const close = quote.close?.[index];

        if ([open, high, low, close].some((value) => value == null)) {
          return [];
        }

        return [{
          time: new Date(timestamp * 1000).toISOString().replace('.000Z', 'Z'),
          open: Number(open),
          high: Number(high),
          low: Number(low),
          close: Number(close),
          volume: Number(quote.volume?.[index] ?? 0),
        }];
      }),
    );
  }

  return Array.from(
    new Map(collected.map((bar) => [bar.time, bar])).values(),
  ).sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
}

function hasRangeCoverage(
  bars: ReplayBar[],
  start: string,
  end: string,
  timeframe: Exclude<MarketTimeframe, '4h'>,
): boolean {
  if (bars.length === 0) return false;

  const toleranceMs = timeframe === '1d'
    ? 2 * DAY_MS
    : timeframe === '1h'
      ? 3 * 60 * 60 * 1000
      : 45 * 60 * 1000;

  const first = Date.parse(bars[0].time);
  const last = Date.parse(bars[bars.length - 1].time);

  return first <= Date.parse(start) + toleranceMs && last >= Date.parse(end) - toleranceMs;
}

async function loadBaseBars(timeframe: Exclude<MarketTimeframe, '4h'>, start: string, end: string): Promise<{ bars: ReplayBar[]; note: string | null }> {
  const cached = fromRows(getMarketBarsInRange(YAHOO_SYMBOL, timeframe, start, end));
  if (hasRangeCoverage(cached, start, end, timeframe)) {
    return { bars: cached, note: null };
  }

  try {
    const fetched = await fetchYahooBars(timeframe, start, end);
    if (fetched.length > 0) {
      upsertMarketBars(toRows(fetched, timeframe));
    }
    const merged = fromRows(getMarketBarsInRange(YAHOO_SYMBOL, timeframe, start, end));
    return { bars: merged, note: merged.length === 0 ? '免费历史源在该窗口没有返回 ES 数据。' : null };
  } catch (error) {
    return {
      bars: [],
      note: error instanceof Error ? error.message : '免费历史源请求失败。',
    };
  }
}

export async function getSessionMarketData(sessionDate: string, fills: FillRow[], timeframe: MarketTimeframe): Promise<SessionMarketData> {
  const { start, end } = getHistoryWindow(sessionDate, timeframe);
  const baseTimeframe = getYahooInterval(timeframe);
  const { bars: baseBars, note } = await loadBaseBars(baseTimeframe, start, end);
  const historyFills = getFillsInRange(start, end);
  const mergedFills = Array.from(
    new Map([...historyFills, ...fills].map((fill) => [fill.id, fill])).values(),
  ).sort((a, b) => String(a.timestamp ?? '').localeCompare(String(b.timestamp ?? '')));

  return {
    symbol: YAHOO_SYMBOL,
    timeframe,
    source: SOURCE,
    note,
    bars: timeframe === '4h' ? aggregateBars(baseBars, '4h') : baseBars,
    fills: mergedFills,
  };
}
