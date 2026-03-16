import type { Trade } from '../../types';

interface Props {
  trades: Trade[];
  height?: number;
}

export function TradeMiniChart({ trades, height = 60 }: Props) {
  if (trades.length === 0) return null;

  const values = trades.map((t) => t.netPnl);
  const maxAbs = Math.max(...values.map(Math.abs), 1);
  const halfH = height / 2;
  const barW = Math.max(3, Math.min(20, Math.floor((600 - trades.length * 2) / trades.length)));
  const gap = 3;
  const totalW = trades.length * (barW + gap) - gap;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
      aria-hidden="true"
    >
      <line x1={0} y1={halfH} x2={totalW} y2={halfH} stroke="rgba(100,116,139,0.25)" strokeWidth={1} />
      {trades.map((trade, i) => {
        const x = i * (barW + gap);
        const isProfit = trade.netPnl >= 0;
        const barH = Math.max(2, (Math.abs(trade.netPnl) / maxAbs) * (halfH - 2));
        const y = isProfit ? halfH - barH : halfH;
        return (
          <rect
            key={trade.id}
            x={x}
            y={y}
            width={barW}
            height={barH}
            rx={1.5}
            fill={isProfit ? 'var(--profit)' : 'var(--loss)'}
            opacity={0.8}
          />
        );
      })}
    </svg>
  );
}
