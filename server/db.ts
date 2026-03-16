import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'trading.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    date TEXT PRIMARY KEY,
    instrument TEXT,
    instrument_name TEXT,
    beginning_balance REAL,
    ending_balance REAL,
    gross_pnl REAL,
    commissions REAL,
    net_pnl REAL,
    trade_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS fills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_date TEXT NOT NULL,
    timestamp TEXT,
    side TEXT,
    qty INTEGER,
    price REAL,
    order_id TEXT,
    reason TEXT,
    FOREIGN KEY (session_date) REFERENCES sessions(date) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_date TEXT NOT NULL,
    instrument TEXT,
    direction TEXT,
    entry_time TEXT,
    entry_price REAL,
    exit_time TEXT,
    exit_price REAL,
    qty INTEGER,
    gross_pnl REAL,
    commission REAL,
    net_pnl REAL,
    duration_seconds INTEGER,
    annotation TEXT,
    FOREIGN KEY (session_date) REFERENCES sessions(date) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    session_date TEXT PRIMARY KEY,
    emotion_score INTEGER,
    energy_score INTEGER,
    execution_score INTEGER,
    market_regime TEXT,
    premarket_notes TEXT,
    review_summary TEXT,
    what_worked TEXT,
    what_failed TEXT,
    next_focus TEXT,
    rule_breaks TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_date) REFERENCES sessions(date) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS market_bars (
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    bar_time TEXT NOT NULL,
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume REAL NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    PRIMARY KEY (symbol, timeframe, bar_time)
  );
