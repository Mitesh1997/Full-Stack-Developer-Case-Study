import { formatNumber, formatPct } from '../../utils/formatters';
import { HAZARD_COLORS } from '../../utils/constants';

export default function InsightCards({ data }) {
  if (!data) return null;

  const { trend, total_events, annual_frequency, hazard } = data;
  const colors = HAZARD_COLORS[hazard] || HAZARD_COLORS.heatwave;

  const pct = trend?.percent_change;
  const direction = pct !== null && pct !== undefined ? (pct > 0 ? 'up' : 'down') : 'neutral';

  // Avg events per year
  const avgPerYear = annual_frequency?.length
    ? annual_frequency.reduce((s, a) => s + a.count, 0) / annual_frequency.length
    : 0;

  // Max single year
  const maxYear = annual_frequency?.length
    ? annual_frequency.reduce((mx, a) => (a.count > mx.count ? a : mx), annual_frequency[0])
    : null;

  // Avg duration
  const avgDuration = annual_frequency?.length
    ? annual_frequency.reduce((s, a) => s + a.avg_duration_days, 0) / annual_frequency.filter((a) => a.count > 0).length || 0
    : 0;

  const cards = [
    {
      icon: '📊',
      value: total_events ?? '—',
      label: 'Total Events Detected',
      cls: 'heat',
      valCls: 'neutral',
    },
    {
      icon: pct !== null && pct > 0 ? '📈' : '📉',
      value: formatPct(pct),
      label: `Change since ${data.time_range?.[0]}`,
      cls: hazard,
      valCls: direction,
    },
    {
      icon: '📅',
      value: maxYear ? `${maxYear.year}` : '—',
      label: `Worst Year (${maxYear?.count ?? 0} events)`,
      cls: 'heat',
      valCls: 'neutral',
    },
    {
      icon: '⏱️',
      value: `${formatNumber(isFinite(avgDuration) ? avgDuration : 0)} days`,
      label: 'Avg Event Duration',
      cls: 'neutral',
      valCls: 'neutral',
    },
  ];

  return (
    <div className="insights-bar">
      {cards.map((c, i) => (
        <div key={i} className={`insight-card ${c.cls}`}>
          <div className="insight-icon">{c.icon}</div>
          <div className={`insight-value ${c.valCls}`}>{c.value}</div>
          <div className="insight-label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
