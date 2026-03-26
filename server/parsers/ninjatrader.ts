import { PDFParse } from 'pdf-parse';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FillRecord {
  id: number;
  session_date: string;
  instrument: string;
  timestamp: string;
  side: 'buy' | 'sell';
  qty: number;
  price: number;
  order_id: string | null;
}

export interface TradeRecord {
  session_date: string;
  instrument: string;
  direction: 'long' | 'short';
  entry_time: string;
  entry_price: number;
  exit_time: string;
  exit_price: number;
  qty: number;
  gross_pnl: number;
  commission: number;
  net_pnl: number;
  duration_seconds: number;
  annotation: null;
}

export interface OpenPositionRecord {
  session_date: string;
  instrument: string;
  side: 'long' | 'short';
  qty: number;
  entry_time: string;
  entry_price: number;
  mark_time: string;
  mark_price: number;
  open_pnl: number;
  order_id: string | null;
}

export interface ParseResult {
  date: string;
  instrument: string;
  instrumentName: string;
  beginningBalance: number;
  endingBalance: number;
  grossPnl: number;
  commissions: number;
  tradingFees: number;
  netPnl: number;
  realizedNetPnl: number;
  openTradeEquityChange: number;
  endingOpenTradeEquity: number;
  fills: FillRecord[];
  trades: TradeRecord[];
  openPositions: OpenPositionRecord[];
}

// ─── Instrument metadata ──────────────────────────────────────────────────────

interface InstrumentInfo {
  name: string;
  multiplier: number;
}

const INSTRUMENT_MAP: Record<string, InstrumentInfo> = {
  MES: { name: 'Micro E-mini S&P 500', multiplier: 5 },
  ES:  { name: 'E-mini S&P 500',        multiplier: 50 },
  MNQ: { name: 'Micro E-mini Nasdaq',   multiplier: 2 },
  NQ:  { name: 'E-mini Nasdaq',         multiplier: 20 },
  M2K: { name: 'Micro E-mini Russell',  multiplier: 5 },
  RTY: { name: 'E-mini Russell',        multiplier: 50 },
  MCL: { name: 'Micro Crude Oil',       multiplier: 100 },
  CL:  { name: 'Crude Oil',             multiplier: 1000 },
  MGC: { name: 'Micro Gold',            multiplier: 10 },
  GC:  { name: 'Gold',                  multiplier: 100 },
};

/** Resolve contract root from full symbol (e.g. MESH6 → MES, ESH26 → ES) */
function resolveRoot(symbol: string): string {
  // Strip trailing month/year codes: 1–3 uppercase letters + 1–2 digits
  const match = symbol.match(/^([A-Z]{1,4?}?)([A-Z]\d{1,2})$/);
  if (match) return match[1];
  // Fallback: strip trailing digits and month letter
  return symbol.replace(/[A-Z]\d{1,2}$/, '');
}

export function getInstrumentInfo(symbol: string): InstrumentInfo {
  const root = resolveRoot(symbol);
  return INSTRUMENT_MAP[root] ?? { name: symbol, multiplier: 5 };
}

export function getMultiplier(symbol: string): number {
  return getInstrumentInfo(symbol).multiplier;
}

// ─── Date / time helpers ─────────────────────────────────────────────────────

/**
 * Convert a NinjaTrader statement timestamp to an ISO string.
 * Input formats:
 *   "03/13/2026 09:04:39 AM(GMT)"
 *   "03/13/2026 09:04:39 AM (GMT)"
 */
function parseNtTimestamp(raw: string): string {
  // Normalise: remove (GMT) and extra spaces
  const clean = raw.replace(/\s*\(GMT\)\s*/i, '').trim();
  const m = clean.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+(AM|PM)$/i
  );
  if (!m) return clean;
  let [, mm, dd, yyyy, hh, min, ss, ampm] = m;
  let hours = parseInt(hh, 10);
  if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return `${yyyy}-${mm}-${dd}T${String(hours).padStart(2, '0')}:${min}:${ss}Z`;
}

