import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FillTable } from './FillTable';

vi.mock('../../api/client', () => ({
  api: {
    updateFillReason: vi.fn(),
  },
}));

import { api } from '../../api/client';

const mockedApi = vi.mocked(api);

describe('FillTable', () => {
  it('lets the user save a reason for a fill', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    mockedApi.updateFillReason.mockResolvedValue({
      id: 1,
      sessionDate: '2026-03-14',
      timestamp: '2026-03-14T14:30:00Z',
      side: 'buy',
      qty: 1,
      price: 5600.5,
      orderId: 'abc',
      reason: 'Opening drive continuation',
    } as any);

    render(
      <FillTable
        fills={[
          {
            id: 1,
            sessionDate: '2026-03-14',
            timestamp: '2026-03-14T14:30:00Z',
            side: 'buy',
            qty: 1,
            price: 5600.5,
            orderId: 'abc',
            reason: null,
          },
        ]}
        onUpdate={onUpdate}
      />,
    );

    await user.click(screen.getByRole('button', { name: '理由' }));
    await user.type(screen.getByPlaceholderText('记录这一笔买卖原因...'), 'Opening drive continuation');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(mockedApi.updateFillReason).toHaveBeenCalledWith(1, 'Opening drive continuation');
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ reason: 'Opening drive continuation' }));
  });
});
