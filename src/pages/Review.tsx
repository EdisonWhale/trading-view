import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { SessionReplayChart } from '../components/review/SessionReplayChart';
import { JournalForm } from '../components/journal/JournalForm';
import { formatSignedCurrency, formatSessionDate } from '../lib/format';
import type { Fill, JournalEntry, SessionDetail, SessionMarketData, SessionSummary, SessionTimeframe } from '../types';

const TIMEFRAMES: Array<{ id: SessionTimeframe; label: string }> = [
  { id: '1m', label: '1分钟' },
  { id: '5m', label: '5分钟' },
  { id: '15m', label: '15分钟' },
  { id: '1h', label: '1小时' },
  { id: '4h', label: '4小时' },
  { id: '1d', label: '日线' },
];

export default function Review() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [market, setMarket] = useState<SessionMarketData | null>(null);
  const [timeframe, setTimeframe] = useState<SessionTimeframe>('1m');
  const [selectedFill, setSelectedFill] = useState<Fill | null>(null);
  const [showMarkers, setShowMarkers] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMarket, setLoadingMarket] = useState(false);

  useEffect(() => {
    api.getSessions().then((sessionList) => {
      const sorted = [...sessionList].sort((a, b) => b.date.localeCompare(a.date));
      setSessions(sorted);
      if (sorted.length > 0) setSelectedDate(sorted[0].date);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    api.getSession(selectedDate).then(setDetail).catch(() => setDetail(null));
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingMarket(true);
    api.getSessionMarket(selectedDate, timeframe)
      .then((payload) => {
        setMarket(payload);
        const selectedSessionFills = payload.fills.filter((fill) => fill.sessionDate === selectedDate);
        setSelectedFill((current) => selectedSessionFills.find((fill) => fill.id === current?.id) ?? selectedSessionFills[0] ?? payload.fills[0] ?? null);
      })
      .catch(() => {
        setMarket(null);
        setSelectedFill(null);
      })
      .finally(() => setLoadingMarket(false));
  }, [selectedDate, timeframe]);

  if (loading) return <div className="page-loader">加载中...</div>;

  const sessionRail = (
    <aside className="session-rail session-rail--journal">
      <div className="section-heading">
        <p className="card__kicker">Session Review</p>
        <h3>选择日期</h3>
      </div>
      {sessions.length === 0 ? (
        <p className="rail-empty">暂无记录</p>
      ) : (
        <div className="session-rail__list">
          {sessions.map((session) => (
            <button
              key={session.date}
              type="button"
              className={`session-pill ${selectedDate === session.date ? 'session-pill--active' : ''}`}
              onClick={() => setSelectedDate(session.date)}
            >
              <span className="session-pill__date">{session.date}</span>
              <strong className={session.netPnl >= 0 ? 'tone-profit' : 'tone-loss'}>
                {formatSignedCurrency(session.netPnl)}
              </strong>
            </button>
          ))}
        </div>
      )}
    </aside>
  );

  return (
    <div className="page-stack">
      {detail ? (
        <>
          <div className="review-terminal-stack">
            <section className="detail-hero detail-hero--terminal">
              <div>
                <p className="card__kicker">{detail.session.instrument} — 复盘</p>
                <h3>{formatSessionDate(detail.session.date)}</h3>
              </div>
              <div className="detail-hero__stats">
                {[
                  { label: '净盈亏', value: formatSignedCurrency(detail.session.netPnl), className: detail.session.netPnl >= 0 ? 'tone-profit' : 'tone-loss' },
                  { label: '交易笔数', value: `${detail.session.tradeCount} 笔`, className: '' },
                  { label: '手续费', value: `$${detail.session.commissions.toFixed(2)}`, className: '' },
                ].map((item) => (
                  <div key={item.label} className="signal-chip">
                    <span>{item.label}</span>
                    <strong className={item.className}>{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <div className="card card--feature card--terminal">
              <div className="card__header">
                <div className="terminal-heading">
                  <h3 className="card__title">复盘交易走势</h3>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setShowMarkers((current) => !current)}
                  >
                    {showMarkers ? '隐藏买卖点' : '显示买卖点'}
                  </button>
                </div>
                <div className="segmented" role="tablist" aria-label="行情周期">
                  {TIMEFRAMES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`segmented__item ${timeframe === item.id ? 'segmented__item--active' : ''}`}
                      onClick={() => setTimeframe(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              {loadingMarket ? (
                <div className="page-loader">加载行情...</div>
              ) : market && market.bars.length > 0 ? (
                <SessionReplayChart
                  data={market}
                  selectedFillId={selectedFill?.id ?? null}
                  onSelectFill={setSelectedFill}
                  showMarkers={showMarkers}
                />
              ) : (
                <div className="empty-state empty-state--panel">
                  <div className="empty-state__seal">MR</div>
                  <h3>当前周期没有可用行情</h3>
                  <p>{market?.note ?? '免费历史源没有返回这一日的 ES 数据。'}</p>
                </div>
              )}
            </div>
          </div>

          <div className="review-lower-grid">
            {sessionRail}
            <div className="detail-column">
              <div className="card card--feature">
                <div className="card__header">
                  <div>
                    <p className="card__kicker">Daily Review</p>
                    <h3 className="card__title">复盘日志</h3>
                  </div>
                </div>
                <JournalForm
                  sessionDate={detail.session.date}
                  initial={detail.journal}
                  onSave={(journal: JournalEntry) => setDetail((current) => current ? { ...current, journal } : current)}
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="review-lower-grid">
          {sessionRail}
          <div className="empty-state empty-state--panel">
            <div className="empty-state__seal">RV</div>
            <h3>选择左侧日期开始复盘</h3>
            <p>交易终端已经独立成整行工作区，选中交易日后会在上方展开完整 session 图表和下方复盘日志。</p>
          </div>
        </div>
      )}
    </div>
  );
}
