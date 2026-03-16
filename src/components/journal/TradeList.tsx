import { useState } from 'react';
import { api } from '../../api/client';
import type { Trade } from '../../types';

interface Props {
  trades: Trade[];
  onUpdate?: (trade: Trade) => void;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
}

function formatTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ts; }
}

export function TradeList({ trades, onUpdate }: Props) {
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  if (trades.length === 0) {
    return <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>暂无配对交易</p>;
  }

  const startEdit = (trade: Trade) => {
    setEditId(trade.id);
    setEditText(trade.annotation ?? '');
  };

  const saveAnnotation = async (id: number) => {
    setSaving(true);
    try {
      const updated = await api.updateTradeAnnotation(id, editText);
      onUpdate?.(updated);
      setEditId(null);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {trades.map((trade) => (
        <div key={trade.id} className="trade-row">
          <div className="trade-row__header">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`execution-chip execution-chip--${trade.direction === 'long' ? 'buy' : 'sell'}`}>
                {trade.direction === 'long' ? '做多' : '做空'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', fontFamily: 'IBM Plex Mono, monospace' }}>
                {formatTime(trade.entryTime)} → {formatTime(trade.exitTime)}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                {formatDuration(trade.durationSeconds)}
              </span>
            </div>
            <strong style={{ fontFamily: 'IBM Plex Mono, monospace', color: trade.netPnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontSize: '0.95rem' }}>
              {trade.netPnl >= 0 ? '+' : ''}${trade.netPnl.toFixed(2)}
            </strong>
          </div>
          <div className="trade-row__details">
            <span>入场 {trade.entryPrice.toFixed(2)}</span>
            <span>出场 {trade.exitPrice.toFixed(2)}</span>
            <span>{trade.qty} 手</span>
            <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
              总盈亏 ${trade.grossPnl.toFixed(2)} · 手续费 ${trade.commission.toFixed(2)}
            </span>
          </div>
          {editId === trade.id ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input
                className="form-input"
                style={{ flex: 1, padding: '6px 10px', fontSize: '0.82rem' }}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="添加备注..."
                autoFocus
              />
              <button className="btn btn--primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => saveAnnotation(trade.id)} disabled={saving}>
                {saving ? '...' : '保存'}
              </button>
              <button className="btn btn--ghost" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => setEditId(null)}>取消</button>
            </div>
          ) : (
            <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {trade.annotation ? (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', fontStyle: 'italic' }}>"{trade.annotation}"</span>
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>—</span>
              )}
              <button className="btn btn--ghost" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={() => startEdit(trade)}>注解</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
