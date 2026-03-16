import { render, screen } from '@testing-library/react';
import Review from './Review';

vi.mock('../api/client', () => ({
  api: {
    getSessions: vi.fn(),
    getSession: vi.fn(),
  },
}));

vi.mock('../components/journal/JournalForm', () => ({
  JournalForm: () => <div>Journal Form Mock</div>,
}));

import { api } from '../api/client';

const mockedApi = vi.mocked(api);

describe('Review', () => {
  it('does not render a page band above the review workspace', async () => {
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

    const { container } = render(<Review />);

    expect(await screen.findByText('Journal Form Mock')).toBeInTheDocument();
    expect(container.querySelector('.page-band')).not.toBeInTheDocument();
  });
});
