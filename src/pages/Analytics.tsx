import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { MetricCard } from '../components/MetricCard';
import { EquityCurve } from '../components/charts/EquityCurve';
import { DailyPnLBar } from '../components/charts/DailyPnLBar';
import { PnLCalendar } from '../components/charts/PnLCalendar';
import { PnLDistribution } from '../components/charts/PnLDistribution';
import { WinRateDonut } from '../components/charts/WinRateDonut';
import { TimeHeatmap } from '../components/charts/TimeHeatmap';
import { DrawdownChart } from '../components/charts/DrawdownChart';
import { TradeScatter } from '../components/charts/TradeScatter';
import { DurationScatter } from '../components/charts/DurationScatter';
import { formatCurrency, formatSignedCurrency } from '../lib/format';
import type { AnalyticsData, SessionSummary } from '../types';

function formatDur(seconds: number): string {
  if (seconds <= 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [curveMode, setCurveMode] = useState<'amount' | 'percent'>('amount');

  useEffect(() => {
    Promise.all([api.getAnalytics(), api.getSessions()])
      .then(([analyticsData, sessionData]) => {
        setData(analyticsData);
        setSessions(sessionData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader">加载中...</div>;

  if (!data || data.equityCurve.length === 0) {
    return (
      <div className="page-stack">
        <div className="empty-state empty-state--hero">
          <div className="empty-state__seal">AN</div>
          <h3>暂无可分析样本</h3>
          <p>先导入交易记录，再回来观察权益曲线、胜率结构、时间热区与回撤压力。</p>
        </div>
      </div>
    );
  }

  const { tradeStats: stats, equityCurve, dailyPnl, pnlDistribution, timeHeatmap, tradeScatter, streaks, directionStats, durationStats } = data;

  const currentStreakLabel = streaks?.current.type === 'win'
    ? `连胜 ${streaks.current.count} 笔`
    : streaks?.current.type === 'loss'
    ? `连亏 ${streaks.current.count} 笔`
    : '—';

  const currentStreakTone = streaks?.current.type === 'win'
    ? 'var(--profit)'
    : streaks?.current.type === 'loss'
    ? 'var(--loss)'
    : 'var(--ink-500)';

  return (
    <div className="page-stack">

      {/* ── 6-card metrics row ─────────────────────────────────────── */}
      <div className="metrics-grid metrics-grid--6">
        {[
          {
            label: '总净盈亏',
            value: stats?.totalNetPnl != null && !Number.isNaN(stats.totalNetPnl)
              ? formatSignedCurrency(stats.totalNetPnl)
              : '—',
            tone: ((stats?.totalNetPnl ?? 0) >= 0 ? 'profit' : 'loss') as 'profit' | 'loss',
            detail: `共 ${stats?.totalSessions ?? 0} 个交易日`,
          },
          {
            label: '胜率',
            value: stats?.winRate != null ? `${stats.winRate.toFixed(1)}%` : '—',
            tone: ((stats?.winRate ?? 0) >= 50 ? 'profit' : 'loss') as 'profit' | 'loss',
            detail: `${stats?.wins ?? 0}胜 ${stats?.losses ?? 0}负${(stats?.breakeven ?? 0) > 0 ? ` ${stats.breakeven}平` : ''}`,
          },
          {
            label: '盈利因子',
            value: stats?.profitFactor != null
              ? stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)
              : '—',
            tone: ((stats?.profitFactor ?? 0) >= 1.5 ? 'profit' : (stats?.profitFactor ?? 0) >= 1 ? 'accent' : 'loss') as 'profit' | 'accent' | 'loss',
            detail: '总盈 / 总亏',
          },
          {
            label: '盈亏比',
            value: stats?.avgWin != null && stats?.avgLoss != null && stats.avgLoss !== 0
              ? (stats.avgWin / Math.abs(stats.avgLoss)).toFixed(2)
              : '—',
            tone: 'accent' as const,
            detail: `均盈 $${stats?.avgWin?.toFixed(0) ?? '—'} / 均亏 $${stats?.avgLoss != null ? Math.abs(stats.avgLoss).toFixed(0) : '—'}`,
          },
          {
            label: '最大回撤',
            value: stats?.maxDrawdown != null ? formatCurrency(stats.maxDrawdown) : '—',
            tone: 'warn' as const,
            detail: stats?.maxDrawdownDate ? `发生于 ${stats.maxDrawdownDate}` : '风险压力点',
          },
          {
            label: '总交易',
            value: `${stats?.totalTrades ?? 0} 笔`,
            tone: 'neutral' as const,
            detail: `手续费 ${stats?.totalCommissions != null && !Number.isNaN(stats.totalCommissions) ? `-${formatCurrency(stats.totalCommissions)}` : '—'}`,
          },
        ].map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} tone={card.tone} detail={card.detail} />
        ))}
      </div>

      {/* ── Streaks ────────────────────────────────────────────────── */}
      {streaks && (
        <div className="streak-bar">
          <div className="streak-bar__item">
            <span>当前状态</span>
            <strong style={{ color: currentStreakTone }}>{currentStreakLabel}</strong>
          </div>
          <div className="streak-bar__divider" />
          <div className="streak-bar__item">
            <span>最长连胜</span>
            <strong style={{ color: 'var(--profit)' }}>{streaks.longestWin} 笔</strong>
          </div>
          <div className="streak-bar__item">
            <span>最长连亏</span>
            <strong style={{ color: 'var(--loss)' }}>{streaks.longestLoss} 笔</strong>
          </div>
        </div>
      )}

      {/* ── P&L Calendar ───────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <div className="card card--feature">
          <div className="card__header">
            <div>
              <p className="card__kicker">P&L Calendar</p>
              <h3 className="card__title card__title--large">月度盈亏日历</h3>
            </div>
          </div>
          <PnLCalendar sessions={sessions} />
        </div>
      )}

      {/* ── Equity curve (full width) ──────────────────────────────── */}
      <div className="card card--feature">
        <div className="card__header">
          <div>
            <p className="card__kicker">Equity Curve</p>
            <h3 className="card__title card__title--large">权益曲线</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="card__meta">红色虚线 = 最大回撤点</span>
            <div className="chart-toggle" role="tablist" aria-label="权益曲线显示方式">
              <button
                type="button"
                className={`chart-toggle__button ${curveMode === 'amount' ? 'chart-toggle__button--active' : ''}`}
                onClick={() => setCurveMode('amount')}
              >
                金额
              </button>
              <button
                type="button"
                className={`chart-toggle__button ${curveMode === 'percent' ? 'chart-toggle__button--active' : ''}`}
                onClick={() => setCurveMode('percent')}
              >
                百分比
              </button>
            </div>
          </div>
        </div>
        <EquityCurve data={equityCurve} mode={curveMode} variant="paper" />
      </div>

      {/* ── Drawdown (time-series group, right after equity) ───────── */}
      <div className="card">
        <div className="card__header">
          <div>
            <p className="card__kicker">Drawdown</p>
            <h3 className="card__title">回撤走势</h3>
          </div>
        </div>
        <DrawdownChart equityData={equityCurve} />
      </div>

      {/* ── Win/Loss + Daily PnL ───────────────────────────────────── */}
      <div className="grid-2">
        <div className="card">
          <div className="card__header">
            <div>
              <p className="card__kicker">Win/Loss Profile</p>
              <h3 className="card__title">胜率与盈亏结构</h3>
            </div>
          </div>
          <div className="analytics-split">
            <div className="analytics-split__chart">
              <WinRateDonut
                wins={stats?.wins ?? 0}
                losses={stats?.losses ?? 0}
                breakeven={stats?.breakeven ?? 0}
                winRate={stats?.winRate ?? 0}
              />
            </div>
            <div className="insight-list">
              {[
                { label: '盈利笔数', value: `${stats?.wins ?? 0}`, color: 'var(--profit)' },
                { label: '亏损笔数', value: `${stats?.losses ?? 0}`, color: 'var(--loss)' },
                ...(( stats?.breakeven ?? 0) > 0 ? [{ label: '持平笔数', value: `${stats?.breakeven}`, color: 'var(--ink-400)' }] : []),
                { label: '平均盈利', value: stats?.avgWin != null ? `+$${stats.avgWin.toFixed(2)}` : '—', color: 'var(--profit)' },
                { label: '平均亏损', value: stats?.avgLoss != null ? `-$${Math.abs(stats.avgLoss).toFixed(2)}` : '—', color: 'var(--loss)' },
                { label: '盈利因子', value: stats?.profitFactor != null ? (stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)) : '—', color: (stats?.profitFactor ?? 0) >= 1.5 ? 'var(--profit)' : 'var(--warn)' },
              ].map((row) => (
                <div key={row.label} className="insight-row">
                  <span>{row.label}</span>
                  <strong style={{ color: row.color }}>{row.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <div>
              <p className="card__kicker">Daily P&L</p>
              <h3 className="card__title">每日盈亏</h3>
            </div>
          </div>
          <DailyPnLBar data={dailyPnl} />
        </div>
      </div>

      {/* ── PnL Distribution (structure group) ────────────────────── */}
      <div className="card">
        <div className="card__header">
          <div>
            <p className="card__kicker">P&L Distribution</p>
            <h3 className="card__title">盈亏分布</h3>
          </div>
        </div>
        <PnLDistribution data={pnlDistribution} />
      </div>

      {/* ── Time Heatmap ───────────────────────────────────────────── */}
      <div className="card">
        <div className="card__header">
          <div>
            <p className="card__kicker">Session Timing</p>
            <h3 className="card__title">交易时段热力图</h3>
          </div>
          <span className="card__meta">按小时统计</span>
        </div>
        <TimeHeatmap data={timeHeatmap} />
      </div>

      {/* ── Direction split (Long vs Short) ───────────────────────── */}
      {directionStats && (directionStats.long.count > 0 || directionStats.short.count > 0) && (
        <div className="card">
          <div className="card__header">
            <div>
              <p className="card__kicker">Direction Analysis</p>
              <h3 className="card__title">多空对比</h3>
            </div>
          </div>
          <div className="direction-split">
            {(['long', 'short'] as const).map((side) => {
              const d = directionStats[side];
              const label = side === 'long' ? '做多' : '做空';
              const color = side === 'long' ? '#3b82f6' : '#f59e0b';
              return (
                <div key={side} className="direction-split__col">
                  <div className="direction-split__header" style={{ borderColor: color }}>
                    <span className="direction-split__badge" style={{ background: color }}>{label}</span>
                    <span className="direction-split__count">{d.count} 笔</span>
                  </div>
                  <div className="insight-list">
                    {[
                      { label: '胜率', value: `${d.winRate.toFixed(1)}%`, color: d.winRate >= 50 ? 'var(--profit)' : 'var(--loss)' },
                      { label: '总盈亏', value: `${d.totalPnl >= 0 ? '+' : ''}$${d.totalPnl.toFixed(2)}`, color: d.totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)' },
                      { label: '均盈', value: d.wins > 0 ? `+$${d.avgWin.toFixed(2)}` : '—', color: 'var(--profit)' },
                      { label: '均亏', value: d.losses > 0 ? `-$${Math.abs(d.avgLoss).toFixed(2)}` : '—', color: 'var(--loss)' },
                      { label: '均持仓时长', value: formatDur(d.avgDuration), color: 'var(--ink-700)' },
                    ].map((row) => (
                      <div key={row.label} className="insight-row">
                        <span>{row.label}</span>
                        <strong style={{ color: row.color, fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem' }}>{row.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Duration analysis ──────────────────────────────────────── */}
      {durationStats && tradeScatter.length > 0 && (
        <div className="grid-2">
          <div className="card">
            <div className="card__header">
              <div>
                <p className="card__kicker">Holding Time</p>
                <h3 className="card__title">持仓时间分析</h3>
              </div>
            </div>
            <div className="insight-list" style={{ marginBottom: 14 }}>
              {[
                { label: '全部均值', value: formatDur(durationStats.avgDuration),    color: 'var(--ink-700)' },
                { label: '盈利均值', value: formatDur(durationStats.avgWinDuration),  color: 'var(--profit)' },
                { label: '亏损均值', value: formatDur(durationStats.avgLossDuration), color: 'var(--loss)' },
                { label: '最长持仓', value: formatDur(durationStats.maxDuration),     color: 'var(--ink-600)' },
                { label: '最短持仓', value: formatDur(durationStats.minDuration),     color: 'var(--ink-600)' },
              ].map((row) => (
                <div key={row.label} className="insight-row">
                  <span>{row.label}</span>
                  <strong style={{ color: row.color, fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem' }}>{row.value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card__header">
              <div>
                <p className="card__kicker">Duration vs P&L</p>
                <h3 className="card__title">持仓时长 vs 盈亏</h3>
              </div>
            </div>
            <DurationScatter trades={tradeScatter} />
          </div>
        </div>
      )}

      {/* ── Trade Scatter ──────────────────────────────────────────── */}
      <div className="card">
        <div className="card__header">
          <div>
            <p className="card__kicker">Trade Scatter</p>
            <h3 className="card__title">交易散点图</h3>
          </div>
          <span className="card__meta">X轴 = 入场时间 · Y轴 = 盈亏 · 圆圈大小 = 手数</span>
        </div>
        <TradeScatter trades={tradeScatter} />
      </div>

    </div>
  );
}
