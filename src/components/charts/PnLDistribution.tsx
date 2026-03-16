import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface Props {
  data: Array<{ range: string; count: number }>;
}

export function PnLDistribution({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(90, 103, 118, 0.10)"
          vertical={false}
        />
        <XAxis
          dataKey="range"
          tick={{ fill: '#8c96a4', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#8c96a4', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(252, 250, 246, 0.98)',
            border: '1px solid rgba(90, 103, 118, 0.16)',
            borderRadius: 16,
            fontSize: '0.82rem',
            boxShadow: '0 18px 38px rgba(43, 52, 64, 0.12)',
          }}
          labelStyle={{ color: '#6e7886' }}
          itemStyle={{ color: '#c79a4a', fontFamily: 'IBM Plex Mono, monospace' }}
          formatter={(v) => [v as number, '笔数']}
        />
        <Bar
          dataKey="count"
          fill="#c79a4a"
          fillOpacity={0.76}
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
