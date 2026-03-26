// Shared types for frontend

export interface Session {
  date: string;          // 'YYYY-MM-DD'
  instrument: string;    // 'MESH6'
  instrumentName: string;
  beginningBalance: number;
  endingBalance: number;
  grossPnl: number;
  commissions: number;
  netPnl: number;
  realizedNetPnl: number;
  openTradeEquityChange: number;
  endingOpenTradeEquity: number;
  tradeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionSummary {
  date: string;
  instrument: string;
  instrumentName: string;
  netPnl: number;
  tradeCount: number;
}

export interface Fill {
  id: number;
  sessionDate: string;
  timestamp: string;
  side: 'buy' | 'sell';
  qty: number;
  price: number;
  orderId: string;
  reason: string | null;
}

export interface Trade {
  id: number;
  sessionDate: string;
  instrument: string;
  direction: 'long' | 'short';
  entryTime: string;
  entryPrice: number;
  exitTime: string;
  exitPrice: number;
  qty: number;
  grossPnl: number;
  commission: number;
  netPnl: number;
  durationSeconds: number;
  annotation: string | null;
}

export interface OpenPosition {
  id: number;
  sessionDate: string;
  instrument: string;
  side: 'long' | 'short';
  qty: number;
  entryTime: string;
  entryPrice: number;
  markTime: string;
  markPrice: number;
  openPnl: number;
  orderId: string;
}

export interface JournalEntry {
  sessionDate: string;
  emotionScore: number;      // 1-10
  energyScore: number;       // 1-10
  executionScore: number;    // 1-10
  marketRegime: '趋势' | '震荡' | '混合' | '';
  premarketNotes: string;
  reviewSummary: string;
  whatWorked: string[];
  whatFailed: string[];
  nextFocus: string;
  ruleBreaks: string[];
  updatedAt: string;
}

export interface SessionDetail {
  session: Session;
  fills: Fill[];
  trades: Trade[];
  openPositions: OpenPosition[];
  journal: JournalEntry | null;
}

export interface AnalyticsData {
  equityCurve: Array<{ date: string; balance: number; netPnl: number }>;
  dailyPnl: Array<{ date: string; netPnl: number }>;
  tradeScatter: Array<{ entryTime: string; netPnl: number; qty: number; direction: string; durationSeconds: number }>;
  directionStats: {
    long: { count: number; wins: number; losses: number; winRate: number; totalPnl: number; avgWin: number; avgLoss: number; avgDuration: number };
    short: { count: number; wins: number; losses: number; winRate: number; totalPnl: number; avgWin: number; avgLoss: number; avgDuration: number };
  };
  durationStats: {
    avgDuration: number;
    avgWinDuration: number;
    avgLossDuration: number;
    maxDuration: number;
    minDuration: number;
  };
  tradeStats: {
    totalTrades: number;
    wins: number;
    losses: number;
    breakeven: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    maxDrawdown: number;
    maxDrawdownDate: string;
    totalSessions: number;
    totalNetPnl: number;
    totalCommissions: number;
    maxWin: number;
    maxLoss: number;
  };
  pnlDistribution: Array<{ range: string; count: number }>;
  timeHeatmap: Array<{ hour: number; totalPnl: number; tradeCount: number }>;
  streaks: {
    current: { type: 'win' | 'loss' | 'none'; count: number };
    longestWin: number;
    longestLoss: number;
  };
}

export type TabId = 'overview' | 'journal' | 'analytics' | 'review' | 'settings';
export type SessionTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface ReplayBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SessionMarketData {
  symbol: string;
  timeframe: SessionTimeframe;
  source: string;
  note: string | null;
  bars: ReplayBar[];
  fills: Fill[];
}

// Chart indicator types (used by SessionChart / indicators.ts)
export interface MarketBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}
