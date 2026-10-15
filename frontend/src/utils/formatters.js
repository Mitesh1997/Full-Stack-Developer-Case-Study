export function formatNumber(n, decimals = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toFixed(decimals);
}

export function formatPct(n) {
  if (n === null || n === undefined) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${formatNumber(n, 1)}%`;
}

export function formatPValue(p) {
  if (p < 0.001) return 'p < 0.001';
  return `p = ${formatNumber(p, 3)}`;
}

export function yearRange(start, end) {
  return `${start}–${end}`;
}
