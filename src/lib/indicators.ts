import type { IndicatorPoint, MarketBar } from '../types';

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

export function computeVWAP(bars: MarketBar[]): IndicatorPoint[] {
  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;
  let lastValue: number | null = null;

  return bars.map((bar) => {
    const typicalPrice = finiteOrNull((bar.high + bar.low + bar.close) / 3);
    const volume = finiteOrNull(bar.volume);

    if (typicalPrice !== null && volume !== null && volume > 0) {
      cumulativePriceVolume += typicalPrice * volume;
      cumulativeVolume += volume;
    }

    const fallback = finiteOrNull(bar.close) ?? lastValue ?? 0;
    const value = cumulativeVolume > 0 ? cumulativePriceVolume / cumulativeVolume : fallback;
    lastValue = finiteOrNull(value) ?? fallback;

    return { time: bar.time, value: lastValue };
  });
}

export function computeEMA(bars: MarketBar[], period: number): IndicatorPoint[] {
  if (bars.length === 0) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  let previous = finiteOrNull(bars[0].close) ?? 0;

  return bars.map((bar, index) => {
    const close = finiteOrNull(bar.close) ?? previous;

    if (index === 0) {
      previous = close;
    } else {
      previous = (close - previous) * multiplier + previous;
    }

    return {
      time: bar.time,
      value: previous,
    };
  });
}
