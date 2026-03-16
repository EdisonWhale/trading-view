import { render, screen } from '@testing-library/react';
import Analytics from './Analytics';

vi.mock('../api/client', () => ({
  api: {
    getAnalytics: vi.fn(),
  },
}));

vi.mock('../components/MetricCard', () => ({
  MetricCard: ({ label, value }: { label: string; value: string }) => (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  ),
}));

vi.mock('../components/charts/EquityCurve', () => ({
  EquityCurve: () => <div>Equity Curve Mock</div>,
}));
vi.mock('../components/charts/DailyPnLBar', () => ({
  DailyPnLBar: () => <div>Daily PnL Mock</div>,
}));
vi.mock('../components/charts/PnLDistribution', () => ({
  PnLDistribution: () => <div>Distribution Mock</div>,
}));
vi.mock('../components/charts/WinRateDonut', () => ({
  WinRateDonut: () => <div>Win Rate Mock</div>,
}));
vi.mock('../components/charts/TimeHeatmap', () => ({
  TimeHeatmap: () => <div>Time Heatmap Mock</div>,
}));
vi.mock('../components/charts/DrawdownChart', () => ({
  DrawdownChart: () => <div>Drawdown Mock</div>,
}));
vi.mock('../components/charts/TradeScatter', () => ({
  TradeScatter: ({ trades }: { trades: Array<{ entryTime: string }> }) => (
    <div>{`Trade Scatter Count: ${trades.length} / ${trades.map((trade) => trade.entryTime).join(',')}`}</div>
  ),
}));

import { api } from '../api/client';

const mockedApi = vi.mocked(api);

describe('Analytics', () => {
  it('does not render a page band when analytics data is empty', async () => {
    mockedApi.getAnalytics.mockResolvedValue({
      equityCurve: [],
      dailyPnl: [],
      tradeStats: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        maxDrawdownDate: '',
      },
      pnlDistribution: [],
      timeHeatmap: [],
      tradeScatter: [],
    } as any);

    const { container } = render(<Analytics />);

    expect(await screen.findByText('暂无可分析样本')).toBeInTheDocument();
    expect(container.querySelector('.page-band')).not.toBeInTheDocument();
  });

  it('passes real trade-level scatter data instead of one point per equity day', async () => {
    mockedApi.getAnalytics.mockResolvedValue({
      equityCurve: [
        { date: '2026-03-10', balance: 5000, netPnl: 0 },
        { date: '2026-03-11', balance: 5010, netPnl: 10 },
        { date: '2026-03-12', balance: 4990, netPnl: -20 },
      ],
      dailyPnl: [],
      tradeStats: {
        totalTrades: 2,
        wins: 1,
        losses: 1,
        winRate: 50,
        avgWin: 20,
        avgLoss: -10,
        profitFactor: 2,
        maxDrawdown: 20,
        maxDrawdownDate: '2026-03-12',
      },
      pnlDistribution: [],
      timeHeatmap: [],
      tradeScatter: [
        { entryTime: '2026-03-12T09:30:00', netPnl: 20, qty: 1, direction: 'long' },
        { entryTime: '2026-03-12T10:15:00', netPnl: -10, qty: 2, direction: 'short' },
      ],
    } as any);

    const { container } = render(<Analytics />);

    expect(await screen.findByText(
      'Trade Scatter Count: 2 / 2026-03-12T09:30:00,2026-03-12T10:15:00'
    )).toBeInTheDocument();
    expect(container.querySelector('.page-band')).not.toBeInTheDocument();
  });
});
