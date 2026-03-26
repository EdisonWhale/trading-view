import { useState, useMemo } from 'react';

interface SessionDay {
  date: string;
  netPnl: number;
  tradeCount: number;
}

interface Props {
  sessions: SessionDay[];
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri'];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function buildCalendar(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const dow = firstDay.getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: Date[] = [];
  for (let i = dow; i > 0; i--) days.push(new Date(year, month, 1 - i));
  for (let d = 1; d <= lastDate; d++) days.push(new Date(year, month, d));
  let n = 1;
  while (days.length % 7 !== 0) days.push(new Date(year, month + 1, n++));
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function fmt(val: number): string {
  const abs = Math.abs(val).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${val < 0 ? '-' : ''}$${abs}`;
}

function getIntensity(pnl: number, max: number): number {
  if (max === 0) return 0.15;
  return Math.min(Math.abs(pnl) / max, 1);
}

export function PnLCalendar({ sessions }: Props) {
  const today = new Date();

  const [year, setYear] = useState(() => {
    if (!sessions.length) return today.getFullYear();
    return parseInt(sessions[sessions.length - 1].date.slice(0, 4), 10);
  });
  const [month, setMonth] = useState(() => {
    if (!sessions.length) return today.getMonth();
    return parseInt(sessions[sessions.length - 1].date.slice(5, 7), 10) - 1;
  });

  const map = useMemo(() => {
    const m = new Map<string, { netPnl: number; tradeCount: number }>();
    for (const s of sessions) m.set(s.date, { netPnl: s.netPnl, tradeCount: s.tradeCount });
    return m;
  }, [sessions]);

  const maxAbsPnl = useMemo(() => {
    let max = 0;
    for (const s of sessions) max = Math.max(max, Math.abs(s.netPnl));
    return max;
  }, [sessions]);

  const weeks = useMemo(() => buildCalendar(year, month), [year, month]);

  const monthlyPnl = useMemo(() => {
    let t = 0;
    for (const s of sessions) {
      const d = new Date(s.date + 'T00:00:00');
      if (d.getFullYear() === year && d.getMonth() === month) t += s.netPnl;
    }
    return t;
  }, [sessions, year, month]);

  const hasMonthData = useMemo(() =>
    sessions.some(s => {
      const d = new Date(s.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    }), [sessions, year, month]);

  const todayStr = toDateStr(today);

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  return (
    <div>
      {/* ── Header: month title + monthly P&L ──────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 18,
        borderBottom: '1px solid var(--line)',
        gap: 24,
      }}>
        {/* Left: month name + navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '1.9rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--ink-900)',
            lineHeight: 1,
          }}>
            {MONTH_NAMES[month]}
          </span>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '0.88rem',
            color: 'var(--ink-500)',
            fontWeight: 400,
          }}>
            {year}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[{ fn: prev, label: '←' }, { fn: next, label: '→' }].map(({ fn, label }) => (
              <button
                key={label}
                onClick={fn}
                style={{
                  background: 'var(--paper-soft)',
                  border: '1px solid var(--line)',
                  borderRadius: 7,
                  width: 28,
                  height: 28,
                  cursor: 'pointer',
                  color: 'var(--ink-600)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
              style={{
                background: 'var(--accent-soft)',
                border: '1px solid var(--accent-line)',
                borderRadius: 7,
                padding: '0 11px',
                height: 28,
                cursor: 'pointer',
                color: 'var(--accent)',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Today
            </button>
          </div>
        </div>

        {/* Right: monthly P&L total */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '0.65rem',
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: 'var(--ink-500)',
            fontWeight: 600,
            marginBottom: 3,
          }}>
            Monthly P/L
          </div>
          <div style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '1.65rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: hasMonthData
              ? monthlyPnl >= 0 ? '#26a69a' : '#ef5350'
              : 'var(--ink-500)',
          }}>
            {hasMonthData ? fmt(monthlyPnl) : '—'}
          </div>
        </div>
      </div>

      {/* ── Calendar grid ───────────────────────────────────────────────────── */}
      {/* Outer border */}
      <div style={{
        border: '1px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {/* Single grid container — gap acts as uniform 1px border between all cells */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr) 0.85fr',
          gridTemplateRows: 'auto',
          gap: '1px',
          background: 'var(--line)',
        }}>
          {/* ── Day-of-week header row ── */}
          {DAY_LABELS.map(label => (
            <div key={label} style={{
              background: 'var(--paper-soft)',
              padding: '9px 0',
              textAlign: 'center',
              fontSize: '0.66rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-500)',
            }}>
              {label}
            </div>
          ))}
          {/* Wk header */}
          <div style={{
            background: 'var(--paper-soft)',
            padding: '9px 0',
            textAlign: 'center',
            fontSize: '0.66rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
          }}>
            Wk
          </div>

          {/* ── Day cells (all weeks flattened into the same grid) ── */}
          {weeks.flatMap((week, wi) => {
            let wPnl = 0, wTrades = 0;
            for (const d of week) {
              const dd = map.get(toDateStr(d));
              if (dd) { wPnl += dd.netPnl; wTrades += dd.tradeCount; }
            }
            const weekNum = Math.ceil(week[6].getDate() / 7);

            const dayCells = week.slice(0, 6).map((day) => {
              const dStr = toDateStr(day);
              const isCurrent = day.getMonth() === month;
              const isToday = dStr === todayStr;
              const data = map.get(dStr);
              const hasTrade = Boolean(data);
              const isProfit = hasTrade && data!.netPnl >= 0;
              const ity = hasTrade ? getIntensity(data!.netPnl, maxAbsPnl) : 0;

              let cellBg = isCurrent ? 'var(--paper-strong)' : 'var(--paper-soft)';
              if (hasTrade) {
                const alpha = 0.15 + ity * 0.30;
                cellBg = isProfit
                  ? `rgba(38,166,154,${alpha})`
                  : `rgba(239,83,80,${alpha})`;
              }

              return (
                <div
                  key={dStr}
                  style={{
                    background: cellBg,
                    padding: '10px 11px 11px',
                    minHeight: 90,
                    opacity: isCurrent ? 1 : 0.45,
                    position: 'relative',
                    outline: isToday ? '2px solid var(--primary)' : 'none',
                    outlineOffset: -2,
                  }}
                >
                  <div style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '0.72rem',
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'var(--primary)' : isCurrent ? 'var(--ink-600)' : 'var(--ink-500)',
                    marginBottom: hasTrade ? 7 : 0,
                  }}>
                    {day.getDate()}
                  </div>
                  {hasTrade && (
                    <>
                      <div style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        lineHeight: 1.15,
                        letterSpacing: '-0.01em',
                        color: isProfit ? '#26a69a' : '#ef5350',
                      }}>
                        {fmt(data!.netPnl)}
                      </div>
                      <div style={{
                        fontSize: '0.65rem',
                        color: 'var(--ink-500)',
                        marginTop: 5,
                      }}>
                        {data!.tradeCount} trades
                      </div>
                    </>
                  )}
                </div>
              );
            });

            // Week summary cell (Saturday column)
            const satDay = week[6];
            const isCurrent = satDay.getMonth() === month;
            const weekCell = (
              <div
                key={`wk-${wi}`}
                style={{
                  background: isCurrent ? 'var(--paper-strong)' : 'var(--paper-soft)',
                  padding: '10px 12px',
                  minHeight: 90,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  opacity: isCurrent ? 1 : 0.45,
                }}
              >
                {wTrades > 0 && (
                  <>
                    <div style={{
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      marginBottom: 5,
                      opacity: 0.8,
                    }}>
                      Wk {weekNum}
                    </div>
                    <div style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.2,
                      color: wPnl >= 0 ? '#26a69a' : '#ef5350',
                    }}>
                      {fmt(wPnl)}
                    </div>
                    <div style={{
                      fontSize: '0.62rem',
                      color: 'var(--ink-500)',
                      marginTop: 5,
                    }}>
                      {wTrades} trades
                    </div>
                  </>
                )}
              </div>
            );

            return [...dayCells, weekCell];
          })}
        </div>
      </div>
    </div>
  );
}
