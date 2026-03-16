import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { JournalForm } from '../components/journal/JournalForm';
import { formatSignedCurrency, formatSessionDate } from '../lib/format';
import type { JournalEntry, SessionDetail, SessionSummary } from '../types';

export default function Review() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="page-loader">加载中...</div>;

  return (
    <div className="page-stack">
      <section className="page-band">
        <div className="page-band__copy">
          <p className="page-band__eyebrow">Review Desk</p>
          <h2 className="page-band__title">把当天的情绪、执行和规则偏差关进同一张复盘桌面</h2>
          <p className="page-band__text">
            这个页面不再像附属表单，而是整个系统的主场。左边是日期档案，右边是当日表现、执行质量和明日焦点。
          </p>
        </div>
        <div className="page-band__aside">
          <div className="ink-callout">
            <span>复盘目标</span>
            <strong>{sessions.length > 0 ? '形成连续反馈回路' : '等待第一份复盘样本'}</strong>
            <p>你的复盘应该越来越像交易系统的一部分，而不是事后补记。</p>
          </div>
        </div>
      </section>

      <div className="workspace-grid workspace-grid--review">
        <aside className="session-rail">
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

        <div className="detail-column">
          {detail ? (
            <>
              <section className="detail-hero">
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
            </>
          ) : (
            <div className="empty-state empty-state--panel">
              <div className="empty-state__seal">RV</div>
              <h3>选择左侧日期开始复盘</h3>
              <p>复盘页已经切成更专注的工作台结构，选中交易日后会把当日表现和表单放到同一个焦点区域里。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
