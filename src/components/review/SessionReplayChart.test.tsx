import { render, screen } from '@testing-library/react';
import { SessionReplayChart } from './SessionReplayChart';

describe('SessionReplayChart', () => {
  it('renders a chart-focused shell with only market overlays and the chart viewport', () => {
    const { rerender } = render(
      <SessionReplayChart
        data={{
          symbol: 'ES=F',
          timeframe: '1m',
          source: 'yahoo-finance',
          note: null,
          bars: [
            { time: '2026-03-14T14:30:00Z', open: 5600, high: 5602, low: 5599.5, close: 5601.25, volume: 150 },
            { time: '2026-03-14T14:31:00Z', open: 5601.25, high: 5603, low: 5600.75, close: 5602.5, volume: 175 },
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
        }}
        showMarkers
      />,
    );

    expect(screen.getByText('VWAP')).toBeInTheDocument();
    expect(screen.getByText('EMA200')).toBeInTheDocument();
    expect(screen.getByText('成交量')).toBeInTheDocument();
    expect(screen.getByText('买卖点')).toBeInTheDocument();
    expect(screen.getByText('图表在浏览器中渲染')).toBeInTheDocument();
    expect(screen.queryByText('Execution Tape')).not.toBeInTheDocument();
    expect(screen.queryByText('买卖原因')).not.toBeInTheDocument();

    rerender(
      <SessionReplayChart
        data={{
          symbol: 'ES=F',
          timeframe: '1m',
          source: 'yahoo-finance',
          note: null,
          bars: [
            { time: '2026-03-14T14:30:00Z', open: 5600, high: 5602, low: 5599.5, close: 5601.25, volume: 150 },
            { time: '2026-03-14T14:31:00Z', open: 5601.25, high: 5603, low: 5600.75, close: 5602.5, volume: 175 },
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
        }}
        showMarkers={false}
      />,
    );

    expect(screen.queryByText('买卖点')).not.toBeInTheDocument();
  });
});
