interface EquitySparklineProps {
  values: number[];
}

export function EquitySparkline({ values }: EquitySparklineProps) {
  if (values.length === 0) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Map to SVG coords with 6% top/bottom padding
  const pts = values.map((value, index) => ({
    x: (index / Math.max(values.length - 1, 1)) * 100,
    y: 94 - ((value - min) / range) * 88,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const first = pts[0];
  const last = pts[pts.length - 1];
  const areaPath = `${linePath} L${last.x},100 L${first.x},100 Z`;

  const isUp = values[values.length - 1] >= values[0];
  const lineColor = isUp ? 'var(--profit)' : 'var(--loss)';
  const gradientId = isUp ? 'sparkline-up' : 'sparkline-down';
  const stopColor = isUp ? '#2E7A4E' : '#C4311F';

  return (
    <svg
      aria-hidden="true"
      className="equity-sparkline"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={stopColor} stopOpacity="0.28" />
          <stop offset="75%"  stopColor={stopColor} stopOpacity="0.06" />
          <stop offset="100%" stopColor={stopColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} className="sparkline-area" fill={`url(#${gradientId})`} />
      <path d={linePath} className="sparkline-line" style={{ stroke: lineColor }} />
    </svg>
  );
}
