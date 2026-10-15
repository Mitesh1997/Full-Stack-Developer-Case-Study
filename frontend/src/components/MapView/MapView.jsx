import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HAZARDS, HAZARD_COLORS, PRESET_LOCATIONS } from '../../utils/constants';

// Tile layer definitions (100% free, no API keys needed)
const TILE_LAYERS = {
  dark: {
    name: '🌙 Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  satellite: {
    name: '🛰️ Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
    subdomains: 'abc',
    maxZoom: 18,
  },
  streets: {
    name: '🗺️ Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 19,
  },
};

// Create a glowing, modern custom SVG/HTML divIcon matching the hazard theme
function createHazardIcon(hazardType) {
  const color = HAZARD_COLORS[hazardType]?.primary || '#f97316';
  const emoji = hazardType === 'drought' ? '🌵' : hazardType === 'rainfall' ? '🌧️' : '🔥';

  return L.divIcon({
    className: 'hazard-custom-marker-wrapper',
    html: `
      <div class="hazard-custom-marker ${hazardType}">
        <div class="marker-pulse-ring" style="border-color: ${color};"></div>
        <div class="marker-core" style="background: ${color}; box-shadow: 0 0 16px ${color};">
          <span class="marker-emoji">${emoji}</span>
        </div>
        <div class="marker-stem" style="border-top-color: ${color};"></div>
      </div>
    `,
    iconSize: [42, 48],
    iconAnchor: [21, 46],
    popupAnchor: [0, -42],
  });
}

