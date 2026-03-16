# Modern Ink Dashboard Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the trading review dashboard into a modern ink-style workspace that feels premium, professional, and purpose-built for trading review instead of a generic analytics app.

**Architecture:** Keep the current React + Vite SPA and API contracts, but replace the visual shell, page composition, and shared UI primitives with a more opinionated system. Concentrate the redesign in the global shell, shared CSS, and the highest-traffic pages (`Overview`, `Journal`, `Review`, `Analytics`) so the product reads as one unified interface.

**Tech Stack:** React 18, TypeScript, Vite, Recharts, custom CSS

### Task 1: Define the visual system

**Files:**
- Modify: `src/index.css`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/TabNav.tsx`

**Step 1: Audit the current shell**

Identify duplicated shell rules, inconsistent card treatments, weak navigation hierarchy, and places where the current "paper" motif becomes decorative instead of structural.

**Step 2: Define the new direction**

Adopt a "water-ink trading terminal" direction:
- charcoal + rice-paper contrast instead of all-over beige
- cinnabar accent for focus/risk moments
- jade green only for positive trading outcomes
- restrained serif display + mono numerics for hierarchy
- stronger negative space, edge framing, and dashboard zoning

**Step 3: Implement the new shell**

Replace the current top strip with a more architectural shell and navigation treatment that supports both desktop and mobile layouts.

### Task 2: Recompose the dashboard pages

**Files:**
- Modify: `src/pages/Overview.tsx`
- Modify: `src/pages/Analytics.tsx`
- Modify: `src/pages/Journal.tsx`
- Modify: `src/pages/Review.tsx`
- Modify: `src/pages/Settings.tsx`

**Step 1: Rebuild page headers**

Introduce stronger hero copy, context labels, and metadata areas so every page feels like part of the same product.

**Step 2: Rebuild the highest-value layouts**

Prioritize:
- `Overview` as the strategic dashboard
- `Review` as the premium focused workspace
- `Journal` as the operational log

**Step 3: Improve empty-state quality**

When there is no imported data, the interface must still feel deliberate and premium rather than unfinished.

### Task 3: Unify shared components and chart framing

**Files:**
- Modify: `src/components/charts/EquityCurve.tsx`
- Modify: `src/components/charts/DailyPnLBar.tsx`
- Modify: `src/components/charts/PnLDistribution.tsx`
- Modify: `src/components/charts/WinRateDonut.tsx`
- Modify: `src/components/journal/JournalForm.tsx`
- Modify: `src/components/journal/PdfUpload.tsx`

**Step 1: Align chart palettes and tooltips**

Move away from generic analytics defaults and give charts the same ink-terminal palette and framing language as the rest of the UI.

**Step 2: Improve form surfaces**

Refine journaling controls, chips, and upload affordances so the review workflow feels more premium and intentional.

### Task 4: Verify the redesign

**Files:**
- Modify as needed after verification

**Step 1: Run the test suite**

Run: `npm test`

**Step 2: Run the production build**

Run: `npm run build`

**Step 3: Smoke check the app**

Run the local app and confirm the new shell, responsive behavior, and empty-state presentation render correctly.
