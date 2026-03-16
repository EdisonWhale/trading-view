import { useState } from 'react';
import { api } from '../../api/client';
import type { Fill } from '../../types';

interface Props {
  fills: Fill[];
  onUpdate?: (fill: Fill) => void;
}

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts;
  }
}

export function FillTable({ fills, onUpdate }: Props) {
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  if (fills.length === 0) {
    return <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>暂无成交记录</p>;
  }

  const startEdit = (fill: Fill) => {
    setEditId(fill.id);
    setEditText(fill.reason ?? '');
  };

  const saveReason = async (id: number) => {
    setSaving(true);
    try {
      const updated = await api.updateFillReason(id, editText);
      onUpdate?.(updated);
      setEditId(null);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

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
            <th>买卖理由</th>
            <th />
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
              <td style={{ minWidth: 220 }}>
                {editId === fill.id ? (
                  <input
                    className="form-input"
                    value={editText}
                    onChange={(event) => setEditText(event.target.value)}
                    placeholder="记录这一笔买卖原因..."
                  />
                ) : (
                  <span style={{ color: fill.reason ? 'var(--text-2)' : 'var(--text-3)', fontSize: '0.82rem' }}>
                    {fill.reason || '—'}
                  </span>
                )}
              </td>
              <td>
                {editId === fill.id ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn--primary" disabled={saving} onClick={() => saveReason(fill.id)}>
                      保存
                    </button>
                    <button className="btn btn--ghost" onClick={() => setEditId(null)}>
                      取消
                    </button>
                  </div>
                ) : (
                  <button className="btn btn--ghost" onClick={() => startEdit(fill)}>
                    理由
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
