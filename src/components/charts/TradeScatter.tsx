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
  entryTime: string;
  netPnl: number;
  qty: number;
  direction: string;
}

interface ScatterPoint {
  hour: number;
  pnl: number;
  qty: number;
  direction: string;
  baseColor: string;
  opacity: number;
}

interface Props {
  trades: TradePoint[];
}

const LONG_COLOR = '#3b82f6';
const SHORT_COLOR = '#f59e0b';

export function TradeScatter({ trades }: Props) {
  const data: ScatterPoint[] = trades.map((t) => {
    const d = new Date(t.entryTime);
    const hour = d.getHours() + d.getMinutes() / 60;
    const isLong = t.direction === 'long';
    return {
      hour,
      pnl: t.netPnl,
      qty: t.qty,
      direction: t.direction,
      baseColor: isLong ? LONG_COLOR : SHORT_COLOR,
      opacity: t.netPnl >= 0 ? 0.85 : 0.40,
    };
  });

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(90, 103, 118, 0.10)" />
          <XAxis
            dataKey="hour"
            type="number"
            domain={[6, 20]}
            name="时间"
            tick={{ fill: '#8c96a4', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${Math.floor(v)}:00`}
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
              if (name === '时间') {
                return [
                  `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}`,
                  name,
                ];
              }
              if (name === '盈亏') return [`$${v.toFixed(2)}`, name];
              return [v, name];
            }}
            cursor={{ strokeDasharray: '3 3' }}
          />
          <Scatter
            data={data}
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              const { baseColor, opacity, pnl } = payload as ScatterPoint;
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

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
        {[
          { color: LONG_COLOR, opacity: 0.85, label: '多头盈利', dash: false },
          { color: LONG_COLOR, opacity: 0.40, label: '多头亏损', dash: true },
          { color: SHORT_COLOR, opacity: 0.85, label: '空头盈利', dash: false },
          { color: SHORT_COLOR, opacity: 0.40, label: '空头亏损', dash: true },
        ].map(({ color, opacity, label, dash }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width={12} height={12}>
              <circle
                cx={6} cy={6} r={4.5}
                fill={color}
                fillOpacity={opacity}
                stroke={color}
                strokeOpacity={dash ? 0.6 : 0.3}
                strokeWidth={dash ? 1.5 : 1}
                strokeDasharray={dash ? '2 1' : 'none'}
              />
            </svg>
            <span style={{ fontSize: '0.72rem', color: '#8c96a4', fontFamily: 'IBM Plex Mono, monospace' }}>
              {label}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width={12} height={12}>
            <circle cx={6} cy={6} r={3} fill="#8c96a4" fillOpacity={0.5} />
            <circle cx={6} cy={6} r={5} fill="none" stroke="#8c96a4" strokeOpacity={0.3} strokeWidth={1} />
          </svg>
          <span style={{ fontSize: '0.72rem', color: '#8c96a4', fontFamily: 'IBM Plex Mono, monospace' }}>
            圆圈大小 = 手数
          </span>
        </div>
      </div>
    </div>
  );
}