/** MM/DD/YYYY → YYYY-MM-DD */
function parseNtDate(raw: string): string {
  const [mm, dd, yyyy] = raw.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

// ─── Number helpers ───────────────────────────────────────────────────────────

function parseNumber(raw: string): number {
  return parseFloat(raw.replace(/,/g, '')) || 0;
}

function parseBalanceCell(raw: string): number {
  return raw === '-' ? 0 : parseNumber(raw);
}

interface BalanceSnapshot {
  ledger: number;
  openTrade: number;
  total: number;
}

function buildEmptyBalanceSnapshot(): BalanceSnapshot {
  return { ledger: 0, openTrade: 0, total: 0 };
}

function extractBalanceRow(sectionText: string, labelPattern: RegExp): BalanceSnapshot {
  const line = sectionText
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => labelPattern.test(entry));

  if (!line) {
    return buildEmptyBalanceSnapshot();
  }

  const rowMatch = line
    .replace(/\bUS\$/gi, '')
    .match(/(-|-?[\d,]+\.\d{2})\s+(-|-?[\d,]+\.\d{2})\s+(-|-?[\d,]+\.\d{2})\s*$/);

  if (!rowMatch) {
    return buildEmptyBalanceSnapshot();
  }

  return {
    ledger: parseBalanceCell(rowMatch[1]),
    openTrade: parseBalanceCell(rowMatch[2]),
    total: parseBalanceCell(rowMatch[3]),
  };
}

function extractAccountBalances(text: string): {
  beginning: BalanceSnapshot;
  activity: BalanceSnapshot;
  ending: BalanceSnapshot;
} {
  const sectionMatch = text.match(/Account Balances([\s\S]*?)Net Liquidating Value/i);
  const sectionText = sectionMatch?.[1] ?? '';

  return {
    beginning: extractBalanceRow(sectionText, /^Beginning balance/i),
    activity: extractBalanceRow(sectionText, /^Activity\b/i),
    ending: extractBalanceRow(sectionText, /^Ending Balance/i),
  };
}

interface TradingDetailSection {
  instrument: string;
  text: string;
}

function getTradingDetailSections(text: string): TradingDetailSection[] {
  const sectionPattern = /Trading details for .*?\(([A-Z]{1,4}[FGHJKMNQUVXZ]\d{1,2})\)/gi;
  const sections = [...text.matchAll(sectionPattern)];

  return sections.map((sectionMatch, index) => {
    const instrument = sectionMatch[1];
    const start = sectionMatch.index ?? 0;
    const end = sections[index + 1]?.index ?? text.length;
    return {
      instrument,
      text: text.slice(start, end),
    };
  });
}

// ─── Fill parser ──────────────────────────────────────────────────────────────

/**
 * Parse fill lines from the "Daily Trading Details" section.
 *
 * NinjaTrader typical line format (fields are tab or multi-space separated):
 *   03/13/2026 09:04:39 AM(GMT)    FILL    MESH6    2    5532.25    12345678
 *
 * Positive qty = Buy, Negative qty = Sell.
 */
function parseFills(text: string, sessionDate: string): FillRecord[] {
  const fills: FillRecord[] = [];
  const fillPattern =
    /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}\s+[AP]M\s*\(GMT\))\s+FILL\s+(-|\d+)\s+(-|\d+)\s+([\d,.]+)\s+([\d,]+)/gi;
  let idx = 0;

  for (const section of getTradingDetailSections(text)) {
    fillPattern.lastIndex = 0;

    let fillMatch: RegExpExecArray | null;
    while ((fillMatch = fillPattern.exec(section.text)) !== null) {
      const [, rawTime, rawBuyQty, rawSellQty, rawPrice, orderId] = fillMatch;
      const isBuy = rawBuyQty !== '-';
      const rawQty = isBuy ? rawBuyQty : rawSellQty;
      const qty = parseInt(rawQty, 10);
      if (!qty) continue;

      fills.push({
        id: ++idx,
        session_date: sessionDate,
        instrument: section.instrument,
        timestamp: parseNtTimestamp(rawTime),
        side: isBuy ? 'buy' : 'sell',
        qty,
        price: parseNumber(rawPrice),
        order_id: orderId?.replace(/,/g, '') ?? null,
      });
    }
  }

  return fills;
}

