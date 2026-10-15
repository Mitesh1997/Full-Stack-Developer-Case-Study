import { useRef, useEffect } from 'react';
import { useRegionSearch } from '../../hooks/useRegionSearch';
import { HAZARDS, DEFAULT_START_YEAR, DEFAULT_END_YEAR } from '../../utils/constants';

export default function ControlPanel({ params, setParams, onAnalyze, loading }) {
  const { query, setQuery, suggestions, selected, searching, selectSuggestion } = useRegionSearch();
  const suggestRef = useRef(null);

  // Sync region into params on suggestion selection
  useEffect(() => {
    if (selected) {
      setParams((p) => ({
        ...p,
        lat: selected.lat,
        lon: selected.lon,
        regionName: selected.name,
      }));
    }
  }, [selected, setParams]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        // suggestions cleanup
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!params.lat || !params.lon) return;
    onAnalyze();
  };

  const handleModeChange = (newMode) => {
    if (newMode === 'box') {
      const minLat = parseFloat((params.lat - 0.25).toFixed(4));
      const maxLat = parseFloat((params.lat + 0.25).toFixed(4));
      const minLon = parseFloat((params.lon - 0.25).toFixed(4));
      const maxLon = parseFloat((params.lon + 0.25).toFixed(4));
      setParams((p) => ({
        ...p,
        mode: 'box',
        box: { minLat, maxLat, minLon, maxLon },
        regionName: `${p.regionName || 'Custom Region'} [Box]`,
      }));
    } else {
      setParams((p) => ({
        ...p,
        mode: 'point',
      }));
    }
  };

  const updateBoxCoord = (field, val) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed)) return;

    setParams((p) => {
      const newBox = { ...(p.box || {}), [field]: parsed };
      const centerLat = parseFloat(((newBox.minLat + newBox.maxLat) / 2).toFixed(4));
      const centerLon = parseFloat(((newBox.minLon + newBox.maxLon) / 2).toFixed(4));
      return {
        ...p,
        box: newBox,
        lat: centerLat,
        lon: centerLon,
      };
    });
  };

  return (
    <div className="control-panel">
      <form onSubmit={handleSubmit}>
        {/* Region Mode Toggle */}
        <div className="mode-toggle-row">
          <div className="mode-segmented">
            <button
              type="button"
              className={`btn-mode-tab ${params.mode !== 'box' ? 'active' : ''}`}
              onClick={() => handleModeChange('point')}
            >
              📍 City / Point Location
            </button>
            <button
              type="button"
              className={`btn-mode-tab ${params.mode === 'box' ? 'active' : ''}`}
              onClick={() => handleModeChange('box')}
            >
              🔲 Custom Lat-Lon Box
            </button>
          </div>
          {params.mode === 'box' && (
            <div className="mode-box-info">
              Bounds: {params.box?.minLat}°–{params.box?.maxLat}° N, {params.box?.minLon}°–{params.box?.maxLon}° E
            </div>
          )}
        </div>

        <div className="control-grid">
          {/* Region Selection: Point vs Box */}
          <div className="field-group">
            {params.mode !== 'box' ? (
              <>
                <label className="field-label">📍 Region / City</label>
                <div className="region-wrapper" ref={suggestRef}>
                  <input
                    id="region-search"
                    className="field-input"
                    type="text"
                    placeholder="e.g. Mumbai, Delhi, London…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                  />
                  {searching && (
                    <div className="region-suggestions">
                      <div className="suggestion-item">
                        <span className="suggestion-sub">Searching…</span>
                      </div>
                    </div>
                  )}
                  {suggestions.length > 0 && (
                    <div className="region-suggestions">
                      {suggestions.map((s, i) => (
                        <div
                          key={i}
                          className="suggestion-item"
                          onMouseDown={() => selectSuggestion(s)}
                        >
                          <div className="suggestion-name">
                            {s.name}{' '}
                            {s.country_code && (
                              <span style={{ color: '#64748b' }}>({s.country_code})</span>
                            )}
                          </div>
                          <div className="suggestion-sub">{s.display_name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manual lat/lon fallback */}
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input
                    className="field-input"
                    type="number"
                    placeholder="Lat"
                    step="0.0001"
                    min="-90"
                    max="90"
                    value={params.lat}
                    onChange={(e) =>
                      setParams((p) => ({ ...p, lat: parseFloat(e.target.value) || '' }))
                    }
                    style={{ flex: 1 }}
                    title="Latitude"
                  />
                  <input
                    className="field-input"
                    type="number"
                    placeholder="Lon"
                    step="0.0001"
                    min="-180"
                    max="180"
                    value={params.lon}
                    onChange={(e) =>
                      setParams((p) => ({ ...p, lon: parseFloat(e.target.value) || '' }))
                    }
                    style={{ flex: 1 }}
                    title="Longitude"
                  />
                </div>
              </>
            ) : (
              <>
                <label className="field-label">🔲 Custom Lat-Lon Box Coordinates</label>
                <div className="box-inputs-grid">
                  <div className="box-input-col">
                    <label className="sub-label">Min Lat</label>
                    <input
                      className="field-input box-field"
                      type="number"
                      step="0.01"
                      value={params.box?.minLat ?? ''}
                      onChange={(e) => updateBoxCoord('minLat', e.target.value)}
                    />
                  </div>
                  <div className="box-input-col">
                    <label className="sub-label">Max Lat</label>
                    <input
                      className="field-input box-field"
                      type="number"
                      step="0.01"
                      value={params.box?.maxLat ?? ''}
                      onChange={(e) => updateBoxCoord('maxLat', e.target.value)}
                    />
                  </div>
                  <div className="box-input-col">
                    <label className="sub-label">Min Lon</label>
                    <input
                      className="field-input box-field"
                      type="number"
                      step="0.01"
                      value={params.box?.minLon ?? ''}
                      onChange={(e) => updateBoxCoord('minLon', e.target.value)}
                    />
                  </div>
                  <div className="box-input-col">
                    <label className="sub-label">Max Lon</label>
                    <input
                      className="field-input box-field"
                      type="number"
                      step="0.01"
                      value={params.box?.maxLon ?? ''}
                      onChange={(e) => updateBoxCoord('maxLon', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Hazard Type */}
          <div className="field-group">
            <label className="field-label">⚠️ Hazard Type (Heatwave Default)</label>
            <div className="hazard-options">
              {HAZARDS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className={`hazard-btn ${params.hazard === h.id ? h.colorClass : ''}`}
                  onClick={() => setParams((p) => ({ ...p, hazard: h.id }))}
                >
                  <span className="hazard-emoji">{h.emoji}</span>
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range */}
          <div className="field-group">
            <label className="field-label">📅 Historical Range (e.g. 1990–2020)</label>
            <div className="year-range-row">
              <input
                id="start-year"
                className="field-input"
                type="number"
                min="1940"
                max="2022"
                value={params.startYear}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    startYear: parseInt(e.target.value) || DEFAULT_START_YEAR,
                  }))
                }
                placeholder="From"
              />
              <input
                id="end-year"
                className="field-input"
                type="number"
                min="1942"
                max="2024"
                value={params.endYear}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    endYear: parseInt(e.target.value) || DEFAULT_END_YEAR,
                  }))
                }
                placeholder="To"
              />
            </div>
          </div>

          {/* Analyze Button */}
          <div className="field-group">
            <label className="field-label" style={{ visibility: 'hidden' }}>
              Action
            </label>
            <button
              id="analyze-btn"
              type="submit"
              className="btn-analyze"
              disabled={loading || !params.lat || !params.lon}
            >
              {loading ? (
                <>
                  <span
                    className="loading-spinner"
                    style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }}
                  />
                  Analyzing…
                </>
              ) : (
                <>🔍 Analyze Trends</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
