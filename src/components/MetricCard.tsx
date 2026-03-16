interface MetricCardProps {
  label: string;
  value: string;
  tone?: 'neutral' | 'profit' | 'loss' | 'warn' | 'accent';
  detail: string;
}

export function MetricCard({ label, value, tone = 'neutral', detail }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">{value}</strong>
      <p className="metric-card__detail">{detail}</p>
    </article>
  );
}
