import { useState } from 'react';
import { useHazardData } from './hooks/useHazardData';
import ControlPanel from './components/ControlPanel/ControlPanel';
import InsightCards from './components/InsightCards/InsightCards';
import InsightBanner from './components/InsightBanner/InsightBanner';
import TimeSeriesChart from './components/TimeSeriesChart/TimeSeriesChart';
import IntensityChart from './components/IntensityChart/IntensityChart';
import MapView from './components/MapView/MapView';
import ExportPanel from './components/ExportPanel/ExportPanel';
import DataQualityBadge from './components/DataQualityBadge/DataQualityBadge';
import { reverseGeocode } from './services/api';
import {
  DEFAULT_REGION,
  DEFAULT_HAZARD,
  DEFAULT_START_YEAR,
  DEFAULT_END_YEAR,
} from './utils/constants';

function App() {
  const [params, setParams] = useState({
    lat: DEFAULT_REGION.lat,
    lon: DEFAULT_REGION.lon,
    regionName: DEFAULT_REGION.name,
    hazard: DEFAULT_HAZARD,
    startYear: DEFAULT_START_YEAR,
    endYear: DEFAULT_END_YEAR,
    mode: 'point',
    box: {
      minLat: 18.85,
      maxLat: 19.30,
      minLon: 72.75,
      maxLon: 73.05,
    },
  });

  const { data, loading, error, loadingStep, analyze } = useHazardData();

  const handleAnalyze = () => {
    analyze({
      lat: params.lat,
      lon: params.lon,
      hazard: params.hazard,
      startYear: params.startYear,
      endYear: params.endYear,
      regionName: params.regionName || `${params.lat}, ${params.lon}`,
    });
  };

  const handleMapSelect = async (lat, lon, explicitName = null) => {
    if (explicitName) {
      setParams((p) => ({
        ...p,
        lat,
        lon,
        regionName: explicitName,
        box:
          p.mode === 'box'
            ? {
                minLat: parseFloat((lat - 0.25).toFixed(4)),
                maxLat: parseFloat((lat + 0.25).toFixed(4)),
                minLon: parseFloat((lon - 0.25).toFixed(4)),
                maxLon: parseFloat((lon + 0.25).toFixed(4)),
              }
            : p.box,
      }));
      return;
    }

    setParams((p) => ({
      ...p,
      lat,
      lon,
      regionName: `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`,
      box:
        p.mode === 'box'
          ? {
              minLat: parseFloat((lat - 0.25).toFixed(4)),
              maxLat: parseFloat((lat + 0.25).toFixed(4)),
              minLon: parseFloat((lon - 0.25).toFixed(4)),
              maxLon: parseFloat((lon + 0.25).toFixed(4)),
            }
          : p.box,
    }));

    try {
      const res = await reverseGeocode(lat, lon);
      if (res?.name) {
        setParams((p) => ({ ...p, regionName: res.name }));
      }
    } catch {
      // coordinates fallback retained
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container header-inner">
          <a href="/" className="logo">
            <div className="logo-icon">🌡️</div>
            ClimateScope
          </a>
          <div className="header-badge">Historical Climate Hazard Intelligence</div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="container">
            <h1 className="hero-title">
              Analyze <span>Climate Hazards</span><br />Across History
            </h1>
            <p className="hero-sub">
              Detect heatwaves, droughts, and extreme rainfall events using real
              historical weather data. Visualize 30+ year trends for any city, state, or custom lat-lon box.
            </p>
          </div>
        </section>

        <div className="container">
          {/* Control Panel */}
          <ControlPanel
            params={params}
            setParams={setParams}
            onAnalyze={handleAnalyze}
            loading={loading}
          />

          {/* Interactive Map with Climate Hazard Impact Visualizer */}
          <MapView
            lat={params.lat}
            lon={params.lon}
            regionName={params.regionName}
            hazard={params.hazard}
            data={data}
            mode={params.mode}
            box={params.box}
            onLocationSelect={handleMapSelect}
            onAnalyze={handleAnalyze}
            loading={loading}
          />

          {/* Loading State */}
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <div className="loading-text">{loadingStep || 'Analyzing climate data…'}</div>
              <div className="loading-sub">
                Ingesting {params.startYear}–{params.endYear} climate records for {params.regionName}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="error-card">
              <h3>⚠️ Analysis Failed</h3>
              <p>{error}</p>
              <button className="btn-retry" onClick={handleAnalyze}>
                🔄 Retry Analysis
              </button>
            </div>
          )}

          {/* Results Visualizations */}
          {data && !loading && (
            <>
              {/* Data Quality */}
              <DataQualityBadge quality={data.data_quality} />

              {/* Summary Insight Banner */}
              <InsightBanner data={data} />

              {/* Stat Cards */}
              <InsightCards data={data} />

              {/* Export Panel */}
              <ExportPanel params={params} hasData={!!data} />

              {/* Time Series Frequency Chart */}
              <div className="charts-grid">
                <TimeSeriesChart data={data} />
              </div>

              {/* Intensity & Duration Chart */}
              <div className="charts-grid">
                <IntensityChart data={data} />
              </div>

              {/* Cache Notice */}
              {data.cached && (
                <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.78rem', marginBottom: 16 }}>
                  ⚡ Results served from low-latency cache
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!data && !loading && !error && (
            <div className="empty-state">
              <div className="empty-icon">🌍</div>
              <div className="empty-title">Ready to Analyze</div>
              <p className="empty-sub">
                Select a region on the map or search above, choose a hazard, set a year range, and click <strong>Analyze Trends</strong>
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          Climate data ingested from{' '}
          <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" style={{ color: '#f97316' }}>
            Open-Meteo Archive
          </a>{' '}
          · Geocoding by{' '}
          <a href="https://nominatim.openstreetmap.org" target="_blank" rel="noopener noreferrer" style={{ color: '#f97316' }}>
            OpenStreetMap Nominatim
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
