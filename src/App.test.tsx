import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

vi.mock('./api/client', () => ({
  api: {
    getSessions: vi.fn().mockResolvedValue([
      { date: '2026-03-14', instrument: 'MES', instrumentName: 'MES', netPnl: 20, tradeCount: 2 },
      { date: '2026-03-13', instrument: 'MES', instrumentName: 'MES', netPnl: -10, tradeCount: 3 },
      { date: '2026-03-12', instrument: 'MES', instrumentName: 'MES', netPnl: 15, tradeCount: 2 },
    ]),
  },
}));

// Mock the lazy-loaded pages to avoid async issues in tests
vi.mock('./pages/Overview', () => ({
  default: () => <div><p>总交易</p></div>,
}));
vi.mock('./pages/Journal', () => ({
  default: () => <div>交易日志内容</div>,
}));
vi.mock('./pages/Analytics', () => ({
  default: () => <div>图表分析内容</div>,
}));
vi.mock('./pages/Review', () => ({
  default: () => <div>复盘内容</div>,
}));
vi.mock('./pages/Settings', () => ({
  default: () => <div>设置内容</div>,
}));

describe('App', () => {
  it('renders the tab navigation', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: '概览' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /概览/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /交易日志/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /图表分析/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /复盘/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /设置/ })).toBeInTheDocument();
  });

  it('shows Overview page by default', async () => {
    render(<App />);
    // Wait for Suspense to resolve
    expect(await screen.findByRole('heading', { level: 1, name: '概览' })).toBeInTheDocument();
  });

  it('shows report date and trading day count in the topbar status', async () => {
    render(<App />);

    expect(await screen.findByText('报告日期')).toBeInTheDocument();
    expect(screen.getByText(/\d{4}-\d{2}-\d{2}/)).toBeInTheDocument();
    expect(screen.getByText('交易天数')).toBeInTheDocument();
    expect(await screen.findByText('3 天')).toBeInTheDocument();
  });

  it('does not render extra slogan descriptions in the shell', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: '概览' })).toBeInTheDocument();
    expect(screen.queryByText('本地交易复盘软件')).not.toBeInTheDocument();
    expect(screen.queryByText('导入 / 复盘 / 导出')).not.toBeInTheDocument();
    expect(screen.queryByText('盈亏、回撤、交易天数')).not.toBeInTheDocument();
  });

  it('switches to Journal tab when clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Click the 交易日志 tab button in the nav
    const navButtons = screen.getAllByText('交易日志');
    // The nav button is the one inside tab-nav
    await user.click(navButtons[0]);

    expect(await screen.findByRole('heading', { level: 1, name: '交易日志' })).toBeInTheDocument();
  });

  it('switches to Analytics tab when clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /图表分析/ }));
    expect(await screen.findByRole('heading', { level: 1, name: '图表分析' })).toBeInTheDocument();
  });

  it('switches to Settings tab when clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /设置/ }));
    expect(await screen.findByRole('heading', { level: 1, name: '系统设置' })).toBeInTheDocument();
  });
});
