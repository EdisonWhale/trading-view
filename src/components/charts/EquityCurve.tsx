import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { formatCurrency, formatSignedCurrency } from '../../lib/format';

interface Props {
  data: Array<{ date: string; balance: number; netPnl: number }>;
  mode: 'amount' | 'percent';
  variant: 'paper' | 'terminal';
}

const PROFIT_COLOR = '#1f9d6c';
const LOSS_COLOR   = '#d66161';

type ChartPoint = {
  date: string;
  balance: number;
  netPnl: number;
  changeValue: number;
  changePercent: number;
  chartValue: number;
};

type SeriesSide = 'profit' | 'loss';

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function formatAxisCurrency(value: number): string {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label, mode, variant }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const paper = variant === 'paper';
  return (
    <div
      style={{
        background: paper ? 'rgba(252, 250, 246, 0.98)' : 'rgba(17, 24, 34, 0.94)',
        border: paper ? '1px solid rgba(90, 103, 118, 0.16)' : '1px solid rgba(104, 124, 148, 0.24)',
        borderRadius: 14,
        padding: '12px 14px 11px',
        fontSize: '0.82rem',
        boxShadow: paper ? '0 18px 38px rgba(43, 52, 64, 0.12)' : '0 18px 38px rgba(16, 22, 30, 0.20)',
      }}
    >
      <p style={{ margin: '0 0 8px', color: paper ? '#6e7886' : 'rgba(228, 235, 245, 0.62)' }}>{label}</p>
      <p style={{ margin: 0, color: paper ? '#18202a' : '#f7fafc', fontFamily: 'IBM Plex Mono, monospace' }}>
        账户: {formatCurrency(point.balance)}
      </p>
      {point?.netPnl != null && (
        <p style={{
          margin: '3px 0 0',
          color: point.netPnl >= 0 ? (paper ? PROFIT_COLOR : '#72d0a5') : (paper ? LOSS_COLOR : '#ef8e8e'),
          fontFamily: 'IBM Plex Mono, monospace',
        }}>
          当日: {formatSignedCurrency(point.netPnl)}
        </p>
      )}
      <p style={{ margin: '3px 0 0', color: paper ? '#39485a' : '#d7dee8', fontFamily: 'IBM Plex Mono, monospace' }}>
        {mode === 'amount' ? '累计变化' : '累计收益'}:{' '}
        {mode === 'amount' ? formatSignedCurrency(point.changeValue) : formatPercent(point.changePercent)}
      </p>
    </div>
  );
}

function resolveSeriesSide(data: ChartPoint[], index: number, baselineValue: number): SeriesSide {
  const value = data[index]?.chartValue ?? baselineValue;

  if (value > baselineValue) return 'profit';
  if (value < baselineValue) return 'loss';

  for (let cursor = index + 1; cursor < data.length; cursor += 1) {
    if (data[cursor].chartValue > baselineValue) return 'profit';
    if (data[cursor].chartValue < baselineValue) return 'loss';
  }

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (data[cursor].chartValue > baselineValue) return 'profit';
    if (data[cursor].chartValue < baselineValue) return 'loss';
  }

  return 'profit';
}

function buildSegmentedLineData(data: ChartPoint[], baselineValue: number) {
  const sides = data.map((_, index) => resolveSeriesSide(data, index, baselineValue));
  const segmented = data.map((point, index) => ({
    ...point,
    profitLineValue: sides[index] === 'profit' ? point.chartValue : null,
    lossLineValue: sides[index] === 'loss' ? point.chartValue : null,
  }));

  for (let index = 1; index < segmented.length; index += 1) {
    const currentSide = sides[index];
    const previousSide = sides[index - 1];

    if (currentSide === previousSide) continue;

    if (currentSide === 'profit') {
      segmented[index - 1].profitLineValue = data[index - 1].chartValue;
      continue;
    }

    segmented[index - 1].lossLineValue = data[index - 1].chartValue;
  }

  return segmented;
}

