import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { SessionSummary } from '../types';

export default function Settings() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSessions()
      .then((sessionList) => setSessions([...sessionList].sort((a, b) => b.date.localeCompare(a.date))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (date: string) => {
    if (!confirm(`确认删除 ${date} 的所有数据？此操作不可撤销。`)) return;
    setDeleting(date);
    try {
      await api.deleteSession(date);
      setSessions((previous) => previous.filter((session) => session.date !== date));
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  };

  const handleExport = async () => {
    try {
      const [analytics, sessionsData] = await Promise.all([api.getAnalytics(), api.getSessions()]);
      const blob = new Blob([JSON.stringify({ sessions: sessionsData, analytics }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trading-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <div className="page-stack">
      <section className="page-band">
        <div className="page-band__copy">
          <p className="page-band__eyebrow">Control Panel</p>
          <h2 className="page-band__title">把数据资产和系统信息留在一个克制的控制面板里</h2>
          <p className="page-band__text">
            设置页不需要花哨，但必须清晰。导出、删除、查看系统组成，都应该像同一套交易工具的一部分。
          </p>
        </div>
      </section>

      <div className="grid-2 settings-grid">
        <div className="card">
          <div className="card__header">
            <div>
              <p className="card__kicker">Data Control</p>
              <h3 className="card__title">数据管理</h3>
            </div>
          </div>

          <div className="button-row">
            <button className="btn btn--ghost" onClick={handleExport}>
              导出全部数据 (JSON)
            </button>
          </div>

          {loading ? (
            <div className="page-loader" style={{ height: 80 }}>加载中...</div>
          ) : sessions.length === 0 ? (
            <p className="rail-empty">暂无数据</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>合约</th>
                    <th>净盈亏</th>
                    <th>交易笔数</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.date}>
                      <td className="mono-cell">{session.date}</td>
                      <td>{session.instrument}</td>
                      <td className={session.netPnl >= 0 ? 'tone-profit mono-cell' : 'tone-loss mono-cell'}>
                        {session.netPnl >= 0 ? '+' : ''}${session.netPnl.toFixed(2)}
                      </td>
                      <td>{session.tradeCount}</td>
                      <td>
                        <button
                          className="btn btn--danger"
                          onClick={() => handleDelete(session.date)}
                          disabled={deleting === session.date}
                        >
                          {deleting === session.date ? '删除中...' : '删除'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card__header">
            <div>
              <p className="card__kicker">System Profile</p>
              <h3 className="card__title">关于</h3>
            </div>
          </div>

          <div className="meta-list">
            <div className="meta-list__row">
              <span>后端</span>
              <span>Express + SQLite (本地, port 3001)</span>
            </div>
            <div className="meta-list__row">
              <span>前端</span>
              <span>React 18 + Vite + Recharts</span>
            </div>
            <div className="meta-list__row">
              <span>PDF解析</span>
              <span>NinjaTrader Daily Statement (pdf-parse)</span>
            </div>
            <div className="meta-list__row">
              <span>数据目录</span>
              <code className="inline-code">data/trading.db</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
