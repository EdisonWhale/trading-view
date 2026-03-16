import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
  upsertSessionWithData,
  listSessions,
  getSessionFull,
  getJournalBySession,
  getTradeById,
  getFillById,
  upsertJournal,
  deleteSession,
  updateTradeAnnotation,
  updateFillReason,
} from '../db.js';
import { parseNinjaTraderPDF } from '../parsers/ninjatrader.js';
import { getSessionMarketData, type MarketTimeframe } from '../services/marketData.js';
import type { FillRecord, TradeRecord } from '../parsers/ninjatrader.js';

const router = Router();

// ─── Multer: memory storage so we pass the buffer directly to the parser ─────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'));
    }
  },
});

// ─── POST /api/sessions/import ────────────────────────────────────────────────
router.post('/import', upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No PDF file uploaded. Provide a file field named "pdf".' });
      return;
    }

    const result = await parseNinjaTraderPDF(req.file.buffer);

    if (!result.date) {
      res.status(422).json({ error: 'Could not extract a valid date from the PDF.' });
      return;
    }

    // Map ParseResult fills/trades to DB row shapes
    const fillRows = result.fills.map((f: FillRecord) => ({
      session_date: result.date,
      timestamp: f.timestamp,
      side: f.side,
      qty: f.qty,
      price: f.price,
      order_id: f.order_id,
      reason: null,
    }));

    const tradeRows = result.trades.map((t: TradeRecord) => ({
      session_date: result.date,
      instrument: t.instrument,
      direction: t.direction,
      entry_time: t.entry_time,
      entry_price: t.entry_price,
      exit_time: t.exit_time,
      exit_price: t.exit_price,
      qty: t.qty,
      gross_pnl: t.gross_pnl,
      commission: t.commission,
      net_pnl: t.net_pnl,
      duration_seconds: t.duration_seconds,
      annotation: null,
    }));

    upsertSessionWithData(
      {
        date: result.date,
        instrument: result.instrument,
        instrument_name: result.instrumentName,
        beginning_balance: result.beginningBalance,
        ending_balance: result.endingBalance,
        gross_pnl: result.grossPnl,
        commissions: result.commissions,
        net_pnl: result.netPnl,
        trade_count: result.trades.length,
      },
      fillRows,
      tradeRows
    );

    const detail = getSessionFull(result.date);
    res.status(201).json(detail);
  } catch (err) {
    console.error('[POST /import]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Import failed' });
  }
});

// ─── GET /api/sessions ────────────────────────────────────────────────────────
router.get('/', (_req: Request, res: Response) => {
  try {
    const sessions = listSessions();
    res.json(sessions);
  } catch (err) {
    console.error('[GET /sessions]', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// ─── PATCH /api/sessions/:date/journal ───────────────────────────────────────
router.patch('/:date/journal', (req: Request, res: Response) => {
  try {
    const { date } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
      return;
    }

    const {
      emotion_score,
      energy_score,
      execution_score,
      market_regime,
      premarket_notes,
      review_summary,
      what_worked,
      what_failed,
      next_focus,
      rule_breaks,
    } = req.body as Record<string, unknown>;

    // Validate score ranges if provided
    for (const [key, val] of Object.entries({ emotion_score, energy_score, execution_score })) {
      if (val !== undefined && val !== null) {
        const n = Number(val);
        if (!Number.isInteger(n) || n < 1 || n > 10) {
          res.status(400).json({ error: `${key} must be an integer between 1 and 10` });
          return;
        }
      }
    }

    upsertJournal({
      session_date: date,
      emotion_score: emotion_score != null ? Number(emotion_score) : null,
      energy_score: energy_score != null ? Number(energy_score) : null,
      execution_score: execution_score != null ? Number(execution_score) : null,
      market_regime: (market_regime as string) ?? null,
      premarket_notes: (premarket_notes as string) ?? null,
      review_summary: (review_summary as string) ?? null,
      what_worked: (what_worked as string) ?? null,
      what_failed: (what_failed as string) ?? null,
      next_focus: (next_focus as string) ?? null,
      rule_breaks: (rule_breaks as string) ?? null,
    });

    const journal = getJournalBySession(date);
    res.json(journal);
  } catch (err) {
    console.error('[PATCH /sessions/:date/journal]', err);
    res.status(500).json({ error: 'Failed to save journal entry' });
  }
});

// ─── DELETE /api/sessions/:date ───────────────────────────────────────────────
router.delete('/:date', (req: Request, res: Response) => {
  try {
    const { date } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
      return;
    }

    const { session } = getSessionFull(date);
    if (!session) {
      res.status(404).json({ error: `Session for ${date} not found` });
      return;
    }

    deleteSession(date);
    res.json({ message: `Session ${date} deleted` });
  } catch (err) {
    console.error('[DELETE /sessions/:date]', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// ─── GET /api/sessions/:date/market ───────────────────────────────────────────
router.get('/:date/market', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const timeframe = (req.query.timeframe as string | undefined) ?? '1m';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
      return;
    }

    if (!['1m', '5m', '15m', '1h', '4h', '1d'].includes(timeframe)) {
      res.status(400).json({ error: 'Unsupported timeframe' });
      return;
    }

    const detail = getSessionFull(date);
    if (!detail.session) {
      res.status(404).json({ error: `Session for ${date} not found` });
      return;
    }

    const marketData = await getSessionMarketData(date, detail.fills, timeframe as MarketTimeframe);
    res.json(marketData);
  } catch (err) {
    console.error('[GET /sessions/:date/market]', err);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

// ─── GET /api/sessions/:date ──────────────────────────────────────────────────
router.get('/:date', (req: Request, res: Response) => {
  try {
    const { date } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
      return;
    }

    const data = getSessionFull(date);

    if (!data.session) {
      res.status(404).json({ error: `Session for ${date} not found` });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('[GET /sessions/:date]', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// ─── PATCH /api/trades/:id ────────────────────────────────────────────────────
// Exported separately so index.ts can mount it at /api/trades/:id
export const tradeRouter = Router();
export const fillRouter = Router();

tradeRouter.patch('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: 'Trade id must be a positive integer' });
      return;
    }

    const { annotation } = req.body as { annotation?: string | null };

    if (annotation !== undefined && annotation !== null && typeof annotation !== 'string') {
      res.status(400).json({ error: 'annotation must be a string or null' });
      return;
    }

    updateTradeAnnotation(id, annotation ?? null);
    const trade = getTradeById(id);

    if (!trade) {
      res.status(404).json({ error: `Trade ${id} not found` });
      return;
    }

    res.json(trade);
  } catch (err) {
    console.error('[PATCH /trades/:id]', err);
    res.status(500).json({ error: 'Failed to update trade annotation' });
  }
});

fillRouter.patch('/:id/reason', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: 'Fill id must be a positive integer' });
      return;
    }

    const { reason } = req.body as { reason?: string | null };
    if (reason !== undefined && reason !== null && typeof reason !== 'string') {
      res.status(400).json({ error: 'reason must be a string or null' });
      return;
    }

    updateFillReason(id, reason ?? null);
    const fill = getFillById(id);

    if (!fill) {
      res.status(404).json({ error: `Fill ${id} not found` });
      return;
    }

    res.json(fill);
  } catch (err) {
    console.error('[PATCH /fills/:id/reason]', err);
    res.status(500).json({ error: 'Failed to update fill reason' });
  }
});

export default router;