export function EquityCurve({ data, mode, variant }: Props) {
  const baseline = data[0]?.balance ?? 0;
  const chartData = data.map((point) => ({
    ...point,
    changeValue: point.balance - baseline,
    changePercent: baseline !== 0 ? ((point.balance - baseline) / baseline) * 100 : 0,
    chartValue: mode === 'amount'
      ? point.balance
      : baseline !== 0 ? ((point.balance - baseline) / baseline) * 100 : 0,
  }));

  // Max drawdown calculation
  let peak = -Infinity;
  let peakAtMaxDD = 0;
  let maxDrawdownDate = '';
  let maxDD = 0;
  for (const pt of data) {
    if (pt.balance > peak) peak = pt.balance;
    const dd = peak - pt.balance;
    if (dd > maxDD) { maxDD = dd; peakAtMaxDD = peak; maxDrawdownDate = pt.date; }
  }
  const maxDDPercent = peakAtMaxDD !== 0 ? (maxDD / peakAtMaxDD) * 100 : 0;

  const latest = data[data.length - 1];
  const totalChange = latest ? latest.balance - baseline : 0;
  const totalChangePercent = baseline !== 0 ? (totalChange / baseline) * 100 : 0;

  // Compute where the baseline falls in the Y range (0% = top, 100% = bottom)
  const baselineValue = mode === 'amount' ? baseline : 0;
  const segmentedChartData = buildSegmentedLineData(chartData, baselineValue);

  return (
    <div className={`equity-curve equity-curve--${variant}`}>
      <div className="equity-curve__stats">
        <div className="equity-curve__stat">
          <span>当前</span>
          <strong>{latest ? formatCurrency(latest.balance) : '—'}</strong>
        </div>
        <div className="equity-curve__stat">
          <span>{mode === 'amount' ? '累计变化' : '累计收益'}</span>
          <strong className={totalChange >= 0 ? 'tone-profit' : 'tone-loss'}>
            {mode === 'amount' ? formatSignedCurrency(totalChange) : formatPercent(totalChangePercent)}
          </strong>
        </div>
        <div className="equity-curve__stat">
          <span>最大回撤</span>
          <strong className="tone-loss">
            {mode === 'amount' ? formatCurrency(maxDD) : formatPercent(maxDDPercent)}
          </strong>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={segmentedChartData} margin={{ top: 14, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityFillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#557aa5" stopOpacity={variant === 'paper' ? 0.18 : 0.30} />
              <stop offset="70%"  stopColor="#557aa5" stopOpacity={variant === 'paper' ? 0.06 : 0.10} />
              <stop offset="100%" stopColor="#557aa5" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke={variant === 'paper' ? 'rgba(90, 103, 118, 0.10)' : 'rgba(90, 103, 118, 0.12)'}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: '#8c96a4', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            tick={{ fill: '#8c96a4', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => mode === 'amount' ? formatAxisCurrency(v) : `${v.toFixed(1)}%`}
            width={62}
          />
          <Tooltip content={<CustomTooltip mode={mode} variant={variant} />} />
          <ReferenceLine
            y={baselineValue}
            stroke="rgba(90, 103, 118, 0.22)"
            strokeDasharray="4 4"
          />
          {maxDrawdownDate && (
            <ReferenceLine
              x={maxDrawdownDate}
              stroke={LOSS_COLOR}
              strokeDasharray="4 4"
              strokeOpacity={0.35}
            />
          )}
          <Area
            type="monotone"
            dataKey="chartValue"
            stroke="none"
            fill="url(#equityFillGrad)"
            dot={false}
            activeDot={false}
          />
          <Line
            type="monotone"
            dataKey="profitLineValue"
            stroke={PROFIT_COLOR}
            strokeWidth={2.6}
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4, fill: PROFIT_COLOR, stroke: variant === 'paper' ? '#fcfaf6' : '#f7fafc', strokeWidth: 1.4 }}
          />
          <Line
            type="monotone"
            dataKey="lossLineValue"
            stroke={LOSS_COLOR}
            strokeWidth={2.6}
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4, fill: LOSS_COLOR, stroke: variant === 'paper' ? '#fcfaf6' : '#f7fafc', strokeWidth: 1.4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
