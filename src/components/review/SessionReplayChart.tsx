import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type LineData,
  type UTCTimestamp,
} from 'lightweight-charts';
import { computeEMA, computeVWAP } from '../../lib/indicators';
import type { Fill, MarketBar, SessionMarketData } from '../../types';

interface Props {
  data: SessionMarketData;
  onSelectFill?: (fill: Fill) => void;
  selectedFillId?: number | null;
  showMarkers?: boolean;
}

interface CrosshairStats {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number | null;
  ema200: number | null;
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function toUtcDate(timestamp: string): Date {
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) ? timestamp : `${timestamp}Z`;
  return new Date(normalized);
}

function resolveMarkerTime(timestamp: string, bars: MarketBar[]): UTCTimestamp | null {
  const fillMs = toUtcDate(timestamp).getTime();
  if (Number.isNaN(fillMs) || bars.length === 0) return null;

  let candidate: MarketBar | null = null;
  for (const bar of bars) {
    if ((bar.time * 1000) <= fillMs) {
      candidate = bar;
      continue;
    }
    break;
  }

  return (candidate?.time ?? bars[0].time) as UTCTimestamp;
}

function formatCompactTime(timestamp: string): string {
  return toUtcDate(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toMarketBars(bars: SessionMarketData['bars']): MarketBar[] {
  return bars
    .map((bar) => ({
      time: Math.floor(Date.parse(bar.time) / 1000),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }))
    .filter((bar) =>
      isFiniteNumber(bar.time)
      && isFiniteNumber(bar.open)
      && isFiniteNumber(bar.high)
      && isFiniteNumber(bar.low)
      && isFiniteNumber(bar.close)
      && isFiniteNumber(bar.volume),
    );
}

function createDefaultCrosshair(data: SessionMarketData, vwapData: Array<{ time: number; value: number }>, emaData: Array<{ time: number; value: number }>): CrosshairStats | null {
  const lastBar = data.bars[data.bars.length - 1];
  if (!lastBar) return null;

  return {
    time: formatCompactTime(lastBar.time),
    open: lastBar.open,
    high: lastBar.high,
    low: lastBar.low,
    close: lastBar.close,
    volume: lastBar.volume,
    vwap: vwapData[vwapData.length - 1]?.value ?? null,
    ema200: emaData[emaData.length - 1]?.value ?? null,
  };
}

function sanitizeLineData(data: LineData<UTCTimestamp>[]): LineData<UTCTimestamp>[] {
  return data.filter((point) => isFiniteNumber(Number(point.time)) && isFiniteNumber(point.value));
}

export function SessionReplayChart({ data, onSelectFill, selectedFillId, showMarkers = true }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const selectedFill = data.fills.find((fill) => fill.id === selectedFillId) ?? data.fills[0] ?? null;

  const marketBars = useMemo(() => toMarketBars(data.bars), [data.bars]);
  const vwap = useMemo(() => computeVWAP(marketBars), [marketBars]);
  const ema200 = useMemo(() => computeEMA(marketBars, 200), [marketBars]);

  const candleData = useMemo(
    () => marketBars.map((bar) => ({
      time: bar.time as UTCTimestamp,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    })),
    [marketBars],
  );

  const vwapData = useMemo<LineData<UTCTimestamp>[]>(
    () => sanitizeLineData(vwap.map((point) => ({ time: point.time as UTCTimestamp, value: point.value }))),
    [vwap],
  );

  const ema200Data = useMemo<LineData<UTCTimestamp>[]>(
    () => sanitizeLineData(ema200.map((point) => ({ time: point.time as UTCTimestamp, value: point.value }))),
    [ema200],
  );

  const volumeData = useMemo(
    () => marketBars.map((bar) => ({
      time: bar.time as UTCTimestamp,
      value: bar.volume,
      color: bar.close >= bar.open ? 'rgba(31, 157, 108, 0.72)' : 'rgba(214, 97, 97, 0.72)',
    })),
    [marketBars],
  );

  const markers = useMemo(
    () => data.fills
      .map((fill) => {
        if (!fill.timestamp) return null;
        const markerTime = resolveMarkerTime(fill.timestamp, marketBars);
        return markerTime ? { ...fill, markerTime } : null;
      })
      .filter((fill): fill is Fill & { markerTime: UTCTimestamp } => Boolean(fill)),
    [data.fills, marketBars],
  );

  const [crosshair, setCrosshair] = useState<CrosshairStats | null>(() => createDefaultCrosshair(data, vwap, ema200));

  useEffect(() => {
    setCrosshair(createDefaultCrosshair(data, vwap, ema200));
  }, [data, vwap, ema200]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || /jsdom/i.test(window.navigator.userAgent)) {
      return;
    }

    const chart = createChart(container, {
      width: container.clientWidth || 980,
      height: 640,
      layout: {
        background: { color: '#f7f2ea' },
        textColor: '#5b6774',
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
        mode: 0,
        vertLine: { color: 'rgba(69, 111, 157, 0.28)', width: 1 },
        horzLine: { color: 'rgba(69, 111, 157, 0.20)', width: 1 },
      },
      handleScroll: {
        vertTouchDrag: false,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      wickUpColor: '#22c55e',
      downColor: '#ef4444',
      wickDownColor: '#ef4444',
      borderVisible: false,
      priceLineVisible: true,
      lastValueVisible: true,
    });
    candleSeries.setData(candleData);

    const vwapSeries = chart.addSeries(LineSeries, {
      color: '#fbbf24',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    vwapSeries.setData(vwapData);

    const ema200Series = chart.addSeries(LineSeries, {
      color: '#60a5fa',
      lineWidth: 2,
      lineStyle: 2,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    ema200Series.setData(ema200Data);

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    }, 1);
    volumeSeries.setData(volumeData);

    chart.panes()[0]?.setStretchFactor(4);
    chart.panes()[1]?.setStretchFactor(1.2);
    chart.panes()[1]?.setPreserveEmptyPane(true);

    createSeriesMarkers(candleSeries, showMarkers
      ? markers.map((fill) => ({
          time: fill.markerTime,
          position: fill.side === 'buy' ? 'belowBar' : 'aboveBar',
          color: fill.side === 'buy' ? '#22c55e' : '#ef4444',
          shape: fill.side === 'buy' ? 'arrowUp' : 'arrowDown',
          text: fill.reason ? 'R' : '•',
          size: selectedFill?.id === fill.id ? 2 : 1,
        }))
      : []);

    chart.subscribeClick((param) => {
      if (!showMarkers) return;
      if (!param.time) return;
      const target = markers.find((fill) => fill.markerTime === param.time);
      if (target) {
        onSelectFill?.(target);
      }
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) return;
      const pointTime = Number(param.time);
      const bar = marketBars.find((item) => item.time === pointTime);
      if (!bar) return;
      const vwapPoint = vwap.find((item) => item.time === pointTime);
      const emaPoint = ema200.find((item) => item.time === pointTime);

      setCrosshair({
        time: formatCompactTime(new Date(pointTime * 1000).toISOString()),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        vwap: vwapPoint?.value ?? null,
        ema200: emaPoint?.value ?? null,
      });
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (!container) return;
      chart.resize(container.clientWidth || 980, 640);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [candleData, data.bars, ema200, ema200Data, markers, onSelectFill, selectedFill?.id, showMarkers, volumeData, vwap, vwapData, marketBars]);

  return (
    <section className="terminal-shell">
      <div className="terminal-main">
        <div className="terminal-indicators">
          <span className="terminal-indicator terminal-indicator--vwap">VWAP</span>
          <span className="terminal-indicator terminal-indicator--ema">EMA200</span>
          <span className="terminal-indicator terminal-indicator--volume">成交量</span>
          {showMarkers && data.fills.length > 0 ? <span className="terminal-indicator terminal-indicator--fills">买卖点</span> : null}
        </div>

        <div className="terminal-chart-stage">
          <div className="terminal-crosshair">
            <div className="terminal-crosshair__time">{crosshair?.time ?? '—'}</div>
            <div className="terminal-crosshair__grid">
              <span>O {crosshair?.open.toFixed(2) ?? '—'}</span>
              <span>H {crosshair?.high.toFixed(2) ?? '—'}</span>
              <span>L {crosshair?.low.toFixed(2) ?? '—'}</span>
              <span>C {crosshair?.close.toFixed(2) ?? '—'}</span>
              <span>VOL {Math.round(crosshair?.volume ?? 0).toLocaleString('en-US')}</span>
              <span>VWAP {crosshair?.vwap?.toFixed(2) ?? '—'}</span>
              <span>EMA200 {crosshair?.ema200?.toFixed(2) ?? '—'}</span>
            </div>
          </div>

          <div className="terminal-chart" data-testid="session-replay-chart" ref={containerRef}>
            {/jsdom/i.test(window.navigator.userAgent) ? (
              <div className="session-chart__placeholder">图表在浏览器中渲染</div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
