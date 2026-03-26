// API client - all fetch calls to backend

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeSessionSummary(payload: any): import('../types').SessionSummary {
  return {
    date: payload.date,
    instrument: payload.instrument ?? '',
    instrumentName: payload.instrument_name ?? payload.instrumentName ?? '',
    netPnl: Number(payload.net_pnl ?? payload.netPnl ?? 0),
    tradeCount: Number(payload.trade_count ?? payload.tradeCount ?? 0),
  };
}

export function normalizeJournalEntry(payload: any): import('../types').JournalEntry {
  return {
    sessionDate: payload.session_date ?? payload.sessionDate,
    emotionScore: payload.emotion_score ?? payload.emotionScore ?? 0,
    energyScore: payload.energy_score ?? payload.energyScore ?? 0,
    executionScore: payload.execution_score ?? payload.executionScore ?? 0,
    marketRegime: payload.market_regime ?? payload.marketRegime ?? '',
    premarketNotes: payload.premarket_notes ?? payload.premarketNotes ?? '',
    reviewSummary: payload.review_summary ?? payload.reviewSummary ?? '',
    whatWorked: toStringArray(payload.what_worked ?? payload.whatWorked),
    whatFailed: toStringArray(payload.what_failed ?? payload.whatFailed),
    nextFocus: payload.next_focus ?? payload.nextFocus ?? '',
    ruleBreaks: toStringArray(payload.rule_breaks ?? payload.ruleBreaks),
    updatedAt: payload.updated_at ?? payload.updatedAt ?? '',
  };
}

export function normalizeTrade(payload: any): import('../types').Trade {
  return {
    id: payload.id,
    sessionDate: payload.session_date ?? payload.sessionDate,
    instrument: payload.instrument ?? '',
    direction: payload.direction,
    entryTime: payload.entry_time ?? payload.entryTime,
    entryPrice: Number(payload.entry_price ?? payload.entryPrice ?? 0),
    exitTime: payload.exit_time ?? payload.exitTime,
    exitPrice: Number(payload.exit_price ?? payload.exitPrice ?? 0),
    qty: Number(payload.qty ?? 0),
    grossPnl: Number(payload.gross_pnl ?? payload.grossPnl ?? 0),
    commission: Number(payload.commission ?? 0),
    netPnl: Number(payload.net_pnl ?? payload.netPnl ?? 0),
    durationSeconds: Number(payload.duration_seconds ?? payload.durationSeconds ?? 0),
    annotation: payload.annotation ?? null,
  };
}

function normalizeOpenPosition(payload: any): import('../types').OpenPosition {
  return {
    id: payload.id,
    sessionDate: payload.session_date ?? payload.sessionDate,
    instrument: payload.instrument ?? '',
    side: payload.side,
    qty: Number(payload.qty ?? 0),
    entryTime: payload.entry_time ?? payload.entryTime ?? '',
    entryPrice: Number(payload.entry_price ?? payload.entryPrice ?? 0),
    markTime: payload.mark_time ?? payload.markTime ?? '',
    markPrice: Number(payload.mark_price ?? payload.markPrice ?? 0),
    openPnl: Number(payload.open_pnl ?? payload.openPnl ?? 0),
    orderId: payload.order_id ?? payload.orderId ?? '',
  };
}

function normalizeFill(payload: any): import('../types').Fill {
  return {
    id: payload.id,
    sessionDate: payload.session_date ?? payload.sessionDate,
    timestamp: payload.timestamp,
    side: payload.side,
    qty: Number(payload.qty ?? 0),
    price: Number(payload.price ?? 0),
    orderId: payload.order_id ?? payload.orderId ?? '',
    reason: payload.reason ?? null,
  };
}

