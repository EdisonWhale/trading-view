import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Props {
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
}

export function WinRateDonut({ wins, losses, breakeven, winRate }: Props) {
  const data = [
    { name: '盈利', value: wins || 0 },
    { name: '亏损', value: losses || 0 },
    ...(breakeven > 0 ? [{ name: '持平', value: breakeven }] : []),
  ];
  const total = wins + losses + breakeven;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill="#1f9d6c" fillOpacity={0.88} />
            <Cell fill="#d66161" fillOpacity={0.80} />
            {breakeven > 0 && <Cell fill="#8c96a4" fillOpacity={0.55} />}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: '1.6rem',
            fontWeight: 700,
            fontFamily: 'IBM Plex Mono, monospace',
            color: '#18202a',
            lineHeight: 1,
          }}
        >
          {winRate.toFixed(0)}%
        </div>
        <div style={{ fontSize: '0.7rem', color: '#6e7886', marginTop: 3 }}>胜率</div>
        <div style={{ fontSize: '0.7rem', color: '#8c96a4', marginTop: 2 }}>{total} 笔</div>
      </div>
    </div>
  );
}
