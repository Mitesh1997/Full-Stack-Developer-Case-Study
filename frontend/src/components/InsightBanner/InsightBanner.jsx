import { formatPValue } from '../../utils/formatters';

export default function InsightBanner({ data }) {
  if (!data?.insight) return null;

  const { hazard, trend, insight } = data;
  const mk = trend?.mann_kendall;

  return (
    <div className={`insight-banner ${hazard}`}>
      <div className="insight-banner-icon">
        {hazard === 'heatwave' ? '🔥' : hazard === 'drought' ? '🌵' : '🌧️'}
      </div>
      <div className="insight-banner-text">
        <strong>Key Insight: </strong>{insight}
        {trend && (
          <span style={{ color: '#64748b', fontSize: '0.85em' }}>
            {' '}(R² = {trend.r_squared?.toFixed(2) ?? '—'}, {formatPValue(trend.p_value)})
          </span>
        )}
      </div>
      {mk && (
        <div className={`mk-badge ${mk.h ? 'significant' : 'not-significant'}`}>
          {mk.h ? '✓ Significant' : '~ Inconclusive'}
        </div>
      )}
    </div>
  );
}
