import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { HAZARD_COLORS } from '../../utils/constants';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
);

export default function TimeSeriesChart({ data }) {
  if (!data?.annual_frequency) return null;

  const { annual_frequency, rolling_average, trend, hazard } = data;
  const colors = HAZARD_COLORS[hazard] || HAZARD_COLORS.heatwave;

  const labels = annual_frequency.map((a) => a.year);
  const counts = annual_frequency.map((a) => a.count);
  const rolling = rolling_average?.map((r) => r.rolling_avg) || [];
  const regression = trend?.regression_line?.map((r) => r.predicted) || [];

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Annual Events',
        data: counts,
        borderColor: colors.primary,
        backgroundColor: colors.glow,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
        order: 3,
      },
      {
        label: '5-Year Rolling Avg',
        data: rolling,
        borderColor: colors.light,
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        borderDash: [6, 3],
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.4,
        order: 2,
      },
      ...(regression.length
        ? [{
            label: 'Trend Line',
            data: regression,
            borderColor: 'rgba(255,255,255,0.3)',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [3, 3],
            pointRadius: 0,
            tension: 0,
            order: 1,
          }]
        : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    animation: { duration: 800, easing: 'easeInOutQuart' },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 11 },
          boxWidth: 24,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(13,23,38,0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1) ?? '—'}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
        title: { display: true, text: 'Events per year', color: '#64748b', font: { size: 11 } },
      },
    },
  };

  return (
    <div className="chart-card full-width">
      <div className="chart-header">
        <div>
          <div className="chart-title">Event Frequency Over Time</div>
          <div className="chart-subtitle">Annual count with rolling average and trend line</div>
        </div>
        {trend?.direction && (
          <div className="chart-badge">
            {trend.direction === 'increasing' ? '↑ Increasing' : trend.direction === 'decreasing' ? '↓ Decreasing' : '→ Stable'}
          </div>
        )}
      </div>
      <div className="chart-container">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
