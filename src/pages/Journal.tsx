import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { FillTable } from '../components/journal/FillTable';
import { OpenPositionList } from '../components/journal/OpenPositionList';
import { TradeList } from '../components/journal/TradeList';
import { TradeMiniChart } from '../components/journal/TradeMiniChart';
import { JournalForm } from '../components/journal/JournalForm';
import { PdfUpload } from '../components/journal/PdfUpload';
import { formatCurrency, formatSignedCurrency, formatSessionDate } from '../lib/format';
import type { AnalyticsData, Fill, SessionDetail, SessionSummary, Trade } from '../types';

type Section = 'fills' | 'trades' | 'positions' | 'journal';

export default function Journal() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('trades');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    Promise.all([api.getSessions(), api.getAnalytics()]).then(([sessionList, analyticsData]) => {
      const sorted = [...sessionList].sort((a, b) => b.date.localeCompare(a.date));
      setSessions(sorted);
      setAnalytics(analyticsData);
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

  const handleFillUpdate = (updated: Fill) => {
    setDetail((current) => current ? { ...current, fills: current.fills.map((fill) => fill.id === updated.id ? updated : fill) } : current);
  };

  const session = detail?.session;
  const dayOpenPositions = detail?.openPositions ?? [];

  const stats = analytics?.tradeStats;

  // Day-level stats computed from loaded trades
  const dayTrades = detail?.trades ?? [];
  const dayWins = dayTrades.filter((t) => t.netPnl > 0);
  const dayLosses = dayTrades.filter((t) => t.netPnl < 0);
  const dayWinRate = dayTrades.length > 0 ? (dayWins.length / dayTrades.length) * 100 : null;
  const dayAvgWin = dayWins.length > 0 ? dayWins.reduce((s, t) => s + t.netPnl, 0) / dayWins.length : null;
  const dayAvgLoss = dayLosses.length > 0 ? dayLosses.reduce((s, t) => s + t.netPnl, 0) / dayLosses.length : null;
  const dayBestTrade = dayTrades.length > 0 ? Math.max(...dayTrades.map((t) => t.netPnl)) : null;
  const dayWorstTrade = dayTrades.length > 0 ? Math.min(...dayTrades.map((t) => t.netPnl)) : null;

  useEffect(() => {
    if (activeSection === 'positions' && dayOpenPositions.length === 0) {
      setActiveSection('trades');
    }
  }, [activeSection, dayOpenPositions.length]);

  return (
    <div className="page-stack">
      {stats && sessions.length > 0 && (
        <div className="journal-totals">
          <div className="journal-totals__header">
            <p className="journal-totals__eyebrow">Account Summary</p>
            <h3 className="journal-totals__title">账户汇总</h3>
          </div>
          <div className="journal-totals__body">
            <div className="journal-totals__group">
              <div className="journal-totals__item">
                <span>总净盈亏</span>
                <strong className={(stats.totalNetPnl ?? 0) >= 0 ? 'tone-profit' : 'tone-loss'}>
                  {stats.totalNetPnl != null && !Number.isNaN(stats.totalNetPnl)
                    ? formatSignedCurrency(stats.totalNetPnl)
                    : '—'}
                </strong>
              </div>
              <div className="journal-totals__item">
                <span>总手续费</span>
                <strong className="tone-loss">
                  {stats.totalCommissions != null && !Number.isNaN(stats.totalCommissions)
                    ? `-${formatCurrency(stats.totalCommissions)}`
                    : '—'}
                </strong>
              </div>
              <div className="journal-totals__item">
                <span>总笔数</span>
                <strong>{stats.totalTrades} 笔</strong>
              </div>
              <div className="journal-totals__item">
                <span>交易天数</span>
                <strong>{stats.totalSessions} 日</strong>
              </div>
            </div>
            <div className="journal-totals__divider" />
            <div className="journal-totals__group">
              <div className="journal-totals__item">
                <span>胜率</span>
                <strong>{stats.winRate.toFixed(1)}%</strong>
              </div>
              <div className="journal-totals__item">
                <span>盈亏比</span>
                <strong>
                  {stats.avgLoss !== 0
                    ? (stats.avgWin / Math.abs(stats.avgLoss)).toFixed(2)
                    : '—'}
                </strong>
              </div>
              <div className="journal-totals__item">
                <span>均盈</span>
                <strong className="tone-profit">+{formatCurrency(stats.avgWin)}</strong>
              </div>
              <div className="journal-totals__item">
                <span>均亏</span>
                <strong className="tone-loss">{formatSignedCurrency(stats.avgLoss)}</strong>
              </div>
            </div>
            <div className="journal-totals__divider" />
            <div className="journal-totals__group">
              <div className="journal-totals__item">
                <span>最大单笔盈利</span>
                <strong className="tone-profit">
                  {stats.maxWin != null && !Number.isNaN(stats.maxWin) && stats.maxWin > 0
                    ? `+${formatCurrency(stats.maxWin)}`
                    : '—'}
                </strong>
              </div>
              <div className="journal-totals__item">
                <span>最大单笔亏损</span>
                <strong className="tone-loss">
                  {stats.maxLoss != null && !Number.isNaN(stats.maxLoss) && stats.maxLoss < 0
                    ? formatSignedCurrency(stats.maxLoss)
                    : '—'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
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
                    <strong>-${session.commissions.toFixed(2)}</strong>
                  </div>
                  <div className="signal-chip">
                    <span>已实现净额</span>
                    <strong className={session.realizedNetPnl >= 0 ? 'tone-profit' : 'tone-loss'}>
                      {formatSignedCurrency(session.realizedNetPnl)}
                    </strong>
                  </div>
                  {session.openTradeEquityChange !== 0 && (
                    <div className="signal-chip">
                      <span>OTE 变动</span>
                      <strong className={session.openTradeEquityChange >= 0 ? 'tone-profit' : 'tone-loss'}>
                        {formatSignedCurrency(session.openTradeEquityChange)}
                      </strong>
                    </div>
                  )}
                  <div className="signal-chip">
                    <span>交易笔数</span>
                    <strong>{session.tradeCount} 笔</strong>
                  </div>
                  <div className="signal-chip">
                    <span>EOD 余额</span>
                    <strong>{formatCurrency(session.endingBalance)}</strong>
                  </div>
                  {dayWinRate !== null && (
                    <div className="signal-chip">
                      <span>当日胜率</span>
                      <strong>{dayWinRate.toFixed(1)}%</strong>
                    </div>
                  )}
                  {dayAvgWin !== null && dayAvgLoss !== null && (
                    <div className="signal-chip">
                      <span>盈亏比</span>
                      <strong>{(dayAvgWin / Math.abs(dayAvgLoss)).toFixed(2)}</strong>
                    </div>
                  )}
                  {dayBestTrade !== null && dayBestTrade > 0 && (
                    <div className="signal-chip">
                      <span>最大单笔</span>
                      <strong className="tone-profit">+{formatCurrency(dayBestTrade)}</strong>
                    </div>
                  )}
                  {dayWorstTrade !== null && dayWorstTrade < 0 && (
                    <div className="signal-chip">
                      <span>最大亏损</span>
                      <strong className="tone-loss">{formatSignedCurrency(dayWorstTrade)}</strong>
                    </div>
                  )}
                  <div className="signal-chip">
                    <span>毛盈亏</span>
                    <strong className={session.grossPnl >= 0 ? 'tone-profit' : 'tone-loss'}>
                      {formatSignedCurrency(session.grossPnl)}
                    </strong>
                  </div>
                </div>
              </section>
              {dayTrades.length > 0 && (
                <div className="detail-minichart">
                  <div className="detail-minichart__header">
                    <div>
                      <p className="card__kicker">Trade Sequence</p>
                      <span className="detail-minichart__title">逐笔盈亏</span>
                    </div>
                    <span className="detail-minichart__legend">
                      <span className="detail-minichart__dot detail-minichart__dot--profit" />盈
                      <span className="detail-minichart__dot detail-minichart__dot--loss" style={{ marginLeft: 8 }} />亏
                      <span style={{ marginLeft: 12, color: 'var(--ink-400)' }}>每柱 = 一笔</span>
                    </span>
                  </div>
                  <TradeMiniChart trades={dayTrades} />
                </div>
              )}

              <div className="segmented">
                {([
                  ['trades', `配对交易 (${detail.trades.length})`],
                  ...(dayOpenPositions.length > 0 ? [['positions', `未平仓持仓 (${dayOpenPositions.length})`]] : []),
                  ['fills', `原始成交 (${detail.fills.length})`],
                  ['journal', '复盘日志'],
                ] as [Section, string][]).map(([id, label]) => (
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
                {activeSection === 'fills' && <FillTable fills={detail.fills} onUpdate={handleFillUpdate} />}
                {activeSection === 'trades' && <TradeList trades={detail.trades} onUpdate={handleTradeUpdate} />}
                {activeSection === 'positions' && <OpenPositionList positions={dayOpenPositions} />}
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
