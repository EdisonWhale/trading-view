import type { OpenPosition } from '../../types';

interface Props {
  positions: OpenPosition[];
}

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

export function OpenPositionList({ positions }: Props) {
  if (positions.length === 0) {
    return (
      <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
        暂无未平仓持仓
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {positions.map((position) => (
        <div key={position.id} className="trade-row">
          <div className="trade-row__header">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`execution-chip execution-chip--${position.side === 'long' ? 'buy' : 'sell'}`}>
                {position.side === 'long' ? '持有多单' : '持有空单'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', fontFamily: 'IBM Plex Mono, monospace' }}>
                {position.instrument} · {formatTime(position.entryTime)} 持仓中
              </span>
            </div>
            <strong style={{ fontFamily: 'IBM Plex Mono, monospace', color: position.openPnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontSize: '0.95rem' }}>
              {position.openPnl >= 0 ? '+' : ''}${position.openPnl.toFixed(2)}
            </strong>
          </div>
          <div className="trade-row__details">
            <span>开仓 {position.entryPrice.toFixed(2)}</span>
            <span>结算价 {position.markPrice.toFixed(2)}</span>
            <span>{position.qty} 手</span>
            <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
              标记时间 {formatTime(position.markTime)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
