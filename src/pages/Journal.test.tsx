import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Journal from './Journal';

vi.mock('../api/client', () => ({
  api: {
    getSessions: vi.fn(),
    getAnalytics: vi.fn(),
    getSession: vi.fn(),
  },
}));

vi.mock('../components/journal/PdfUpload', () => ({
  PdfUpload: () => <div>PDF Upload Mock</div>,
}));

vi.mock('../components/journal/FillTable', () => ({
  FillTable: () => <div>Fill Table Mock</div>,
}));

vi.mock('../components/journal/TradeList', () => ({
  TradeList: () => <div>Trade List Mock</div>,
}));

vi.mock('../components/journal/JournalForm', () => ({
  JournalForm: () => <div>Journal Form Mock</div>,
}));

vi.mock('../components/journal/OpenPositionList', () => ({
  OpenPositionList: () => <div>Open Position List Mock</div>,
}));

import { api } from '../api/client';

const mockedApi = vi.mocked(api);

describe('Journal', () => {
  it('does not render a page band before the workspace content', async () => {
    mockedApi.getSessions.mockResolvedValue([
      {
        date: '2026-03-14',
        instrument: 'MES',
        instrumentName: 'Micro E-mini S&P 500',
        netPnl: 125,
        tradeCount: 2,
      },
    ] as any);

    mockedApi.getAnalytics.mockResolvedValue({
      equityCurve: [],
      dailyPnl: [],
      tradeScatter: [],
      tradeStats: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        breakeven: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        maxDrawdownDate: '',
        totalSessions: 0,
        totalNetPnl: 0,
        totalCommissions: 0,
        maxWin: 0,
        maxLoss: 0,
      },
      pnlDistribution: [],
      timeHeatmap: [],
    } as any);

    mockedApi.getSession.mockResolvedValue({
      session: {
        date: '2026-03-14',
        instrument: 'MES',
        instrumentName: 'Micro E-mini S&P 500',
        beginningBalance: 10000,
        endingBalance: 10125,
        grossPnl: 130,
        commissions: 5,
        netPnl: 125,
        realizedNetPnl: 125,
        openTradeEquityChange: 0,
        endingOpenTradeEquity: 0,
        tradeCount: 2,
        createdAt: '2026-03-14T00:00:00Z',
        updatedAt: '2026-03-14T00:00:00Z',
      },
      fills: [],
      trades: [
        {
          id: 1,
          sessionDate: '2026-03-14',
          instrument: 'MES',
          direction: 'long',
          entryTime: '2026-03-14T09:30:00Z',
          entryPrice: 5000,
          exitTime: '2026-03-14T09:35:00Z',
          exitPrice: 5005,
          qty: 1,
          grossPnl: 25,
          commission: 2.5,
          netPnl: 22.5,
          durationSeconds: 300,
          annotation: null,
        },
      ],
      openPositions: [],
      journal: null,
    } as any);

    const { container } = render(<Journal />);

    expect(await screen.findByText('Trade List Mock')).toBeInTheDocument();
    expect(container.querySelector('.page-band')).not.toBeInTheDocument();
  });

  it('surfaces open carry positions as a separate section', async () => {
    mockedApi.getSessions.mockResolvedValue([
      {
        date: '2026-03-16',
        instrument: 'MESM6',
        instrumentName: 'Micro E-mini S&P 500',
        netPnl: -196.48,
        tradeCount: 1,
      },
    ] as any);

    mockedApi.getAnalytics.mockResolvedValue({
      equityCurve: [],
      dailyPnl: [],
      tradeScatter: [],
      tradeStats: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        breakeven: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        maxDrawdownDate: '',
        totalSessions: 0,
        totalNetPnl: 0,
        totalCommissions: 0,
        maxWin: 0,
        maxLoss: 0,
      },
      pnlDistribution: [],
      timeHeatmap: [],
    } as any);

    mockedApi.getSession.mockResolvedValue({
      session: {
        date: '2026-03-16',
        instrument: 'MESM6',
        instrumentName: 'Micro E-mini S&P 500',
        beginningBalance: 4765.58,
        endingBalance: 4569.1,
        grossPnl: -193.75,
        commissions: 2.73,
        netPnl: -196.48,
        realizedNetPnl: 14.77,
        openTradeEquityChange: -211.25,
        endingOpenTradeEquity: -211.25,
        tradeCount: 1,
        createdAt: '2026-03-16T00:00:00Z',
        updatedAt: '2026-03-16T00:00:00Z',
      },
      fills: [],
      trades: [],
      openPositions: [
        {
          id: 1,
          sessionDate: '2026-03-16',
          instrument: 'MESH6',
          side: 'short',
          qty: 1,
          entryTime: '2026-03-16T07:36:31Z',
          entryPrice: 6662.5,
          markTime: '2026-03-16T00:00:00Z',
          markPrice: 6704.75,
          openPnl: -211.25,
          orderId: '1250300280',
        },
      ],
      journal: null,
    } as any);

    const user = userEvent.setup();
    render(<Journal />);

    expect(await screen.findByRole('button', { name: '未平仓持仓 (1)' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '未平仓持仓 (1)' }));

    expect(screen.getByText('Open Position List Mock')).toBeInTheDocument();
  });
});
