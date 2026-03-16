import { computeEMA, computeVWAP } from './indicators';

describe('indicator calculations', () => {
  const bars = [
    { time: 1, open: 100, high: 101, low: 99, close: 100, volume: 10 },
    { time: 2, open: 100, high: 104, low: 99, close: 102, volume: 20 },
    { time: 3, open: 102, high: 105, low: 101, close: 104, volume: 30 },
  ];

  it('computes VWAP for each bar', () => {
    const vwap = computeVWAP(bars);

    expect(vwap).toHaveLength(3);
    expect(vwap[0].value).toBeCloseTo(100, 4);
    expect(vwap[1].value).toBeCloseTo(101.1111, 4);
    expect(vwap[2].value).toBeCloseTo(102.2222, 4);
  });

  it('computes EMA values aligned to the bar count', () => {
    const ema = computeEMA(bars, 3);

    expect(ema).toHaveLength(3);
    expect(ema[0].value).toBeCloseTo(100, 4);
    expect(ema[1].value).toBeCloseTo(101, 4);
    expect(ema[2].value).toBeCloseTo(102.5, 4);
  });
});
