import type { IndicatorPoint, MarketBar } from '../types';

export function computeVWAP(bars: MarketBar[]): IndicatorPoint[] {
  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;

  return bars.map((bar) => {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    cumulativePriceVolume += typicalPrice * bar.volume;
    cumulativeVolume += bar.volume;

    return {
      time: bar.time,
      value: cumulativePriceVolume / cumulativeVolume,
    };
  });
}

export function computeEMA(bars: MarketBar[], period: number): IndicatorPoint[] {
  if (bars.length === 0) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  let previous = bars[0].close;

  return bars.map((bar, index) => {
    if (index === 0) {
      previous = bar.close;
    } else {
      previous = (bar.close - previous) * multiplier + previous;
    }

    return {
      time: bar.time,
      value: previous,
    };
  });
}
