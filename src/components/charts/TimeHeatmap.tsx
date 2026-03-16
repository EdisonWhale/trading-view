interface Props {
  data: Array<{ hour: number; totalPnl: number; tradeCount: number }>;
}

function formatHour(h: number): string {
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 || 12;
  return `${hh}${ampm}`;
}

export function TimeHeatmap({ data }: Props) {
  const map = new Map(data.map((d) => [d.hour, d]));
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.totalPnl)), 1);

  return (
    <div style={{ overflowX: 'auto' }}>
      <div
        style={{
          display: 'flex',
          gap: 3,
          alignItems: 'flex-end',
          minWidth: 600,
          padding: '0 4px',
        }}
      >
        {Array.from({ length: 24 }, (_, h) => {
          const d = map.get(h);
          const pnl = d?.totalPnl ?? 0;
          const count = d?.tradeCount ?? 0;
          const intensity = maxAbs > 0 ? Math.min(Math.abs(pnl) / maxAbs, 1) : 0;
          const color =
            pnl > 0
              ? `rgba(31, 157, 108, ${0.14 + intensity * 0.62})`
              : pnl < 0
              ? `rgba(214, 97, 97, ${0.12 + intensity * 0.55})`
              : 'rgba(90, 103, 118, 0.08)';
          const barHeight = count > 0 ? Math.max(24, Math.min(80, 24 + count * 12)) : 24;

          return (
            <div
              key={h}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                title={`${formatHour(h)}: ${count}笔, $${pnl.toFixed(2)}`}
                style={{
                  width: '100%',
                  height: barHeight,
                  background: color,
                  borderRadius: 10,
                  border: '1px solid rgba(90, 103, 118, 0.10)',
                  cursor: count > 0 ? 'help' : 'default',
                  transition: 'opacity 150ms, transform 150ms',
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: '#8c96a4',
                  fontFamily: 'IBM Plex Mono, monospace',
                }}
              >
                {h % 3 === 0 ? formatHour(h) : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
