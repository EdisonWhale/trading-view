import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface TradePoint {
  durationSeconds: number;
  netPnl: number;
  qty: number;
  direction: string;
}

interface Props {
  trades: TradePoint[];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
}

const LONG_COLOR = '#3b82f6';
const SHORT_COLOR = '#f59e0b';

export function DurationScatter({ trades }: Props) {
  const data = trades.map((t) => ({
    duration: t.durationSeconds,
    pnl: t.netPnl,
    qty: t.qty,
    direction: t.direction,
    baseColor: t.direction === 'long' ? LONG_COLOR : SHORT_COLOR,
    opacity: t.netPnl >= 0 ? 0.85 : 0.40,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ScatterChart margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(90, 103, 118, 0.10)" />
        <XAxis
          dataKey="duration"
          type="number"
          name="持仓时长"
          tick={{ fill: '#8c96a4', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatDuration(v)}
        />
        <YAxis
          dataKey="pnl"
          type="number"
          name="盈亏"
          tick={{ fill: '#8c96a4', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `$${v}`}
          width={48}
        />
        <ZAxis dataKey="qty" range={[30, 120]} />
        <ReferenceLine y={0} stroke="rgba(90, 103, 118, 0.22)" strokeWidth={1} />
        <Tooltip
          contentStyle={{
            background: 'rgba(252, 250, 246, 0.98)',
            border: '1px solid rgba(90, 103, 118, 0.16)',
            borderRadius: 16,
            fontSize: '0.82rem',
            boxShadow: '0 18px 38px rgba(43, 52, 64, 0.12)',
          }}
          formatter={(val, name) => {
            const v = val as number;
            if (name === '持仓时长') return [formatDuration(v), name];
            if (name === '盈亏') return [`$${v.toFixed(2)}`, name];
            return [v, name];
          }}
          cursor={{ strokeDasharray: '3 3' }}
        />
        <Scatter
          data={data}
          shape={(props: any) => {
            const { cx, cy, payload } = props;
            const { baseColor, opacity, pnl } = payload;
            const isWin = pnl >= 0;
            return (
              <circle
                cx={cx}
                cy={cy}
                r={5}
                fill={baseColor}
                fillOpacity={opacity}
                stroke={baseColor}
                strokeOpacity={isWin ? 0.3 : 0.6}
                strokeWidth={isWin ? 1 : 1.5}
                strokeDasharray={isWin ? 'none' : '2 1'}
              />
            );
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
