import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { MetricCard } from '../components/MetricCard';
import { EquityCurve } from '../components/charts/EquityCurve';
import { DailyPnLBar } from '../components/charts/DailyPnLBar';
import { PnLDistribution } from '../components/charts/PnLDistribution';
import { WinRateDonut } from '../components/charts/WinRateDonut';
import { TimeHeatmap } from '../components/charts/TimeHeatmap';
import { DrawdownChart } from '../components/charts/DrawdownChart';
import { TradeScatter } from '../components/charts/TradeScatter';
import { formatCurrency } from '../lib/format';
import type { AnalyticsData } from '../types';

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics().then(setData).catch(() => {}).finally(() => setLoading(false));
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

  const { tradeStats: stats, equityCurve, dailyPnl, pnlDistribution, timeHeatmap, tradeScatter } = data;

  return (
    <div className="page-stack">
      <div className="metrics-grid">
        {[
          { label: '总交易', value: `${stats?.totalTrades ?? 0} 笔`, tone: 'neutral' as const, detail: '样本总量' },
          { label: '胜率', value: stats?.winRate != null ? `${stats.winRate.toFixed(1)}%` : '—', tone: ((stats?.winRate ?? 0) >= 50 ? 'profit' : 'loss') as 'profit' | 'loss', detail: '盈利交易占比' },
          { label: '盈亏比', value: stats?.avgWin != null && stats?.avgLoss != null && stats.avgLoss !== 0 ? (stats.avgWin / Math.abs(stats.avgLoss)).toFixed(2) : '—', tone: 'accent' as const, detail: '均盈 / 均亏' },
          { label: '最大回撤', value: stats?.maxDrawdown != null ? formatCurrency(stats.maxDrawdown) : '—', tone: 'warn' as const, detail: '风险压力点' },
        ].map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} tone={card.tone} detail={card.detail} />
        ))}
      </div>

      <div className="card card--feature">
        <div className="card__header">
          <div>
            <p className="card__kicker">Equity Curve</p>
            <h3 className="card__title card__title--large">权益曲线</h3>
          </div>
          <span className="card__meta">红色虚线 = 最大回撤点</span>
        </div>
        <EquityCurve data={equityCurve} mode="amount" variant="paper" />
      </div>

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
              <WinRateDonut wins={stats?.wins ?? 0} losses={stats?.losses ?? 0} winRate={stats?.winRate ?? 0} />
            </div>
            <div className="insight-list">
              {[
                { label: '盈利笔数', value: `${stats?.wins ?? 0}`, color: 'var(--profit)' },
                { label: '亏损笔数', value: `${stats?.losses ?? 0}`, color: 'var(--loss)' },
                { label: '平均盈利', value: stats?.avgWin != null ? `+$${stats.avgWin.toFixed(2)}` : '—', color: 'var(--profit)' },
                { label: '平均亏损', value: stats?.avgLoss != null ? `-$${Math.abs(stats.avgLoss).toFixed(2)}` : '—', color: 'var(--loss)' },
                { label: '盈利因子', value: stats?.profitFactor != null ? stats.profitFactor.toFixed(2) : '—', color: (stats?.profitFactor ?? 0) >= 1.5 ? 'var(--profit)' : 'var(--warn)' },
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

      <div className="grid-2">
        <div className="card">
          <div className="card__header">
            <div>
              <p className="card__kicker">Drawdown</p>
              <h3 className="card__title">回撤走势</h3>
            </div>
          </div>
          <DrawdownChart equityData={equityCurve} />
        </div>

        <div className="card">
          <div className="card__header">
            <div>
              <p className="card__kicker">P&L Distribution</p>
              <h3 className="card__title">盈亏分布</h3>
            </div>
          </div>
          <PnLDistribution data={pnlDistribution} />
        </div>
      </div>

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

      <div className="card">
        <div className="card__header">
          <div>
            <p className="card__kicker">Trade Scatter</p>
            <h3 className="card__title">交易散点图</h3>
          </div>
          <span className="card__meta">每笔交易盈亏分布</span>
        </div>
        <TradeScatter trades={tradeScatter} />
      </div>
    </div>
  );
}
