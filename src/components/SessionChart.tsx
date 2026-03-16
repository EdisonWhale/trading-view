import { useEffect, useMemo, useRef } from 'react';
import {
  CandlestickSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type LineData,
  type UTCTimestamp,
} from 'lightweight-charts';

import { computeEMA, computeVWAP } from '../lib/indicators';
import type { TradingDay } from '../lib/types';

interface SessionChartProps {
  day: TradingDay;
}

export function SessionChart({ day }: SessionChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const vwap = useMemo(() => computeVWAP(day.bars), [day.bars]);
  const ema = useMemo(() => computeEMA(day.bars, 20), [day.bars]);
  const candleData = useMemo(
    () =>
      day.bars.map((bar) => ({
        time: bar.time as UTCTimestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })),
    [day.bars],
  );
  const vwapData = useMemo<LineData<UTCTimestamp>[]>(
    () => vwap.map((point) => ({ time: point.time as UTCTimestamp, value: point.value })),
    [vwap],
  );
  const emaData = useMemo<LineData<UTCTimestamp>[]>(
    () => ema.map((point) => ({ time: point.time as UTCTimestamp, value: point.value })),
    [ema],
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container || /jsdom/i.test(window.navigator.userAgent)) {
      return;
    }

    const width = container.clientWidth || 900;
    const chart: IChartApi = createChart(container, {
      width,
      height: 420,
      layout: {
        background: { color: '#fcfaf6' },
        textColor: '#6e7886',
      },
      grid: {
        vertLines: { color: 'rgba(90, 103, 118, 0.10)' },
        horzLines: { color: 'rgba(90, 103, 118, 0.10)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(90, 103, 118, 0.18)',
      },
      timeScale: {
        borderColor: 'rgba(90, 103, 118, 0.18)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: 'rgba(69, 111, 157, 0.45)' },
        horzLine: { color: 'rgba(69, 111, 157, 0.38)' },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#1f9d6c',
      wickUpColor: '#1f9d6c',
      downColor: '#d66161',
      wickDownColor: '#d66161',
      borderVisible: false,
    });
    candleSeries.setData(candleData);

    const vwapSeries = chart.addSeries(LineSeries, {
      color: '#c79a4a',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    vwapSeries.setData(vwapData);

    const emaSeries = chart.addSeries(LineSeries, {
      color: '#5B7A9A',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    emaSeries.setData(emaData);

    createSeriesMarkers(candleSeries, day.executions.map((execution) => ({
      time: execution.timestamp as UTCTimestamp,
      position: execution.side === 'buy' ? 'belowBar' : 'aboveBar',
      color: execution.side === 'buy' ? '#1f9d6c' : '#d66161',
      shape: execution.tag === 'add' ? 'square' : execution.side === 'buy' ? 'arrowUp' : 'arrowDown',
      text: `${execution.side === 'buy' ? '买' : '卖'} ${execution.price}`,
    })));

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (!container) return;
      chart.applyOptions({ width: container.clientWidth || 900 });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candleData, day.executions, emaData, vwapData]);

  return (
    <section className="chart-card">
      <div className="chart-card__header">
        <div>
          <p className="section-kicker">行情结构</p>
          <h3>MES 1分钟走势图</h3>
        </div>
        <div className="chart-legend">
          <span><i className="legend-dot legend-dot--vwap" />VWAP</span>
          <span><i className="legend-dot legend-dot--ema" />EMA20</span>
          <span><i className="legend-dot legend-dot--fills" />成交标记</span>
        </div>
      </div>
      <div className="session-chart" data-testid="session-chart" ref={containerRef}>
        {/jsdom/i.test(window.navigator.userAgent) ? (
          <div className="session-chart__placeholder">图表在浏览器中渲染</div>
        ) : null}
      </div>
    </section>
  );
}
