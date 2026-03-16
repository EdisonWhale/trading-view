import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock the lazy-loaded pages to avoid async issues in tests
vi.mock('./pages/Overview', () => ({
  default: () => <div><h1>概览</h1><p>总交易</p></div>,
}));
vi.mock('./pages/Journal', () => ({
  default: () => <div><h1>交易日志</h1></div>,
}));
vi.mock('./pages/Analytics', () => ({
  default: () => <div><h1>图表分析</h1></div>,
}));
vi.mock('./pages/Review', () => ({
  default: () => <div><h1>复盘</h1></div>,
}));
vi.mock('./pages/Settings', () => ({
  default: () => <div><h1>设置</h1></div>,
}));

describe('App', () => {
  it('renders the tab navigation', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: '概览' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /概览/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /交易日志/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /图表分析/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /复盘/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /设置/ })).toBeInTheDocument();
  });

  it('shows Overview page by default', async () => {
    render(<App />);
    // Wait for Suspense to resolve
    expect(await screen.findByRole('heading', { name: '概览' })).toBeInTheDocument();
  });

  it('switches to Journal tab when clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Click the 交易日志 tab button in the nav
    const navButtons = screen.getAllByText('交易日志');
    // The nav button is the one inside tab-nav
    await user.click(navButtons[0]);

    expect(await screen.findByRole('heading', { name: '交易日志' })).toBeInTheDocument();
  });

  it('switches to Analytics tab when clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /图表分析/ }));
    expect(await screen.findByRole('heading', { name: '图表分析' })).toBeInTheDocument();
  });

  it('switches to Settings tab when clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /设置/ }));
    expect(await screen.findByRole('heading', { name: '设置' })).toBeInTheDocument();
  });
});
