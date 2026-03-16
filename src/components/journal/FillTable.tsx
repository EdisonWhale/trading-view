import type { Fill } from '../../types';

interface Props {
  fills: Fill[];
}

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts;
  }
}

export function FillTable({ fills }: Props) {
  if (fills.length === 0) {
    return <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>暂无成交记录</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>方向</th>
            <th>数量</th>
            <th>价格</th>
            <th>订单号</th>
          </tr>
        </thead>
        <tbody>
          {fills.map((fill) => (
            <tr key={fill.id}>
              <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem' }}>{formatTime(fill.timestamp)}</td>
              <td>
                <span className={`execution-chip execution-chip--${fill.side}`}>
                  {fill.side === 'buy' ? '买入' : '卖出'}
                </span>
              </td>
              <td style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{fill.qty}</td>
              <td style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{fill.price.toFixed(2)}</td>
              <td style={{ color: 'var(--text-3)', fontSize: '0.78rem', fontFamily: 'IBM Plex Mono, monospace' }}>{fill.orderId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
