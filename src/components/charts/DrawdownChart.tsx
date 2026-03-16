import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface Props {
  equityData: Array<{ date: string; balance: number }>;
}

export function DrawdownChart({ equityData }: Props) {
  let peak = equityData[0]?.balance ?? 0;

  const data = equityData.map((pt) => {
    if (pt.balance > peak) peak = pt.balance;
    const dd = peak > 0 ? ((pt.balance - peak) / peak) * 100 : 0;
    return { date: pt.date, drawdown: dd };
  });

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d66161" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#d66161" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          tickFormatter={(v: number) => `${v.toFixed(1)}%`}
          width={48}
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
          formatter={(v) => [`${(v as number).toFixed(2)}%`, '回撤']}
          itemStyle={{ color: '#d66161', fontFamily: 'IBM Plex Mono, monospace' }}
        />
        <Area
          type="monotone"
          dataKey="drawdown"
          stroke="#d66161"
          strokeWidth={1.8}
          fill="url(#ddGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
