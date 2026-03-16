import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface Props {
  data: Array<{ date: string; balance: number; netPnl: number }>;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
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
      <p style={{ margin: '0 0 6px', color: '#6e7886' }}>{label}</p>
      <p
        style={{
          margin: 0,
          color: '#18202a',
          fontFamily: 'IBM Plex Mono, monospace',
        }}
      >
        余额: ${payload[0]?.value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </p>
      {payload[0]?.payload?.netPnl != null && (
        <p
          style={{
            margin: '3px 0 0',
            color: payload[0].payload.netPnl >= 0 ? '#1f9d6c' : '#d66161',
            fontFamily: 'IBM Plex Mono, monospace',
          }}
        >
          当日: {payload[0].payload.netPnl >= 0 ? '+' : ''}$
          {payload[0].payload.netPnl.toFixed(2)}
        </p>
      )}
    </div>
  );
}

export function EquityCurve({ data }: Props) {
  let peak = -Infinity;
  let maxDrawdownDate = '';
  let maxDD = 0;

  for (const pt of data) {
    if (pt.balance > peak) peak = pt.balance;
    const dd = peak - pt.balance;
    if (dd > maxDD) {
      maxDD = dd;
      maxDrawdownDate = pt.date;
    }
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#456f9d" stopOpacity={0.24} />
            <stop offset="95%" stopColor="#456f9d" stopOpacity={0} />
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
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        {maxDrawdownDate && (
          <ReferenceLine
            x={maxDrawdownDate}
            stroke="#d66161"
            strokeDasharray="3 3"
            strokeOpacity={0.40}
          />
        )}
        <Area
          type="monotone"
          dataKey="balance"
          stroke="#456f9d"
          strokeWidth={2.3}
          fill="url(#equityGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#456f9d' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