function parsePositionBlock(
  blockText: string,
  instrument: string,
  sessionDate: string
): OpenPositionRecord[] {
  const positions: OpenPositionRecord[] = [];
  const markPattern =
    /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}\s+[AP]M\s*\(GMT\))\s+MM\s+-\s+-\s+([\d,.]+)\s+[\d,]+/gi;
  const costPattern =
    /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}\s+[AP]M\s*\(GMT\))\s+COST\s+(-|\d+)\s+(-|\d+)\s+([\d,.]+)\s+([\d,]+)/gi;

  let markTime = '';
  let markPrice = 0;
  let markMatch: RegExpExecArray | null;
  markPattern.lastIndex = 0;
  while ((markMatch = markPattern.exec(blockText)) !== null) {
    markTime = parseNtTimestamp(markMatch[1]);
    markPrice = parseNumber(markMatch[2]);
  }

  costPattern.lastIndex = 0;
  let costMatch: RegExpExecArray | null;
  while ((costMatch = costPattern.exec(blockText)) !== null) {
    const [, rawTime, rawBuyQty, rawSellQty, rawPrice, orderId] = costMatch;
    const isLong = rawBuyQty !== '-';
    const rawQty = isLong ? rawBuyQty : rawSellQty;
    const qty = parseInt(rawQty, 10);
    if (!qty) {
      continue;
    }

    const entryPrice = parseNumber(rawPrice);
    const multiplier = getMultiplier(instrument);
    const openPnl = isLong
      ? (markPrice - entryPrice) * qty * multiplier
      : (entryPrice - markPrice) * qty * multiplier;

    positions.push({
      session_date: sessionDate,
      instrument,
      side: isLong ? 'long' : 'short',
      qty,
      entry_time: parseNtTimestamp(rawTime),
      entry_price: entryPrice,
      mark_time: markTime,
      mark_price: markPrice,
      open_pnl: openPnl,
      order_id: orderId?.replace(/,/g, '') ?? null,
    });
  }

  return positions;
}

function extractSectionSlice(sectionText: string, startIdx: number, endMarkers: string[]): string {
  if (startIdx === -1) {
    return '';
  }

  const endIdx = endMarkers
    .map((marker) => sectionText.indexOf(marker, startIdx))
    .filter((idx) => idx !== -1)
    .sort((left, right) => left - right)[0] ?? sectionText.length;

  return sectionText.slice(startIdx, endIdx);
}

function parseCarryInPositions(text: string, sessionDate: string): OpenPositionRecord[] {
  const carryInPositions: OpenPositionRecord[] = [];

  for (const section of getTradingDetailSections(text)) {
    const startIdx = section.text.indexOf('Open Positions - Beginning of Period');
    if (startIdx === -1) {
      continue;
    }

    const blockText = extractSectionSlice(section.text, startIdx, ['Fills', `${section.instrument} US$`]);
    carryInPositions.push(...parsePositionBlock(blockText, section.instrument, sessionDate));
  }

  return carryInPositions;
}

function parseOpenPositions(text: string, sessionDate: string): OpenPositionRecord[] {
  const openPositions: OpenPositionRecord[] = [];

  for (const section of getTradingDetailSections(text)) {
    const marker = /Open Positions(?!\s*-\s*Beginning of Period)/.exec(section.text);
    const startIdx = marker?.index ?? -1;
    if (startIdx === -1) {
      continue;
    }

    const blockText = extractSectionSlice(section.text, startIdx, [`${section.instrument} US$`]);
    openPositions.push(...parsePositionBlock(blockText, section.instrument, sessionDate));
  }

  return openPositions;
}

// ─── FIFO trade pairing ───────────────────────────────────────────────────────

interface OpenLot {
  side: 'long' | 'short';
  price: number;
  qty: number;
  time: string;
}

function pairFills(
  fills: FillRecord[],
  instrument: string,
  initialLots: OpenLot[] = []
): TradeRecord[] {
  const trades: TradeRecord[] = [];
  const openLots: OpenLot[] = initialLots
    .map((lot) => ({ ...lot }))
    .sort((left, right) => left.time.localeCompare(right.time));
  const sortedFills = [...fills].sort((left, right) => left.timestamp.localeCompare(right.timestamp));

  for (const fill of sortedFills) {
    let remaining = fill.qty;
    const fillSide: 'long' | 'short' = fill.side === 'buy' ? 'long' : 'short';

    while (remaining > 0 && openLots.length > 0 && openLots[0].side !== fillSide) {
      const open = openLots[0];
      const matchQty = Math.min(remaining, open.qty);
      const multiplier = getMultiplier(instrument);
      const grossPnl = open.side === 'long'
        ? (fill.price - open.price) * matchQty * multiplier
        : (open.price - fill.price) * matchQty * multiplier;

      trades.push({
        session_date: fill.session_date,
        instrument,
        direction: open.side,
        entry_time: open.time,
        entry_price: open.price,
        exit_time: fill.timestamp,
        exit_price: fill.price,
        qty: matchQty,
        gross_pnl: grossPnl,
        commission: 0,
        net_pnl: grossPnl,
        duration_seconds: Math.max(
          0,
          Math.round((new Date(fill.timestamp).getTime() - new Date(open.time).getTime()) / 1000),
        ),
        annotation: null,
      });

      open.qty -= matchQty;
      remaining -= matchQty;
      if (open.qty === 0) {
        openLots.shift();
      }
    }

    if (remaining > 0) {
      openLots.push({
        side: fillSide,
        price: fill.price,
        qty: remaining,
        time: fill.timestamp,
      });
    }
  }

  return trades;
}

