export default function DataQualityBadge({ quality }) {
  if (!quality) return null;
  const good = quality.coverage_pct >= 85;
  return (
    <div className="quality-row">
      <div className={`quality-dot ${good ? '' : 'warn'}`} />
      <span>
        <strong>Data Coverage:</strong> {quality.coverage_pct}% ({quality.original_records.toLocaleString()} of {quality.total_days.toLocaleString()} days)
      </span>
      {quality.tmax_null_remaining > 0 && (
        <span style={{ color: '#eab308' }}>
          ⚠️ {quality.tmax_null_remaining} missing temperature values after cleaning
        </span>
      )}
      {good && <span style={{ color: '#22c55e', marginLeft: 'auto' }}>✓ Good quality data</span>}
    </div>
  );
}
