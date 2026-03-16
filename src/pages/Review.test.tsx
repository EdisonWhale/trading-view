import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Review from './Review';

vi.mock('../api/client', () => ({
  api: {
    getSessions: vi.fn(),
    getSession: vi.fn(),
    getSessionMarket: vi.fn(),
  },
}));

vi.mock('../components/journal/JournalForm', () => ({
  JournalForm: () => <div>Journal Form Mock</div>,
}));

import { api } from '../api/client';

const mockedApi = vi.mocked(api);

describe('Review', () => {
  it('renders the terminal full width and keeps the date rail with the journal area', async () => {
    mockedApi.getSessions.mockResolvedValue([
      {
        date: '2026-03-14',
        instrument: 'MES',
        instrumentName: 'Micro E-mini S&P 500',
        netPnl: 125,
        tradeCount: 2,
      },
    ] as any);

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
        tradeCount: 2,
        createdAt: '2026-03-14T00:00:00Z',
        updatedAt: '2026-03-14T00:00:00Z',
      },
      fills: [],
      trades: [],
      journal: null,
      } as any);

    mockedApi.getSessionMarket.mockResolvedValue({
      symbol: 'ES=F',
      timeframe: '1m',
      source: 'yahoo-finance',
      note: null,
      bars: [
        { time: '2026-03-14T14:30:00Z', open: 5600, high: 5601, low: 5599.5, close: 5600.5, volume: 100 },
      ],
      fills: [
        {
          id: 1,
          sessionDate: '2026-03-14',
          timestamp: '2026-03-14T14:30:00Z',
          side: 'buy',
          qty: 1,
          price: 5600.5,
          orderId: 'abc',
          reason: 'Opening drive continuation',
        },
      ],
    } as any);

    const user = userEvent.setup();
    const { container } = render(<Review />);

    expect(await screen.findByText('Journal Form Mock')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '1分钟' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '日线' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '隐藏买卖点' })).toBeInTheDocument();
    expect(screen.getByText('复盘交易走势')).toBeInTheDocument();
    expect(screen.getByText('VWAP')).toBeInTheDocument();
    expect(screen.getByText('EMA200')).toBeInTheDocument();
    expect(screen.getByText('成交量')).toBeInTheDocument();
    expect(screen.getByText('买卖点')).toBeInTheDocument();
    expect(screen.queryByText('交易终端')).not.toBeInTheDocument();
    expect(screen.queryByText('Execution Tape')).not.toBeInTheDocument();
    expect(container.querySelector('.page-band')).not.toBeInTheDocument();
    expect(container.querySelector('.review-terminal-stack')).toBeInTheDocument();
    expect(container.querySelector('.review-lower-grid')).toBeInTheDocument();
    expect(container.querySelector('.review-lower-grid > .session-rail')).toBeInTheDocument();
    expect(container.querySelector('.review-lower-grid > .detail-column')).toBeInTheDocument();
    expect(container.querySelector('.review-terminal-stack .session-rail')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '隐藏买卖点' }));

    expect(screen.getByRole('button', { name: '显示买卖点' })).toBeInTheDocument();
    expect(screen.queryByText('买卖点')).not.toBeInTheDocument();
  });
});
