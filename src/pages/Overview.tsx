import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { MetricCard } from '../components/MetricCard';
import { EquityCurve } from '../components/charts/EquityCurve';
import { formatCurrency, formatSignedCurrency, formatSessionDate } from '../lib/format';
import type { AnalyticsData, SessionSummary } from '../types';

export default function Overview() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getAnalytics(), api.getSessions()])
      .then(([analyticsData, sessionData]) => {
        setAnalytics(analyticsData);
        setSessions(sessionData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader">加载中...</div>;

  const stats = analytics?.tradeStats;
  const equityData = analytics?.equityCurve ?? [];
  const recentSessions = sessions.slice(-5).reverse();
  const totalNetPnl = equityData.reduce((sum, point) => sum + point.netPnl, 0);
  const hasData = sessions.length > 0 || equityData.length > 0;

  const summaryCards = [
    {
      label: '账户余额',
      value: equityData.length ? formatCurrency(equityData[equityData.length - 1].balance) : '—',
      tone: 'neutral' as const,
      detail: `共 ${sessions.length} 个交易日`,
    },
    {
      label: '总净盈亏',
      value: stats ? formatSignedCurrency(totalNetPnl) : '—',
      tone: (stats && totalNetPnl >= 0 ? 'profit' : 'loss') as 'profit' | 'loss',
      detail: stats?.winRate != null ? `胜率 ${stats.winRate.toFixed(1)}%` : '',
    },
    {
      label: '盈亏比',
      value: stats?.avgWin != null && stats?.avgLoss != null
        ? (stats.avgLoss !== 0 ? (stats.avgWin / Math.abs(stats.avgLoss)).toFixed(2) : '—')
        : '—',
      tone: 'accent' as const,
      detail: stats?.avgWin != null && stats?.avgLoss != null
        ? `均盈 $${stats.avgWin.toFixed(0)} / 均亏 $${Math.abs(stats.avgLoss).toFixed(0)}`
        : '',
    },
    {
      label: '最大回撤',
      value: stats ? formatCurrency(stats.maxDrawdown) : '—',
      tone: 'warn' as const,
      detail: stats?.maxDrawdownDate ? `发生于 ${stats.maxDrawdownDate}` : '',
    },
  ];

  return (
    <div className="page-stack">
      <section className="page-band">
        <div className="page-band__copy">
          <p className="page-band__eyebrow">Strategic Overview</p>
          <h2 className="page-band__title">把盈亏、回撤和执行质量收敛到一张更安静的交易总览里</h2>
          <p className="page-band__text">
            优秀的复盘首页不该只是堆统计卡片。它应该先告诉你资金曲线是否健康、最近几天是否在偏离优势区间，以及下一次该把注意力放在哪里。
          </p>
        </div>
        <div className="page-band__aside">
          <div className="ink-callout">
            <span>账户状态</span>
            <strong>{hasData ? '已建立可复盘轨迹' : '等待第一份交易证据'}</strong>
            <p>
              {hasData
                ? `当前共 ${sessions.length} 个交易日，最近一次记录为 ${recentSessions[0]?.date ?? '—'}。`
                : '先导入一份 NinjaTrader 日结单，让界面从空白纸面进入可分析状态。'}
            </p>
          </div>
          <div className="signal-stack">
            <div className="signal-chip">
              <span>轨迹</span>
              <strong>{sessions.length} 日</strong>
            </div>
            <div className="signal-chip">
              <span>胜率</span>
              <strong>{stats?.winRate != null ? `${stats.winRate.toFixed(1)}%` : '—'}</strong>
            </div>
            <div className="signal-chip">
              <span>最大回撤</span>
              <strong>{stats ? formatCurrency(stats.maxDrawdown) : '—'}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="metrics-grid">
        {summaryCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone={card.tone}
            detail={card.detail}
          />
        ))}
      </div>

      {hasData ? (
        <div className="overview-grid">
          <article className="card card--feature">
            <div className="card__header">
              <div>
                <p className="card__kicker">Capital Path</p>
                <h3 className="card__title card__title--large">权益曲线</h3>
              </div>
              <span className="card__meta">{equityData.length} 个数据点</span>
            </div>
            <EquityCurve data={equityData} />
          </article>

          <div className="stack-grid">
            <article className="card">
              <div className="card__header">
                <div>
                  <p className="card__kicker">Short Read</p>
                  <h3 className="card__title">当前判断</h3>
                </div>
              </div>
              <div className="insight-list">
                <div className="insight-row">
                  <span>账户动量</span>
                  <strong className={totalNetPnl >= 0 ? 'tone-profit' : 'tone-loss'}>
                    {totalNetPnl >= 0 ? '延续盈利区间' : '需要压缩回撤'}
                  </strong>
                </div>
                <div className="insight-row">
                  <span>近期稳定性</span>
                  <strong>{recentSessions.length >= 3 ? '具备连续样本' : '样本仍然偏少'}</strong>
                </div>
                <div className="insight-row">
                  <span>最强观察点</span>
                  <strong>{stats?.maxDrawdownDate ? `关注 ${stats.maxDrawdownDate} 附近回撤` : '先建立连续记录'}</strong>
                </div>
              </div>
            </article>

            <article className="card">
              <div className="card__header">
                <div>
                  <p className="card__kicker">Recent Tape</p>
                  <h3 className="card__title">最近交易日</h3>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>合约</th>
                      <th>净盈亏</th>
                      <th>交易笔数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSessions.map((session) => (
                      <tr key={session.date}>
                        <td className="mono-cell">{formatSessionDate(session.date)}</td>
                        <td>{session.instrument}</td>
                        <td className={session.netPnl >= 0 ? 'tone-profit mono-cell' : 'tone-loss mono-cell'}>
                          {formatSignedCurrency(session.netPnl)}
                        </td>
                        <td>{session.tradeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </div>
      ) : (
        <section className="empty-state empty-state--hero">
          <div className="empty-state__seal">OV</div>
          <h3>先导入第一份交易记录</h3>
          <p>
            当前首页已经换成更专业的复盘看板，但没有交易证据时，它仍然应该像一张准备好的工作台，而不是空洞的占位页。
            前往「交易日志」上传 PDF 后，这里会自动生成权益曲线、近期轨迹和结构判断。
          </p>
        </section>
      )}
    </div>
  );
}
