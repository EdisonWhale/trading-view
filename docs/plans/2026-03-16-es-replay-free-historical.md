# ES Replay Free Historical Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a free historical ES replay workflow to the review app so each imported session can show ES price action, overlay fills as markers, and display buy/sell reasons across 1m, 5m, 15m, 1h, 4h, and day views.

**Architecture:** Keep the current React + Express + SQLite app, but add a server-side market data adapter and cache. Use a free Yahoo Finance futures chart feed for recent historical ES bars, normalize all imported fill timestamps to UTC, and expose session-scoped market data plus fill reasons through the existing API. The Review page becomes the single-day replay workspace while Journal keeps the detailed editing flow.

**Tech Stack:** React 18, TypeScript, Vite, Express 5, better-sqlite3, lightweight-charts, Vitest

### Task 1: Lock down broken session API contracts

**Files:**
- Modify: `server/routes/sessions.ts`
- Modify: `server/db.ts`
- Modify: `src/api/client.ts`
- Modify: `src/components/journal/JournalForm.tsx`
- Modify: `src/components/journal/TradeList.tsx`
- Modify: `src/pages/Journal.tsx`
- Test: `src/api/client.test.ts`
- Test: `server/routes/sessions.test.ts`

**Step 1: Write the failing tests**

Add tests proving:
- `POST /api/sessions/import` returns full session detail payload
- `PATCH /api/sessions/:date/journal` returns the saved journal entry
- `PATCH /api/trades/:id` returns the updated trade row

**Step 2: Run test to verify it fails**

Run: `npm test -- src/api/client.test.ts server/routes/sessions.test.ts`
Expected: FAIL because current routes only return message payloads.

**Step 3: Write minimal implementation**

Return normalized objects from the backend using DB reads after mutation, and keep the frontend API client aligned with those payloads.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/api/client.test.ts server/routes/sessions.test.ts`
Expected: PASS.

### Task 2: Normalize imported timestamps to UTC

**Files:**
- Modify: `server/parsers/ninjatrader.ts`
- Modify: `server/routes/analytics.ts`
- Modify: `src/components/journal/TradeList.tsx`
- Test: `server/parsers/ninjatrader.test.ts`
- Test: `server/routes/analytics.test.ts`

**Step 1: Write the failing tests**

Add tests proving:
- parsed NinjaTrader timestamps end with `Z`
- hour extraction still works from UTC timestamps
- frontend time formatting displays imported UTC times consistently

**Step 2: Run test to verify it fails**

Run: `npm test -- server/parsers/ninjatrader.test.ts server/routes/analytics.test.ts`
Expected: FAIL because timestamps are currently timezone-naive.

**Step 3: Write minimal implementation**

Convert `(GMT)` timestamps into ISO UTC strings and keep downstream parsing tolerant of the new format.

**Step 4: Run test to verify it passes**

Run: `npm test -- server/parsers/ninjatrader.test.ts server/routes/analytics.test.ts`
Expected: PASS.

### Task 3: Add market data cache and fill reasons

**Files:**
- Modify: `server/db.ts`
- Create: `server/services/marketData.ts`
- Modify: `server/routes/sessions.ts`
- Modify: `server/index.ts`
- Modify: `src/types/index.ts`
- Modify: `src/api/client.ts`
- Test: `server/services/marketData.test.ts`
- Test: `server/routes/sessions.test.ts`

**Step 1: Write the failing tests**

Add tests proving:
- market bars can be cached and read back by session date + timeframe
- timeframe aggregation works for `5m`, `15m`, `1h`, `4h`, `day`
- fill reasons can be saved and returned with session detail
- `GET /api/sessions/:date/market?timeframe=1m` returns bars and fills

**Step 2: Run test to verify it fails**

Run: `npm test -- server/services/marketData.test.ts server/routes/sessions.test.ts`
Expected: FAIL because the tables, service, and route do not exist yet.

**Step 3: Write minimal implementation**

Add SQLite tables for `fill_reasons` and `market_bars`. Implement a Yahoo Finance fetcher for `ES=F` 1m bars, cache bars by day, and aggregate larger timeframes from cached 1m data.

**Step 4: Run test to verify it passes**

Run: `npm test -- server/services/marketData.test.ts server/routes/sessions.test.ts`
Expected: PASS.

### Task 4: Build the Review replay UI

**Files:**
- Create: `src/components/review/SessionReplayChart.tsx`
- Modify: `src/pages/Review.tsx`
- Modify: `src/pages/Journal.tsx`
- Modify: `src/components/journal/FillTable.tsx`
- Modify: `src/types/index.ts`
- Modify: `src/index.css`
- Test: `src/pages/Review.test.tsx`
- Test: `src/pages/Journal.test.tsx`

**Step 1: Write the failing tests**

Add tests proving:
- Review page shows timeframe controls and loads session market data
- clicking or selecting a fill marker reveals the saved reason panel
- Journal page exposes reason editing for individual fills

**Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/Review.test.tsx src/pages/Journal.test.tsx`
Expected: FAIL because replay UI and fill reason editing are not present yet.

**Step 3: Write minimal implementation**

Add a lightweight-charts replay component with timeframe switching and fill markers. Put it in the Review page above the journal form. Add fill reason editing in Journal so Review stays read-focused.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/Review.test.tsx src/pages/Journal.test.tsx`
Expected: PASS.

### Task 5: Full verification

**Files:**
- Modify as needed after verification

**Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS.

**Step 2: Run the production build**

Run: `npm run build`
Expected: PASS.

**Step 3: Smoke check API integration**

Run the local app and manually verify:
- importing a PDF still works
- Review page loads replay data for a session
- timeframe switching updates the chart
- fill reason edits persist and show in Review
