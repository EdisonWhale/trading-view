# Trading Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local React + TypeScript trading review dashboard that visualizes MES session data, trade executions, planning notes, and review metrics for a recovery-focused trader.

**Architecture:** Create a Vite-based SPA with a seeded local data layer, pure calculation utilities for metrics and indicators, and a composed dashboard UI. Keep market data, trade logs, and journaling fields in typed modules so a future PDF/API importer can replace the seed data without rewriting the interface.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, TradingView Lightweight Charts

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/index.css`

**Step 1: Write the failing test**

Create a test entry point that imports the future dashboard app and fails because the app module does not exist yet.

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand`
Expected: FAIL because `src/App` cannot be resolved.

**Step 3: Write minimal implementation**

Add the Vite/Vitest scaffold and test runner configuration needed to mount a React app in jsdom.

**Step 4: Run test to verify scaffold is healthy**

Run: `npm test -- --runInBand`
Expected: FAIL only on missing app behavior, not on tooling/configuration.

### Task 2: Metrics and Indicator Core

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/metrics.ts`
- Create: `src/lib/indicators.ts`
- Create: `src/lib/sample-data.ts`
- Create: `src/lib/metrics.test.ts`

**Step 1: Write the failing tests**

Add tests that assert:
- summary metrics are computed from seeded trading days
- compliance score reflects rule breaks
- VWAP/EMA series lengths align with input bars

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/metrics.test.ts`
Expected: FAIL because utility modules do not exist yet.

**Step 3: Write minimal implementation**

Create typed sample trading data plus the pure functions needed by the tests.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/metrics.test.ts`
Expected: PASS

### Task 3: Dashboard Composition

**Files:**
- Create: `src/App.tsx`
- Create: `src/components/*.tsx`
- Create: `src/App.test.tsx`

**Step 1: Write the failing test**

Add tests that assert:
- the dashboard renders headline metrics from sample data
- selecting a different day changes the visible day detail
- review/compliance sections are present

**Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL because the app UI does not exist yet.

**Step 3: Write minimal implementation**

Build the dashboard layout and connect it to the seeded data/metric functions.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx`
Expected: PASS

### Task 4: Charting Layer

**Files:**
- Create: `src/components/SessionChart.tsx`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

Add a rendering test that expects the session chart wrapper to appear for the selected day.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL because the chart container is not rendered.

**Step 3: Write minimal implementation**

Integrate Lightweight Charts for candlesticks, VWAP, EMA200, and execution markers.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx`
Expected: PASS

### Task 5: Final Verification

**Files:**
- Modify as needed after verification

**Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS

**Step 2: Run the production build**

Run: `npm run build`
Expected: PASS

**Step 3: Smoke-check the app locally**

Run: `npm run dev -- --host 127.0.0.1 --port 4173`
Expected: App loads with overview stats, day switching, and session chart.
