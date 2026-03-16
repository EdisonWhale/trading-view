import { render, screen, within } from '@testing-library/react';
import Overview from './Overview';

vi.mock('../api/client', () => ({
  api: {
    getAnalytics: vi.fn(),
    getSessions: vi.fn(),
  },
}));

vi.mock('../components/MetricCard', () => ({
  MetricCard: ({ label, value, detail }: { label: string; value: string; detail: string }) => (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  ),
}));

vi.mock('../components/charts/EquityCurve', () => ({
  EquityCurve: ({ mode, variant }: { mode: 'amount' | 'percent'; variant: 'paper' | 'terminal' }) => (
    <div>{`Equity Curve Mock: ${mode} / ${variant}`}</div>
  ),
}));

import { api } from '../api/client';
import userEvent from '@testing-library/user-event';

const mockedApi = vi.mocked(api);

describe('Overview', () => {
  it('uses the newest five sessions for the status callout and recent sessions table', async () => {
    mockedApi.getAnalytics.mockResolvedValue({
      equityCurve: [
        { date: '2026-03-10', balance: 5000, netPnl: 0 },
        { date: '2026-03-11', balance: 5010, netPnl: 10 },
      ],
      dailyPnl: [],
      tradeScatter: [],
      tradeStats: {
        totalTrades: 10,
        wins: 6,
        losses: 4,
        breakeven: 0,
        winRate: 60,
        avgWin: 50,
        avgLoss: -30,
        profitFactor: 1.67,
        maxDrawdown: 120,
        maxDrawdownDate: '2026-03-11',
        totalSessions: 6,
        totalNetPnl: 25,
        totalCommissions: 18,
        maxWin: 50,
        maxLoss: -30,
      },
      pnlDistribution: [],
      timeHeatmap: [],
      streaks: {
        current: { type: 'win', count: 2 },
        longestWin: 3,
        longestLoss: 1,
      },
      directionStats: {
        long: { count: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0, avgWin: 0, avgLoss: 0, avgDuration: 0 },
        short: { count: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0, avgWin: 0, avgLoss: 0, avgDuration: 0 },
      },
      durationStats: {
        avgDuration: 0,
        avgWinDuration: 0,
        avgLossDuration: 0,
        maxDuration: 0,
        minDuration: 0,
      },
    });

    mockedApi.getSessions.mockResolvedValue([
      { date: '2026-03-14', instrument: 'MES', instrumentName: 'MES', netPnl: 20, tradeCount: 2 },
      { date: '2026-03-13', instrument: 'MES', instrumentName: 'MES', netPnl: -10, tradeCount: 3 },
      { date: '2026-03-12', instrument: 'MES', instrumentName: 'MES', netPnl: 15, tradeCount: 2 },
      { date: '2026-03-11', instrument: 'MES', instrumentName: 'MES', netPnl: 25, tradeCount: 4 },
      { date: '2026-03-10', instrument: 'MES', instrumentName: 'MES', netPnl: 5, tradeCount: 1 },
      { date: '2026-03-09', instrument: 'MES', instrumentName: 'MES', netPnl: -30, tradeCount: 5 },
    ]);

    render(<Overview />);

    expect(await screen.findByText(/最近一次记录为 2026-03-14/)).toBeInTheDocument();

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByText('2026年3月14日')).toBeInTheDocument();
    expect(within(rows[5]).queryByText('2026年3月9日')).not.toBeInTheDocument();
  });

  it('places the equity curve in the overview band and lets the user switch amount/percent mode', async () => {
    mockedApi.getAnalytics.mockResolvedValue({
      equityCurve: [
        { date: '2026-03-10', balance: 5000, netPnl: 0 },
        { date: '2026-03-11', balance: 5100, netPnl: 100 },
      ],
      dailyPnl: [],
      tradeScatter: [],
      tradeStats: {
        totalTrades: 2,
        wins: 1,
        losses: 1,
        breakeven: 0,
        winRate: 50,
        avgWin: 100,
        avgLoss: -50,
        profitFactor: 2,
        maxDrawdown: 50,
        maxDrawdownDate: '2026-03-11',
        totalSessions: 1,
        totalNetPnl: 100,
        totalCommissions: 5,
        maxWin: 100,
        maxLoss: -50,
      },
      pnlDistribution: [],
      timeHeatmap: [],
      streaks: {
        current: { type: 'win', count: 1 },
        longestWin: 1,
        longestLoss: 1,
      },
      directionStats: {
        long: { count: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0, avgWin: 0, avgLoss: 0, avgDuration: 0 },
        short: { count: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0, avgWin: 0, avgLoss: 0, avgDuration: 0 },
      },
      durationStats: {
        avgDuration: 0,
        avgWinDuration: 0,
        avgLossDuration: 0,
        maxDuration: 0,
        minDuration: 0,
      },
    });

    mockedApi.getSessions.mockResolvedValue([
      { date: '2026-03-11', instrument: 'MES', instrumentName: 'MES', netPnl: 100, tradeCount: 2 },
    ]);

    const user = userEvent.setup();
    render(<Overview />);

    expect(await screen.findByText('Equity Curve Mock: amount / paper')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '金额' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '百分比' })).toBeInTheDocument();

    const overviewBand = screen.getByText('账户总览').closest('.page-band');
    expect(overviewBand).toHaveClass('page-band--overview');

    const sampleStatus = screen.getByText('样本状态').closest('.page-band__aside');
    expect(sampleStatus).toHaveClass('page-band__aside--overview');

    await user.click(screen.getByRole('button', { name: '百分比' }));

    expect(screen.getByText('Equity Curve Mock: percent / paper')).toBeInTheDocument();
  });
});
