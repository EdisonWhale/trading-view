import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';

interface Props {
  data: Array<{ date: string; netPnl: number }>;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val: number = payload[0]?.value ?? 0;
  return (
    <div
      style={{
        background: 'rgba(252, 250, 246, 0.98)',
        border: '1px solid rgba(90, 103, 118, 0.16)',
        borderRadius: 16,
        padding: '12px 14px',
        fontSize: '0.82rem',
        boxShadow: '0 18px 38px rgba(43, 52, 64, 0.12)',
      }}
    >
      <p style={{ margin: '0 0 4px', color: '#6e7886' }}>{label}</p>
      <p
        style={{
          margin: 0,
          color: val >= 0 ? '#1f9d6c' : '#d66161',
          fontFamily: 'IBM Plex Mono, monospace',
          fontWeight: 600,
        }}
      >
        {val >= 0 ? '+' : ''}${val.toFixed(2)}
      </p>
    </div>
  );
}

export function DailyPnLBar({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(90, 103, 118, 0.10)"
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
          tickFormatter={(v: number) => `$${v}`}
          width={48}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(69, 111, 157, 0.05)' }}
        />
        <ReferenceLine y={0} stroke="rgba(90, 103, 118, 0.18)" />
        <Bar dataKey="netPnl" radius={[3, 3, 0, 0]} maxBarSize={32}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.netPnl >= 0 ? '#1f9d6c' : '#d66161'}
              fillOpacity={0.82}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