// ─── Balance / commissions parsers ───────────────────────────────────────────

function extractBalance(text: string, pattern: RegExp): number {
  const m = text.match(pattern);
  return m ? parseNumber(m[1]) : 0;
}

/**
 * Extract commissions from "Daily Activity Summary" table.
 * The table row for an instrument looks like:
 *   MESH6    5    ...    -12.50    ...
 * We look for the commissions column, which is a negative number adjacent to
 * the instrument name. As a fallback, sum commissions from parsed trades.
 */
function extractCommissions(text: string): number {
  // Pattern: commission figure in the Daily Activity Summary section
  // Look for "Commissions" header followed by a dollar amount
  const commPattern = /Commissions?\s*\$?\s*(-?[\d,]+\.?\d*)/i;
  const m = text.match(commPattern);
  if (m) return Math.abs(parseNumber(m[1]));

  // Fallback: look for a line with negative dollar amounts in summary table
  // e.g.  "MESH6  5  ...  (12.50)  ..."  — parentheses = negative
  const parenPattern = /\((\d+\.?\d*)\)/g;
  let total = 0;
  let pm: RegExpExecArray | null;
  while ((pm = parenPattern.exec(text)) !== null) {
    total += parseFloat(pm[1]);
  }
  return total;
}

function extractCashAdjustments(text: string): number {
  const summaryMatch = text.match(/Daily Activity Summary([\s\S]*?)Daily Trading Details/i);
  const summaryText = summaryMatch?.[1] ?? text;
  let total = 0;

  for (const line of summaryText.split('\n')) {
    if (!/(ACH\s+(?:Deposit|Withdrawal)|Wire\s+(?:Deposit|Withdrawal))/i.test(line)) {
      continue;
    }

    const amountMatch = line.match(/(-?[\d,]+\.\d{2})(?=\s+-\s+-\s*$)/);
    if (!amountMatch) {
      continue;
    }

    let amount = parseNumber(amountMatch[1]);
    if (/withdrawal/i.test(line) && amount > 0) amount *= -1;
    if (/deposit/i.test(line) && amount < 0) amount = Math.abs(amount);
    total += amount;
  }

  return total;
}

