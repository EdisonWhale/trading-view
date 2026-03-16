export type MarketRegime = 'trend' | 'rotation' | 'mixed' | 'offline';

export interface SetupPerformance {
  name: string;
  trades: number;
  wins: number;
  pnl: number;
}

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface Execution {
  id: string;
  timestamp: number;
  timeLabel: string;
  side: 'buy' | 'sell';
  qty: number;
  price: number;
  pnl?: number;
  tag: 'entry' | 'exit' | 'add' | 'trim';
  note: string;
}

export interface SessionLevel {
  label: string;
  price: number;
  tone: 'support' | 'resistance' | 'warning';
}

export interface ReviewNote {
  summary: string;
  whatWorked: string[];
  whatFailed: string[];
  nextFocus: string;
 }

export interface TradingDay {
  sessionDate: string;
  startBalance: number;
  deposits: number;
  endBalance: number;
  realizedPnl: number;
  marketRegime: MarketRegime;
  ruleBreaks: string[];
  setups: SetupPerformance[];
  contract: string;
  headline: string;
  emotionScore: number;
  planChecklist: ChecklistItem[];
  review: ReviewNote;
  executions: Execution[];
  levels: SessionLevel[];
  bars: MarketBar[];
}

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
