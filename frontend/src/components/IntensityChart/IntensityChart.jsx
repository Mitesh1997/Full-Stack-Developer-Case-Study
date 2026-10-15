import { Bar } from 'react-chartjs-2';
import { HAZARD_COLORS } from '../../utils/constants';

export default function IntensityChart({ data }) {
  if (!data?.annual_frequency) return null;

  const { annual_frequency, hazard } = data;
  const colors = HAZARD_COLORS[hazard] || HAZARD_COLORS.heatwave;

  // Duration chart
  const labels = annual_frequency.map((a) => a.year);
  const durations = annual_frequency.map((a) => a.avg_duration_days);
  const intensities = annual_frequency.map((a) => a.avg_intensity);

  const durationData = {
    labels,
    datasets: [{
      label: 'Avg Duration (days)',
      data: durations,
      backgroundColor: annual_frequency.map((a) =>
        a.avg_duration_days > 0
          ? colors.glow.replace('0.25', '0.6')
          : 'rgba(100,116,139,0.2)'
      ),
      borderColor: colors.primary,
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const intensityData = {
    labels,
    datasets: [{
      label: hazard === 'heatwave' ? 'Peak Temp (°C)' : hazard === 'drought' ? 'Avg Precip (mm)' : 'Peak Precip (mm)',
      data: intensities,
      backgroundColor: intensities.map((v) =>
        v > 0 ? colors.glow.replace('0.25', '0.5') : 'rgba(100,116,139,0.2)'
      ),
      borderColor: colors.light,
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeInOutQuart' },
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, boxWidth: 20, padding: 12 },
      },
      tooltip: {
        backgroundColor: 'rgba(13,23,38,0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 10 },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
    },
  };

  return (
    <>
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <div className="chart-title">Average Event Duration</div>
            <div className="chart-subtitle">Days per event, per year</div>
          </div>
        </div>
        <div className="chart-container">
          <Bar data={durationData} options={baseOptions} />
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <div className="chart-title">
              {hazard === 'heatwave' ? 'Peak Temperature' : 'Precipitation Intensity'}
            </div>
            <div className="chart-subtitle">
              {hazard === 'heatwave' ? 'Max temperature during events (°C)' : 'Precipitation during events (mm)'}
            </div>
          </div>
        </div>
        <div className="chart-container">
          <Bar data={intensityData} options={baseOptions} />
        </div>
      </div>
    </>
  );
}
