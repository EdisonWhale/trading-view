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
  fill: string;
}

interface Props {
  trades: TradePoint[];
}

export function TradeScatter({ trades }: Props) {
  const data: ScatterPoint[] = trades.map((t) => {
    const d = new Date(t.entryTime);
    const hour = d.getHours() + d.getMinutes() / 60;
    return {
      hour,
      pnl: t.netPnl,
      qty: t.qty,
      direction: t.direction,
      fill: t.netPnl >= 0 ? '#1f9d6c' : '#d66161',
    };
  });

  return (
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
        <ReferenceLine y={0} stroke="rgba(90, 103, 118, 0.18)" />
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
            const { cx, cy, fill } = props;
            return (
              <circle
                cx={cx}
                cy={cy}
                r={5}
                fill={fill}
                fillOpacity={0.72}
                stroke={fill}
                strokeOpacity={0.3}
                strokeWidth={1}
              />
            );
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
