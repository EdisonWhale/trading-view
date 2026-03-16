import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { FillTable } from '../components/journal/FillTable';
import { TradeList } from '../components/journal/TradeList';
import { JournalForm } from '../components/journal/JournalForm';
import { PdfUpload } from '../components/journal/PdfUpload';
import { formatSignedCurrency, formatSessionDate } from '../lib/format';
import type { SessionDetail, SessionSummary, Trade } from '../types';

type Section = 'fills' | 'trades' | 'journal';

export default function Journal() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('trades');

  useEffect(() => {
    api.getSessions().then((sessionList) => {
      const sorted = [...sessionList].sort((a, b) => b.date.localeCompare(a.date));
      setSessions(sorted);
      if (sorted.length > 0) setSelectedDate(sorted[0].date);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingDetail(true);
    api.getSession(selectedDate)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [selectedDate]);

  const handleImport = (newDetail: SessionDetail) => {
    setDetail(newDetail);
    setSelectedDate(newDetail.session.date);
    setSessions((previous) => {
      const exists = previous.find((item) => item.date === newDetail.session.date);
      const summary: SessionSummary = {
        date: newDetail.session.date,
        instrument: newDetail.session.instrument,
        instrumentName: newDetail.session.instrumentName,
        netPnl: newDetail.session.netPnl,
        tradeCount: newDetail.session.tradeCount,
      };
      if (exists) return previous.map((item) => item.date === summary.date ? summary : item);
      return [summary, ...previous].sort((a, b) => b.date.localeCompare(a.date));
    });
  };

  const handleTradeUpdate = (updated: Trade) => {
    setDetail((current) => current ? { ...current, trades: current.trades.map((trade) => trade.id === updated.id ? updated : trade) } : current);
  };

  const session = detail?.session;

  return (
    <div className="page-stack">
      <div className="workspace-grid">
        <aside className="session-rail">
          <PdfUpload onSuccess={handleImport} />

          <div className="section-heading">
            <p className="card__kicker">Session Archive</p>
            <h3>归档交易日</h3>
          </div>

          {sessions.length === 0 ? (
            <p className="rail-empty">暂无记录</p>
          ) : (
            <div className="session-rail__list">
              {sessions.map((item) => (
                <button
                  key={item.date}
                  type="button"
                  className={`session-pill ${selectedDate === item.date ? 'session-pill--active' : ''}`}
                  onClick={() => setSelectedDate(item.date)}
                >
                  <span className="session-pill__date">{item.date}</span>
                  <strong className={item.netPnl >= 0 ? 'tone-profit' : 'tone-loss'}>
                    {formatSignedCurrency(item.netPnl)}
                  </strong>
                  <span>{item.instrument} · {item.tradeCount}笔</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="detail-column">
          {loadingDetail ? (
            <div className="page-loader">加载中...</div>
          ) : detail && session ? (
            <>
              <section className="detail-hero">
                <div>
                  <p className="card__kicker">{session.instrument} · {session.instrumentName}</p>
                  <h3>{formatSessionDate(session.date)}</h3>
                </div>
                <div className="detail-hero__stats">
                  <div className="signal-chip">
                    <span>净盈亏</span>
                    <strong className={session.netPnl >= 0 ? 'tone-profit' : 'tone-loss'}>
                      {formatSignedCurrency(session.netPnl)}
                    </strong>
                  </div>
                  <div className="signal-chip">
                    <span>手续费</span>
                    <strong>${session.commissions.toFixed(2)}</strong>
                  </div>
                  <div className="signal-chip">
                    <span>交易笔数</span>
                    <strong>{session.tradeCount} 笔</strong>
                  </div>
                </div>
              </section>

              <div className="segmented">
                {([['trades', `配对交易 (${detail.trades.length})`], ['fills', `原始成交 (${detail.fills.length})`], ['journal', '复盘日志']] as [Section, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`segmented__item ${activeSection === id ? 'segmented__item--active' : ''}`}
                    onClick={() => setActiveSection(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="card">
                {activeSection === 'fills' && <FillTable fills={detail.fills} />}
                {activeSection === 'trades' && <TradeList trades={detail.trades} onUpdate={handleTradeUpdate} />}
                {activeSection === 'journal' && (
                  <JournalForm
                    sessionDate={session.date}
                    initial={detail.journal}
                    onSave={(journal) => setDetail((current) => current ? { ...current, journal } : current)}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="empty-state empty-state--panel">
              <div className="empty-state__seal">LG</div>
              <h3>选择交易日查看详情</h3>
              <p>左侧选择一个交易日，或者直接上传新的 PDF，让右侧进入当日日志与复盘工作流。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
