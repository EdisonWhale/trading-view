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

export interface ParseResult {
  date: string;
  instrument: string;
  instrumentName: string;
  beginningBalance: number;
  endingBalance: number;
  grossPnl: number;
  commissions: number;
  netPnl: number;
  fills: FillRecord[];
  trades: TradeRecord[];
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
  const sectionPattern =
    /Trading details for .*?\(([A-Z]{1,4}[FGHJKMNQUVXZ]\d{1,2})\)\s*Date & Time Code Buy Qty Sell Qty Filled Price Order_Id\s*Fills\s*([\s\S]*?)(?=\n\d+\s+\d+\n[A-Z0-9]+ US\$)/gi;
  const fillPattern =
    /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}\s+[AP]M\s*\(GMT\))\s+FILL\s+(-|\d+)\s+(-|\d+)\s+([\d,.]+)\s+([\d,]+)/gi;

  let sectionMatch: RegExpExecArray | null;
  let idx = 0;

  while ((sectionMatch = sectionPattern.exec(text)) !== null) {
    const [, instrument, sectionText] = sectionMatch;
    fillPattern.lastIndex = 0;

    let fillMatch: RegExpExecArray | null;
    while ((fillMatch = fillPattern.exec(sectionText)) !== null) {
      const [, rawTime, rawBuyQty, rawSellQty, rawPrice, orderId] = fillMatch;
      const isBuy = rawBuyQty !== '-';
      const rawQty = isBuy ? rawBuyQty : rawSellQty;
      const qty = parseInt(rawQty, 10);
      if (!qty) continue;

      fills.push({
        id: ++idx,
        session_date: sessionDate,
        instrument,
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

// ─── FIFO trade pairing ───────────────────────────────────────────────────────

interface OpenLot {
  price: number;
  qty: number;
  time: string;
  fillId: number;
}

function pairFills(
  fills: FillRecord[],
  instrument: string
): TradeRecord[] {
  const trades: TradeRecord[] = [];
  const openLots: OpenLot[] = [];
  let currentDirection: 'long' | 'short' | null = null;

  for (const fill of fills) {
    const isBuy = fill.side === 'buy';

    if (isBuy) {
      if (currentDirection === 'short' && openLots.length > 0) {
        // Closing (or reversing) a short position
        let remaining = fill.qty;

        while (remaining > 0 && openLots.length > 0) {
          const open = openLots[0];
          const matchQty = Math.min(remaining, open.qty);
          const multiplier = getMultiplier(instrument);
          const grossPnl = (open.price - fill.price) * matchQty * multiplier;

          trades.push({
            session_date: fill.session_date,
            instrument,
            direction: 'short',
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
              Math.round(
                (new Date(fill.timestamp).getTime() -
                  new Date(open.time).getTime()) /
                  1000
              )
            ),
            annotation: null,
          });

          open.qty -= matchQty;
          remaining -= matchQty;
          if (open.qty === 0) openLots.shift();
        }

        if (remaining > 0) {
          // Position reversed to long
          openLots.push({ price: fill.price, qty: remaining, time: fill.timestamp, fillId: fill.id });
          currentDirection = 'long';
        } else if (openLots.length === 0) {
          currentDirection = null;
        }
      } else {
        // Opening or adding to long position
        openLots.push({ price: fill.price, qty: fill.qty, time: fill.timestamp, fillId: fill.id });
        currentDirection = 'long';
      }
    } else {
      // Sell fill
      if (currentDirection === 'long' && openLots.length > 0) {
        // Closing (or reversing) a long position
        let remaining = fill.qty;

        while (remaining > 0 && openLots.length > 0) {
          const open = openLots[0];
          const matchQty = Math.min(remaining, open.qty);
          const multiplier = getMultiplier(instrument);
          const grossPnl = (fill.price - open.price) * matchQty * multiplier;

          trades.push({
            session_date: fill.session_date,
            instrument,
            direction: 'long',
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
              Math.round(
                (new Date(fill.timestamp).getTime() -
                  new Date(open.time).getTime()) /
                  1000
              )
            ),
            annotation: null,
          });

          open.qty -= matchQty;
          remaining -= matchQty;
          if (open.qty === 0) openLots.shift();
        }

        if (remaining > 0) {
          // Position reversed to short
          openLots.push({ price: fill.price, qty: remaining, time: fill.timestamp, fillId: fill.id });
          currentDirection = 'short';
        } else if (openLots.length === 0) {
          currentDirection = null;
        }
      } else {
        // Opening or adding to short position
        openLots.push({ price: fill.price, qty: fill.qty, time: fill.timestamp, fillId: fill.id });
        currentDirection = 'short';
      }
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
  const beginningBalance = extractBalance(
    text,
    /Beginning\s+[Bb]alance\s*\$?\s*([\d,]+\.?\d*)/i
  );
  const endingBalance = extractBalance(
    text,
    /Ending\s+[Bb]alance\s*(?:US\$)?\s*([\d,]+\.?\d*)/i
  );

  // ── 4. Fills ──────────────────────────────────────────────────────────────
  const fills = parseFills(text, sessionDate);

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
    const symTrades = pairFills(symFills, sym);
    trades.push(...symTrades);
  }

  // Sort trades chronologically
  trades.sort((a, b) => a.entry_time.localeCompare(b.entry_time));

  // ── 6. Aggregate P&L ──────────────────────────────────────────────────────
  const grossPnl = trades.reduce((s, t) => s + t.gross_pnl, 0);
  const hasBalanceSnapshot = endingBalance > 0 && beginningBalance > 0;
  const balanceDerivedNet =
    endingBalance > 0 && beginningBalance > 0
      ? endingBalance - beginningBalance
      : trades.reduce((s, t) => s + t.net_pnl, 0);
  const cashAdjustments = extractCashAdjustments(text);
  const adjustedNetPnl = hasBalanceSnapshot ? balanceDerivedNet - cashAdjustments : balanceDerivedNet;
  const totalExecutedQty = fills.reduce((sum, fill) => sum + fill.qty, 0);
  const inferredCommissions =
    hasBalanceSnapshot
      ? Math.abs(grossPnl - adjustedNetPnl)
      : extractCommissions(text);
  const commissionPerSideContract =
    inferredCommissions > 0 && totalExecutedQty > 0
      ? inferredCommissions / totalExecutedQty
      : 0;

  for (const trade of trades) {
    trade.commission = commissionPerSideContract * trade.qty * 2;
    trade.net_pnl = trade.gross_pnl - trade.commission;
  }

  const commissions = trades.reduce((s, t) => s + t.commission, 0);

  return {
    date: sessionDate,
    instrument,
    instrumentName: info.name,
    beginningBalance,
    endingBalance,
    grossPnl,
    commissions,
    netPnl: adjustedNetPnl,
    fills,
    trades,
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
    netPnl: 0,
    fills: [],
    trades: [],
  };
}