export function normalizeSessionDetail(payload: any): import('../types').SessionDetail {
  return {
    session: {
      date: payload.session.date,
      instrument: payload.session.instrument ?? '',
      instrumentName: payload.session.instrument_name ?? payload.session.instrumentName ?? '',
      beginningBalance: Number(payload.session.beginning_balance ?? payload.session.beginningBalance ?? 0),
      endingBalance: Number(payload.session.ending_balance ?? payload.session.endingBalance ?? 0),
      grossPnl: Number(payload.session.gross_pnl ?? payload.session.grossPnl ?? 0),
      commissions: Number(payload.session.commissions ?? 0),
      netPnl: Number(payload.session.net_pnl ?? payload.session.netPnl ?? 0),
      realizedNetPnl: Number(payload.session.realized_net_pnl ?? payload.session.realizedNetPnl ?? 0),
      openTradeEquityChange: Number(payload.session.open_trade_equity_change ?? payload.session.openTradeEquityChange ?? 0),
      endingOpenTradeEquity: Number(payload.session.ending_open_trade_equity ?? payload.session.endingOpenTradeEquity ?? 0),
      tradeCount: Number(payload.session.trade_count ?? payload.session.tradeCount ?? 0),
      createdAt: payload.session.created_at ?? payload.session.createdAt ?? '',
      updatedAt: payload.session.updated_at ?? payload.session.updatedAt ?? '',
    },
    fills: (payload.fills ?? []).map(normalizeFill),
    trades: (payload.trades ?? []).map(normalizeTrade),
    openPositions: (payload.open_positions ?? payload.openPositions ?? []).map(normalizeOpenPosition),
    journal: payload.journal ? normalizeJournalEntry(payload.journal) : null,
  };
}

export function normalizeSessionMarketData(payload: any): import('../types').SessionMarketData {
  return {
    symbol: payload.symbol ?? '',
    timeframe: payload.timeframe ?? '1m',
    source: payload.source ?? '',
    note: payload.note ?? null,
    bars: (payload.bars ?? []).map((bar: any) => ({
      time: bar.time,
      open: Number(bar.open ?? 0),
      high: Number(bar.high ?? 0),
      low: Number(bar.low ?? 0),
      close: Number(bar.close ?? 0),
      volume: Number(bar.volume ?? 0),
    })),
    fills: (payload.fills ?? []).map(normalizeFill),
  };
}

export const api = {
  getAuthSession: () => request<{ authenticated: boolean }>('/auth/session'),
  login: (password: string) =>
    request<{ authenticated: boolean }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }),
  logout: () =>
    request<{ authenticated: boolean }>('/auth/logout', {
      method: 'POST',
    }),

  // Sessions
  getSessions: async () => {
    const result = await request<any[]>('/sessions');
    return result.map(normalizeSessionSummary);
  },
  getSession: async (date: string) => {
    const result = await request<any>(`/sessions/${date}`);
    return normalizeSessionDetail(result);
  },
  importPdf: (file: File) => {
    const form = new FormData();
    form.append('pdf', file);
    return request<any>('/sessions/import', {
      method: 'POST',
      body: form,
    }).then(normalizeSessionDetail);
  },
  deleteSession: (date: string) => request<void>(`/sessions/${date}`, { method: 'DELETE' }),
  updateJournal: (date: string, data: Partial<import('../types').JournalEntry>) =>
    request<any>(`/sessions/${date}/journal`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(normalizeJournalEntry),

  // Trades
  updateTradeAnnotation: (id: number, annotation: string) =>
    request<any>(`/trades/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annotation }),
    }).then(normalizeTrade),
  updateFillReason: (id: number, reason: string) =>
    request<any>(`/fills/${id}/reason`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }).then(normalizeFill),

  // Analytics
  getAnalytics: () => request<import('../types').AnalyticsData>('/analytics'),
  getSessionMarket: (date: string, timeframe: import('../types').SessionTimeframe) =>
    request<any>(`/sessions/${date}/market?timeframe=${encodeURIComponent(timeframe)}`)
      .then(normalizeSessionMarketData),
};