export default function MapView({
  lat,
  lon,
  regionName,
  hazard = 'heatwave',
  data = null,
  mode = 'point',
  box = null,
  onLocationSelect,
  onBoxSelect,
  onAnalyze,
  loading = false,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentTileLayerRef = useRef(null);
  const markerRef = useRef(null);
  const hazardCircleRef = useRef(null);
  const boundingBoxRef = useRef(null);
  const lastFlewToRef = useRef(null);

  const [activeTile, setActiveTile] = useState('dark');
  const [cursorCoords, setCursorCoords] = useState(null);
  const [isDrawingBox, setIsDrawingBox] = useState(false);
  const drawStartRef = useRef(null);

  const activeColor = HAZARD_COLORS[hazard]?.primary || '#f97316';
  const activeHazardObj = HAZARDS.find((h) => h.id === hazard) || HAZARDS[0];

  // -------------------------------------------------------------
  // 1. Initialize Leaflet Map
  // -------------------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    if (mapContainerRef.current._leaflet_id) {
      delete mapContainerRef.current._leaflet_id;
    }

    const initialLat = Number(lat) || 19.076;
    const initialLon = Number(lon) || 72.8777;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 7,
      zoomControl: false, // We will position custom controls
      scrollWheelZoom: true,
      attributionControl: true,
    });

    // Add zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial base tile layer
    const tileConfig = TILE_LAYERS[activeTile];
    const baseLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      subdomains: tileConfig.subdomains,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    currentTileLayerRef.current = baseLayer;

    // Live mouse position HUD
    map.on('mousemove', (e) => {
      setCursorCoords({
        lat: e.latlng.lat.toFixed(4),
        lon: e.latlng.lng.toFixed(4),
      });
    });

    map.on('mouseout', () => {
      setCursorCoords(null);
    });

    // Click handler for location / box selection
    map.on('click', (e) => {
      const clickLat = parseFloat(e.latlng.lat.toFixed(4));
      const clickLon = parseFloat(e.latlng.lng.toFixed(4));

      if (onLocationSelect) {
        onLocationSelect(clickLat, clickLon);
      }
    });

    // Ensure dimensions are accurately rendered
    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);

    mapInstanceRef.current = map;
    lastFlewToRef.current = `${initialLat.toFixed(3)},${initialLon.toFixed(3)}`;

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      map.remove();
      mapInstanceRef.current = null;
      if (mapContainerRef.current) {
        delete mapContainerRef.current._leaflet_id;
      }
    };
  }, []);

  // -------------------------------------------------------------
  // 2. Handle Base Tile Layer Switch
  // -------------------------------------------------------------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const tileConfig = TILE_LAYERS[activeTile] || TILE_LAYERS.dark;
    const newLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      subdomains: tileConfig.subdomains,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    currentTileLayerRef.current = newLayer;
  }, [activeTile]);

  // -------------------------------------------------------------
  // 3. Update Marker & Fly To when Coordinates Change
  // -------------------------------------------------------------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !lat || !lon) return;

    const nLat = Number(lat);
    const nLon = Number(lon);
    if (isNaN(nLat) || isNaN(nLon)) return;

    // Update or create custom animated marker
    const customIcon = createHazardIcon(hazard);

    if (markerRef.current) {
      markerRef.current.setLatLng([nLat, nLon]);
      markerRef.current.setIcon(customIcon);
    } else {
      markerRef.current = L.marker([nLat, nLon], { icon: customIcon }).addTo(map);
    }

    // Rich dark popup
    const popupContent = document.createElement('div');
    popupContent.className = 'map-popup-inner';

    const eventsCount = data?.total_events !== undefined ? data.total_events : null;
    const trendPct = data?.trend?.percent_change !== undefined ? data.trend.percent_change : null;

    popupContent.innerHTML = `
      <div class="popup-header">
        <span class="popup-hazard-tag ${hazard}">
          ${activeHazardObj.emoji} ${activeHazardObj.label}
        </span>
        <span class="popup-coords">${nLat.toFixed(3)}°, ${nLon.toFixed(3)}°</span>
      </div>
      <div class="popup-region-name">${regionName || 'Selected Location'}</div>
      ${
        data
          ? `
        <div class="popup-stats-grid">
          <div class="popup-stat-item">
            <div class="popup-stat-val" style="color: ${activeColor};">${eventsCount}</div>
            <div class="popup-stat-lbl">Detected Events</div>
          </div>
          <div class="popup-stat-item">
            <div class="popup-stat-val" style="color: ${trendPct > 0 ? '#f87171' : '#4ade80'};">
              ${trendPct !== null ? `${trendPct > 0 ? '+' : ''}${trendPct}%` : 'N/A'}
            </div>
            <div class="popup-stat-lbl">30-Yr Trend</div>
          </div>
        </div>
      `
          : `
        <p class="popup-hint">Click below to analyze historical ${activeHazardObj.label.toLowerCase()} trends for this area.</p>
      `
      }
      <button class="btn-popup-run" id="btn-run-analysis-popup" style="background: ${activeColor};">
        ${loading ? '⏳ Analyzing…' : '⚡ Run Climate Analysis'}
      </button>
    `;

    // Attach click handler safely to popup button
    const runBtn = popupContent.querySelector('#btn-run-analysis-popup');
    if (runBtn && onAnalyze) {
      runBtn.onclick = (ev) => {
        ev.stopPropagation();
        onAnalyze();
      };
    }

    markerRef.current.bindPopup(popupContent, { maxWidth: 300 });

    // Smooth flyTo only if coordinates significantly shifted
    const coordKey = `${nLat.toFixed(3)},${nLon.toFixed(3)}`;
    if (lastFlewToRef.current !== coordKey) {
      lastFlewToRef.current = coordKey;
      map.flyTo([nLat, nLon], Math.max(map.getZoom(), 8), {
        duration: 1.0,
        easeLinearity: 0.25,
      });
    }
  }, [lat, lon, regionName, hazard, data, loading, activeColor, activeHazardObj, onAnalyze]);

  // -------------------------------------------------------------
  // 4. Render Hazard Impact Zone (Heat Circle / Aura)
  // -------------------------------------------------------------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing hazard circle if any
    if (hazardCircleRef.current) {
      map.removeLayer(hazardCircleRef.current);
      hazardCircleRef.current = null;
    }

    if (!data || !lat || !lon) return;

    const nLat = Number(lat);
    const nLon = Number(lon);
    if (isNaN(nLat) || isNaN(nLon)) return;

    // Dynamic radius based on event frequency (25km - 55km)
    const baseRadius = 30000;
    const eventCount = data.total_events || 0;
    const dynamicRadius = Math.min(65000, baseRadius + eventCount * 800);

    const circle = L.circle([nLat, nLon], {
      radius: dynamicRadius,
      color: activeColor,
      weight: 2,
      opacity: 0.85,
      fillColor: activeColor,
      fillOpacity: 0.22,
      dashArray: '4, 6',
      className: 'hazard-aura-circle',
    }).addTo(map);

    const severityLabel =
      eventCount > 25
        ? '🔥 Extreme Hazard Activity'
        : eventCount > 10
        ? '⚠️ High Hazard Activity'
        : '📊 Moderate Hazard Activity';

    circle.bindTooltip(
      `
      <div style="font-weight: 700; color: ${activeColor}; font-size: 0.85rem;">${severityLabel}</div>
      <div style="color: #cbd5e1; font-size: 0.75rem;">Impact Zone: ${(dynamicRadius / 1000).toFixed(0)} km radius</div>
      <div style="color: #94a3b8; font-size: 0.72rem;">${eventCount} total events recorded (${data.time_range ? data.time_range.join('–') : ''})</div>
      `,
      { sticky: true, opacity: 0.95 }
    );

    hazardCircleRef.current = circle;

    return () => {
      if (hazardCircleRef.current && map) {
        map.removeLayer(hazardCircleRef.current);
        hazardCircleRef.current = null;
      }
    };
  }, [data, lat, lon, activeColor]);

  // -------------------------------------------------------------
  // 5. Render Custom Lat-Lon Bounding Box
  // -------------------------------------------------------------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (boundingBoxRef.current) {
      map.removeLayer(boundingBoxRef.current);
      boundingBoxRef.current = null;
    }

    if (mode === 'box' && box) {
      const bounds = [
        [Number(box.minLat), Number(box.minLon)],
        [Number(box.maxLat), Number(box.maxLon)],
      ];

      const rect = L.rectangle(bounds, {
        color: activeColor,
        weight: 2,
        dashArray: '6, 6',
        fillColor: activeColor,
        fillOpacity: 0.15,
      }).addTo(map);

      rect.bindTooltip(
        `<b>Custom Region Box</b><br/>Lat: ${box.minLat}° to ${box.maxLat}°<br/>Lon: ${box.minLon}° to ${box.maxLon}°`,
        { sticky: true }
      );

      boundingBoxRef.current = rect;
    }

    return () => {
      if (boundingBoxRef.current && map) {
        map.removeLayer(boundingBoxRef.current);
        boundingBoxRef.current = null;
      }
    };
  }, [mode, box, activeColor]);

  // -------------------------------------------------------------
  // 6. Quick Preset Location Handler
  // -------------------------------------------------------------
  const handleSelectPreset = (preset) => {
    if (onLocationSelect) {
      onLocationSelect(preset.lat, preset.lon, preset.name);
    }
  };

  // Re-center map button
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (map && lat && lon) {
      map.flyTo([Number(lat), Number(lon)], 8, { duration: 0.8 });
    }
  };

  return (
    <div className="map-section">
      <div className="map-card">
        {/* Map Header with Controls */}
        <div className="map-header">
          <div className="map-header-left">
            <div className="map-title">
              <span className="map-icon">🗺️</span> Interactive Climate Hazard Map
            </div>
            <div className="map-hint">
              {mode === 'box'
                ? 'Selected Bounding Box shown in dashed boundary'
                : 'Click anywhere on Earth to select a coordinate and analyze hazards'}
            </div>
          </div>

          <div className="map-header-right">
            {/* Layer Switcher */}
            <div className="map-layer-switch">
              {Object.entries(TILE_LAYERS).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  className={`btn-layer-pill ${activeTile === key ? 'active' : ''}`}
                  onClick={() => setActiveTile(key)}
                  title={`Switch to ${cfg.name}`}
                >
                  {cfg.name}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn-recenter"
              onClick={handleRecenter}
              title="Recenter Map on Target Location"
            >
              🎯 Recenter
            </button>
          </div>
        </div>

        {/* Quick Preset Location Chips */}
        <div className="map-presets-bar">
          <span className="presets-label">⚡ Quick Regions:</span>
          <div className="presets-scroll">
            {PRESET_LOCATIONS.map((p) => {
              const isSelected =
                Math.abs(Number(lat) - p.lat) < 0.05 && Math.abs(Number(lon) - p.lon) < 0.05;
              return (
                <button
                  key={p.name}
                  type="button"
                  className={`preset-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectPreset(p)}
                >
                  <span>{p.flag}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Map Viewport Container */}
        <div className="map-container-relative">
          <div id="leaflet-map" ref={mapContainerRef} className="map-container" />

          {/* Floating Live Coordinates HUD */}
          {cursorCoords && (
            <div className="map-coords-hud">
              <span className="hud-label">Cursor:</span> {cursorCoords.lat}° N, {cursorCoords.lon}° E
            </div>
          )}

          {/* Hazard Risk Legend Badge */}
          <div className="map-floating-legend">
            <div className="legend-title">
              <span>{activeHazardObj.emoji}</span> {activeHazardObj.label} Impact
            </div>
            <div className="legend-items">
              <div className="legend-row">
                <span className="legend-circle" style={{ background: activeColor }} />
                <span>Active Target ({Number(lat).toFixed(2)}°, {Number(lon).toFixed(2)}°)</span>
              </div>
              {data && (
                <div className="legend-row">
                  <span
                    className="legend-circle"
                    style={{ background: activeColor, opacity: 0.4, border: `1px dashed ${activeColor}` }}
                  />
                  <span>Hazard Buffer ({data.total_events} events)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