function extractTradingFees(text: string): number {
  const summaryMatch = text.match(/Daily Activity Summary([\s\S]*?)Daily Trading Details/i);
  const summaryText = summaryMatch?.[1] ?? '';
  let total = 0;

  for (const rawLine of summaryText.split('\n')) {
    const line = rawLine.trim();
    if (!/^\d{2}\/\d{2}\/\d{4}\s+/.test(line)) {
      continue;
    }

    const tokens = line.split(/\s+/);
    const label = tokens[1] ?? '';

    if (/^[A-Z]{1,4}[FGHJKMNQUVXZ]\d{1,2}$/.test(label)) {
      total += Math.abs(parseBalanceCell(tokens[3] ?? '0'));
      total += Math.abs(parseBalanceCell(tokens[4] ?? '0'));
      total += Math.abs(parseBalanceCell(tokens[5] ?? '0'));
      continue;
    }

    if (label === 'Clearing_Fee') {
      total += Math.abs(parseBalanceCell(tokens[6] ?? '0'));
    }
  }

  return total;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export async function parseNinjaTraderPDF(buffer: Buffer): Promise<ParseResult> {
  let text = '';
  let parser: PDFParse | null = null;

  try {
    parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    text = parsed.text;
  } catch (err) {
    console.error('[ninjatrader parser] pdf-parse failed:', err);
    return buildEmptyResult('', '', '');
  } finally {
    await parser?.destroy().catch(() => undefined);
  }

  // ── 1. Date ──────────────────────────────────────────────────────────────
  let sessionDate = '';
  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (dateMatch) {
    sessionDate = parseNtDate(dateMatch[1]);
  }

  if (!sessionDate) {
    console.warn('[ninjatrader parser] Could not extract date from PDF');
    sessionDate = new Date().toISOString().split('T')[0];
  }

  // ── 3. Balances ───────────────────────────────────────────────────────────
  const balances = extractAccountBalances(text);
  const netLiquidatingValue = extractBalance(text, /Net Liquidating Value\s*([\d,]+\.\d{2})/i);
  const beginningBalance =
    balances.beginning.total ||
    extractBalance(text, /Beginning\s+[Bb]alance\s*\$?\s*([\d,]+\.?\d*)/i);
  const ledgerEndingBalance = balances.ending.ledger ||
    extractBalance(text, /Ending\s+[Bb]alance\s*(?:US\$)?\s*([\d,]+\.?\d*)/i);
  const endingBalance = netLiquidatingValue || balances.ending.total || ledgerEndingBalance;

  // ── 4. Fills ──────────────────────────────────────────────────────────────
  const fills = parseFills(text, sessionDate);
  const carryInPositions = parseCarryInPositions(text, sessionDate);
  const openPositions = parseOpenPositions(text, sessionDate);

  const primaryInstrument =
    fills.length > 0
      ? [...fills.reduce((totals, fill) => {
          totals.set(fill.instrument, (totals.get(fill.instrument) ?? 0) + fill.qty);
          return totals;
        }, new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
      : '';
  const instrumentMatch = text.match(/\b([A-Z]{1,4}[FGHJKMNQUVXZ]\d{1,2})\b/);
  const instrument = primaryInstrument || (instrumentMatch ? instrumentMatch[1] : '');
  const info = instrument ? getInstrumentInfo(instrument) : { name: 'Unknown', multiplier: 5 };

  // ── 5. FIFO trade pairing ─────────────────────────────────────────────────
  // Group fills by instrument in case multiple instruments appear
  const fillsByInstrument = new Map<string, FillRecord[]>();
  for (const fill of fills) {
    const key = fill.instrument || instrument || 'UNKNOWN';
    if (!fillsByInstrument.has(key)) fillsByInstrument.set(key, []);
    fillsByInstrument.get(key)!.push(fill);
  }

  const trades: TradeRecord[] = [];
  for (const [sym, symFills] of fillsByInstrument) {
    const initialLots = carryInPositions
      .filter((position) => position.instrument === sym)
      .map((position) => ({
        side: position.side,
        price: position.entry_price,
        qty: position.qty,
        time: position.entry_time,
      }));
    const symTrades = pairFills(symFills, sym, initialLots);
    trades.push(...symTrades);
  }

  // Sort trades chronologically
  trades.sort((a, b) => a.entry_time.localeCompare(b.entry_time));

  // ── 6. Aggregate P&L ──────────────────────────────────────────────────────
  const realizedGrossPnl = trades.reduce((s, t) => s + t.gross_pnl, 0);
  const hasBalanceSnapshot = endingBalance > 0 && beginningBalance > 0;
  const cashAdjustments = extractCashAdjustments(text);
  const realizedNetPnl = hasBalanceSnapshot
    ? balances.activity.ledger - cashAdjustments
    : trades.reduce((s, t) => s + t.net_pnl, 0);
  const totalNetPnl = hasBalanceSnapshot
    ? balances.activity.total - cashAdjustments
    : realizedNetPnl;
  const totalExecutedQty = fills.reduce((sum, fill) => sum + fill.qty, 0);
  const tradingFees = extractTradingFees(text);
  const inferredCommissions =
    hasBalanceSnapshot
      ? Math.abs(realizedGrossPnl - realizedNetPnl)
      : extractCommissions(text);
  const sessionCommissions = inferredCommissions;
  const commissionPerSideContract =
    tradingFees > 0 && totalExecutedQty > 0
      ? tradingFees / totalExecutedQty
      : 0;

  for (const trade of trades) {
    trade.commission = commissionPerSideContract * trade.qty * 2;
    trade.net_pnl = trade.gross_pnl - trade.commission;
  }

  const grossPnl = totalNetPnl + sessionCommissions;
  const openTradeEquityChange = hasBalanceSnapshot
    ? balances.activity.openTrade
    : 0;
  const endingOpenTradeEquity = hasBalanceSnapshot
    ? balances.ending.openTrade
    : openPositions.reduce((sum, position) => sum + position.open_pnl, 0);

  return {
    date: sessionDate,
    instrument,
    instrumentName: info.name,
    beginningBalance,
    endingBalance,
    grossPnl,
    commissions: sessionCommissions,
    tradingFees,
    netPnl: totalNetPnl,
    realizedNetPnl,
    openTradeEquityChange,
    endingOpenTradeEquity,
    fills,
    trades,
    openPositions,
  };
}

function buildEmptyResult(date: string, instrument: string, instrumentName: string): ParseResult {
  return {
    date,
    instrument,
    instrumentName,
    beginningBalance: 0,
    endingBalance: 0,
    grossPnl: 0,
    commissions: 0,
    tradingFees: 0,
    netPnl: 0,
    realizedNetPnl: 0,
    openTradeEquityChange: 0,
    endingOpenTradeEquity: 0,
    fills: [],
    trades: [],
    openPositions: [],
  };
}
