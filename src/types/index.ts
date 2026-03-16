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
  journal: JournalEntry | null;
}

export interface AnalyticsData {
  equityCurve: Array<{ date: string; balance: number; netPnl: number }>;
  dailyPnl: Array<{ date: string; netPnl: number }>;
  tradeStats: {
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    maxDrawdown: number;
    maxDrawdownDate: string;
  };
  pnlDistribution: Array<{ range: string; count: number }>;
  timeHeatmap: Array<{ hour: number; totalPnl: number; tradeCount: number }>;
}

export type TabId = 'overview' | 'journal' | 'analytics' | 'review' | 'settings';

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