`);

try {
  db.exec(`ALTER TABLE fills ADD COLUMN reason TEXT`);
} catch (error) {
  if (!(error instanceof Error) || !/duplicate column name/i.test(error.message)) {
    throw error;
  }
}

// ─── Type definitions ────────────────────────────────────────────────────────

export interface SessionRow {
  date: string;
  instrument: string | null;
  instrument_name: string | null;
  beginning_balance: number;
  ending_balance: number;
  gross_pnl: number;
  commissions: number;
  net_pnl: number;
  trade_count: number;
  created_at: string;
  updated_at: string;
}

export interface FillRow {
  id: number;
  session_date: string;
  timestamp: string | null;
  side: string | null;
  qty: number;
  price: number;
  order_id: string | null;
  reason: string | null;
}

export interface TradeRow {
  id: number;
  session_date: string;
  instrument: string | null;
  direction: string | null;
  entry_time: string | null;
  entry_price: number | null;
  exit_time: string | null;
  exit_price: number | null;
  qty: number;
  gross_pnl: number;
  commission: number;
  net_pnl: number;
  duration_seconds: number | null;
  annotation: string | null;
}

export interface JournalRow {
  session_date: string;
  emotion_score: number | null;
  energy_score: number | null;
  execution_score: number | null;
  market_regime: string | null;
  premarket_notes: string | null;
  review_summary: string | null;
  what_worked: string | null;
  what_failed: string | null;
  next_focus: string | null;
  rule_breaks: string | null;
  updated_at: string;
}

export interface MarketBarRow {
  symbol: string;
  timeframe: string;
  bar_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: string;
}

// ─── CRUD helpers ────────────────────────────────────────────────────────────

const stmts = {
  upsertSession: db.prepare<SessionRow>(`
    INSERT INTO sessions (date, instrument, instrument_name, beginning_balance, ending_balance,
      gross_pnl, commissions, net_pnl, trade_count, updated_at)
    VALUES (@date, @instrument, @instrument_name, @beginning_balance, @ending_balance,
      @gross_pnl, @commissions, @net_pnl, @trade_count, datetime('now'))
    ON CONFLICT(date) DO UPDATE SET
      instrument       = excluded.instrument,
      instrument_name  = excluded.instrument_name,
      beginning_balance = excluded.beginning_balance,
      ending_balance   = excluded.ending_balance,
      gross_pnl        = excluded.gross_pnl,
      commissions      = excluded.commissions,
      net_pnl          = excluded.net_pnl,
      trade_count      = excluded.trade_count,
      updated_at       = datetime('now')
  `),

  insertFill: db.prepare<Omit<FillRow, 'id'>>(`
    INSERT INTO fills (session_date, timestamp, side, qty, price, order_id, reason)
    VALUES (@session_date, @timestamp, @side, @qty, @price, @order_id, @reason)
  `),

  insertTrade: db.prepare<Omit<TradeRow, 'id'>>(`
    INSERT INTO trades (session_date, instrument, direction, entry_time, entry_price,
      exit_time, exit_price, qty, gross_pnl, commission, net_pnl, duration_seconds, annotation)
    VALUES (@session_date, @instrument, @direction, @entry_time, @entry_price,
      @exit_time, @exit_price, @qty, @gross_pnl, @commission, @net_pnl, @duration_seconds, @annotation)
  `),

  deleteFillsBySession: db.prepare<{ session_date: string }>(
    'DELETE FROM fills WHERE session_date = @session_date'
  ),

  deleteTradesBySession: db.prepare<{ session_date: string }>(
    'DELETE FROM trades WHERE session_date = @session_date'
  ),

  deleteSession: db.prepare<{ date: string }>(
    'DELETE FROM sessions WHERE date = @date'
  ),

  getSession: db.prepare<{ date: string }>(
    'SELECT * FROM sessions WHERE date = @date'
  ),

  listSessions: db.prepare(
    'SELECT date, instrument, instrument_name, net_pnl, trade_count FROM sessions ORDER BY date DESC'
  ),

  getFillsBySession: db.prepare<{ session_date: string }>(
    'SELECT * FROM fills WHERE session_date = @session_date ORDER BY timestamp ASC'
  ),

  getFillsInRange: db.prepare<{ start: string; end: string }>(
    `SELECT * FROM fills
     WHERE timestamp IS NOT NULL
       AND datetime(timestamp) >= datetime(@start)
       AND datetime(timestamp) < datetime(@end)
     ORDER BY timestamp ASC`
  ),

  getTradesBySession: db.prepare<{ session_date: string }>(
    'SELECT * FROM trades WHERE session_date = @session_date ORDER BY entry_time ASC'
  ),

  getJournal: db.prepare<{ session_date: string }>(
    'SELECT * FROM journal_entries WHERE session_date = @session_date'
  ),

  getTradeById: db.prepare<{ id: number }>(
    'SELECT * FROM trades WHERE id = @id'
  ),

  getFillById: db.prepare<{ id: number }>(
    'SELECT * FROM fills WHERE id = @id'
  ),

  upsertJournal: db.prepare(`
    INSERT INTO journal_entries (session_date, emotion_score, energy_score, execution_score,
      market_regime, premarket_notes, review_summary, what_worked, what_failed,
      next_focus, rule_breaks, updated_at)
    VALUES (@session_date, @emotion_score, @energy_score, @execution_score,
      @market_regime, @premarket_notes, @review_summary, @what_worked, @what_failed,
      @next_focus, @rule_breaks, datetime('now'))
    ON CONFLICT(session_date) DO UPDATE SET
      emotion_score    = excluded.emotion_score,
      energy_score     = excluded.energy_score,
      execution_score  = excluded.execution_score,
      market_regime    = excluded.market_regime,
      premarket_notes  = excluded.premarket_notes,
      review_summary   = excluded.review_summary,
      what_worked      = excluded.what_worked,
      what_failed      = excluded.what_failed,
      next_focus       = excluded.next_focus,
      rule_breaks      = excluded.rule_breaks,
      updated_at       = datetime('now')
  `),

  updateTradeAnnotation: db.prepare<{ id: number; annotation: string | null }>(
    'UPDATE trades SET annotation = @annotation WHERE id = @id'
  ),

  updateFillReason: db.prepare<{ id: number; reason: string | null }>(
    'UPDATE fills SET reason = @reason WHERE id = @id'
  ),

  upsertMarketBar: db.prepare<MarketBarRow>(`
    INSERT INTO market_bars (symbol, timeframe, bar_time, open, high, low, close, volume, source)
    VALUES (@symbol, @timeframe, @bar_time, @open, @high, @low, @close, @volume, @source)
    ON CONFLICT(symbol, timeframe, bar_time) DO UPDATE SET
      open = excluded.open,
      high = excluded.high,
      low = excluded.low,
      close = excluded.close,
      volume = excluded.volume,
      source = excluded.source
  `),

  getMarketBarsInRange: db.prepare<{ symbol: string; timeframe: string; start: string; end: string }>(
    `SELECT * FROM market_bars
     WHERE symbol = @symbol
       AND timeframe = @timeframe
       AND bar_time >= @start
       AND bar_time < @end
     ORDER BY bar_time ASC`
  ),
};

// ─── Exported CRUD functions ─────────────────────────────────────────────────

export function upsertSessionWithData(
  session: Omit<SessionRow, 'created_at' | 'updated_at'>,
  fills: Omit<FillRow, 'id'>[],
  trades: Omit<TradeRow, 'id'>[]
): void {
  const insertAll = db.transaction(() => {
    stmts.upsertSession.run(session as unknown as SessionRow);
    stmts.deleteFillsBySession.run({ session_date: session.date });
    stmts.deleteTradesBySession.run({ session_date: session.date });
    for (const fill of fills) stmts.insertFill.run(fill as unknown as Omit<FillRow, 'id'>);
    for (const trade of trades) stmts.insertTrade.run(trade as unknown as Omit<TradeRow, 'id'>);
  });
  insertAll();
}

export function listSessions(): Pick<SessionRow, 'date' | 'instrument' | 'instrument_name' | 'net_pnl' | 'trade_count'>[] {
  return stmts.listSessions.all() as Pick<SessionRow, 'date' | 'instrument' | 'instrument_name' | 'net_pnl' | 'trade_count'>[];
}

export function getSessionFull(date: string): {
  session: SessionRow | undefined;
  fills: FillRow[];
  trades: TradeRow[];
  journal: JournalRow | undefined;
} {
  return {
    session: stmts.getSession.get({ date }) as SessionRow | undefined,
    fills: stmts.getFillsBySession.all({ session_date: date }) as FillRow[],
    trades: stmts.getTradesBySession.all({ session_date: date }) as TradeRow[],
    journal: stmts.getJournal.get({ session_date: date }) as JournalRow | undefined,
  };
}

export function upsertJournal(entry: Omit<JournalRow, 'updated_at'>): void {
  stmts.upsertJournal.run(entry);
}

export function deleteSession(date: string): void {
  stmts.deleteSession.run({ date });
}

export function updateTradeAnnotation(id: number, annotation: string | null): void {
  stmts.updateTradeAnnotation.run({ id, annotation });
}

export function updateFillReason(id: number, reason: string | null): void {
  stmts.updateFillReason.run({ id, reason });
}

export function getJournalBySession(date: string): JournalRow | undefined {
  return stmts.getJournal.get({ session_date: date }) as JournalRow | undefined;
}

export function getTradeById(id: number): TradeRow | undefined {
  return stmts.getTradeById.get({ id }) as TradeRow | undefined;
}

export function getFillById(id: number): FillRow | undefined {
  return stmts.getFillById.get({ id }) as FillRow | undefined;
}

export function getFillsInRange(start: string, end: string): FillRow[] {
  return stmts.getFillsInRange.all({ start, end }) as FillRow[];
}

export function upsertMarketBars(bars: MarketBarRow[]): void {
  const transaction = db.transaction((items: MarketBarRow[]) => {
    for (const bar of items) stmts.upsertMarketBar.run(bar);
  });
  transaction(bars);
}

export function getMarketBarsInRange(symbol: string, timeframe: string, start: string, end: string): MarketBarRow[] {
  return stmts.getMarketBarsInRange.all({ symbol, timeframe, start, end }) as MarketBarRow[];
}

export function getAllSessionsForAnalytics(): SessionRow[] {
  return (db.prepare('SELECT * FROM sessions ORDER BY date ASC').all()) as SessionRow[];
}

export function getAllTradesForAnalytics(): TradeRow[] {
  return (db.prepare('SELECT * FROM trades ORDER BY entry_time ASC').all()) as TradeRow[];
}

export default db;
