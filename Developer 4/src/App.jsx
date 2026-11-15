// src/App.jsx
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  CircleMarker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import {
  fetchOpenApiSpec,
  getBackendDiagnostics,
  getFacilities,
  getFacilitiesBatch,
  getFacilityById,
  getGlobalStats,
  getEnvironmentalStats,
  getEnvironmentalFacilities,
  getFacilityEnvironmental,
  fetchAuxiliaryAggregations,
  buildGlobalMetadata,
  getApiBaseUrl,
} from './services/api';

const FALLBACK_PALETTE = [
  '#0284c7', '#eab308', '#06b6d4', '#2563eb', '#f97316', '#475569',
  '#16a34a', '#9333ea', '#dc2626', '#0d9488', '#d946ef', '#a16207',
];

function getCategoryVisuals(categoryName, index = 0) {
  const lower = String(categoryName || '').toLowerCase();
  if (lower.includes('solar')) return { color: '#eab308', icon: '☀️', label: categoryName };
  if (lower.includes('wind')) return { color: '#06b6d4', icon: '💨', label: categoryName };
  if (lower.includes('hydro')) return { color: '#2563eb', icon: '💧', label: categoryName };
  if (lower.includes('oil') || lower.includes('gas') || lower.includes('lng')) {
    return { color: '#f97316', icon: '🛢️', label: categoryName };
  }
  if (lower.includes('coal')) return { color: '#475569', icon: '🏭', label: categoryName };
  if (lower.includes('bio')) return { color: '#16a34a', icon: '🌱', label: categoryName };
  if (lower.includes('nuclear')) return { color: '#9333ea', icon: '☢️', label: categoryName };
  if (lower.includes('geothermal')) return { color: '#dc2626', icon: '🌋', label: categoryName };
  return { color: FALLBACK_PALETTE[index % FALLBACK_PALETTE.length], icon: '⚡', label: categoryName };
}

const CAPACITY_RANGES = [
  { id: 'under50', label: 'Under 50 MW', min: 0, max: 50 },
  { id: '50-250', label: '50–250 MW', min: 50, max: 250 },
  { id: '250-1000', label: '250–1,000 MW', min: 250, max: 1000 },
  { id: 'above1000', label: 'Above 1,000 MW', min: 1000, max: Infinity },
];

const BASEMAPS = {
  street: {
    label: 'Standard',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, METI, TomTom',
  },
  light: {
    label: 'Light GIS',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, USDA, USGS, AeroGRID, IGN',
  },
};

const redPinIcon = L.divIcon({
  className: '',
  html: '<div class="red-pin"><div class="red-pin-head"></div><div class="red-pin-stem"></div><div class="red-pin-shadow"></div></div>',
  iconSize: [28, 42],
  iconAnchor: [14, 42],
  popupAnchor: [0, -44],
});

const TYPE_LABEL = {
  city: '🏙️ City', town: '🏘️ Town', village: '🏡 Village', suburb: '🏘️ Suburb',
  neighbourhood: '📍 Area', county: '🗺️ County', state: '🗺️ State', country: '🌐 Country',
};

function placeLabel(r) {
  return TYPE_LABEL[r.type] || TYPE_LABEL[r.class] || `📌 ${r.type || r.class || 'Place'}`;
}

function parseCoords(raw) {
  const s = raw.trim();
  const dec = s.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (dec) {
    const lat = parseFloat(dec[1]);
    const lon = parseFloat(dec[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) return { lat, lon };
  }
  const dms = s.match(/(\d{1,3})[°d]\s*(\d{1,2})[′'m]\s*([\d.]+)[″"s]?\s*([NSns])[,\s]+(\d{1,3})[°d]\s*(\d{1,2})[′'m]\s*([\d.]+)[″"s]?\s*([EWew])/);
  if (dms) {
    const toDec = (d, m, sec) => Number(d) + Number(m) / 60 + Number(sec) / 3600;
    let lat = toDec(dms[1], dms[2], dms[3]);
    let lon = toDec(dms[5], dms[6], dms[7]);
    if (/[Ss]/.test(dms[4])) lat = -lat;
    if (/[Ww]/.test(dms[8])) lon = -lon;
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) return { lat, lon };
  }
  return null;
}

async function reverseLookup(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
      headers: { 'Accept-Language': 'en' },
    });
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

function smartFit(map, place) {
  const [s, n, w, e] = place.boundingbox.map(Number);
  if (n - s < 0.005 && e - w < 0.005) {
    map.flyTo([Number(place.lat), Number(place.lon)], 16, { duration: 1.4 });
  } else {
    map.flyToBounds([[s, w], [n, e]], { padding: [50, 50], duration: 1.4, maxZoom: 16 });
  }
}

const CLUSTER_SIZE_PX = 84;
const formatNumber = (value) => Number(value || 0).toLocaleString();

function formatMetricValue(val) {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(3).replace(/\.?0+$/, '');
  }
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
}

function humanizeKey(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SearchControl({ setPin, setSearchBoundary, facilities, categoryVisualMap, onSelectFacilityFromSearch }) {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [facilityMatches, setFacilityMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coordMode, setCoordMode] = useState(false);
  const debounceRef = useRef(null);
  const searchAbortRef = useRef(null);

  const search = async (value) => {
    if (searchAbortRef.current) searchAbortRef.current.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const coords = parseCoords(value);
    if (coords) {
      setCoordMode(true);
      setFacilityMatches([]);
      setResults([]);
      setLoading(true);
      const fullName = await reverseLookup(coords.lat, coords.lon);
      if (controller.signal.aborted) return;
      setLoading(false);
      setResults([{
        _isCoord: true,
        lat: String(coords.lat),
        lon: String(coords.lon),
        display_name: fullName,
        place_id: 'coord',
        boundingbox: [
          String(coords.lat - 0.002), String(coords.lat + 0.002),
          String(coords.lon - 0.002), String(coords.lon + 0.002),
        ],
      }]);
      return;
    }

    setCoordMode(false);
    const q = value.trim();
    if (!q || q.length < 2) {
      setResults([]);
      setFacilityMatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const lower = q.toLowerCase();
    const matchedById = new Map();

    for (const f of facilities) {
      if (f.name.toLowerCase().includes(lower) || f.id.toLowerCase().includes(lower) || f.country.toLowerCase().includes(lower)) {
        matchedById.set(f.id, f);
        if (matchedById.size >= 8) break;
      }
    }

    try {
      const remote = await getFacilities({ search: q, limit: 25 }, { signal: controller.signal, useCache: true });
      for (const rf of remote.facilities) {
        if (
          rf.name.toLowerCase().includes(lower) ||
          rf.id.toLowerCase().includes(lower) ||
          rf.country.toLowerCase().includes(lower) ||
          getBackendDiagnostics().hasSearch
        ) {
          matchedById.set(rf.id, rf);
          if (matchedById.size >= 8) break;
        }
      }
    } catch {
      // Keep local matches if backend search fails
    }

    if (/^L\d{6,}/i.test(q) && !matchedById.has(q)) {
      try {
        const exact = await getFacilityById(q, { signal: controller.signal });
        if (exact?.adapted) matchedById.set(exact.adapted.id, exact.adapted);
      } catch {
        // Ignore
      }
    }

    if (controller.signal.aborted) return;
    setFacilityMatches([...matchedById.values()].slice(0, 8));

    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1&polygon_geojson=1`,
        { headers: { 'Accept-Language': 'en' }, signal: controller.signal }
      );
      const data = await res.json();
      if (controller.signal.aborted) return;
      const minImportance = q.length <= 4 ? 0.35 : 0.2;
      setResults(data.filter((r) => Number(r.importance) >= minImportance).slice(0, 5));
    } catch {
      if (!controller.signal.aborted) setResults([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), parseCoords(val) ? 180 : 300);
  };

  const handleSelect = (place) => {
    smartFit(map, place);
    setPin({
      lat: Number(place.lat),
      lon: Number(place.lon),
      name: place.display_name.split(',')[0],
      full: place.display_name,
    });

    if (place.geojson && (place.geojson.type === 'Polygon' || place.geojson.type === 'MultiPolygon')) {
      setSearchBoundary(place.geojson);
    } else if (place.boundingbox) {
      const [s, n, w, e] = place.boundingbox.map(Number);
      setSearchBoundary({
        type: 'Polygon',
        coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
      });
    }
    setQuery(place.display_name.split(',')[0]);
    setResults([]);
    setFacilityMatches([]);
  };

  const handleSelectFacility = (f) => {
    map.flyTo([f.lat, f.lon], 14, { duration: 1.2 });
    onSelectFacilityFromSearch(f);
    setQuery(f.name);
    setResults([]);
    setFacilityMatches([]);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setFacilityMatches([]);
    setCoordMode(false);
    setPin(null);
    setSearchBoundary(null);
  };

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      if (searchAbortRef.current) searchAbortRef.current.abort();
    };
  }, []);

  return (
    <div className="search-box-wrapper">
      <div className={`search-input-row${coordMode ? ' coord-mode' : ''}`}>
        <span className="search-icon">{coordMode ? '🌐' : '🔍'}</span>
        <input
          className="search-input"
          type="text"
          placeholder="Search global facilities, GEM ID, place, or lat, lon…"
          value={query}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setResults([]);
              setFacilityMatches([]);
            }
          }}
        />
        {loading && <span className="search-spinner" />}
        {query && !loading && (
          <button type="button" className="search-clear" onClick={clearSearch} title="Clear">✕</button>
        )}
      </div>

      {(facilityMatches.length > 0 || results.length > 0) && (
        <ul className="search-results">
          {facilityMatches.length > 0 && (
            <>
              <div className="search-group-header">Global Facility Matches ({facilityMatches.length})</div>
              {facilityMatches.map((f) => {
                const vis = categoryVisualMap.get(f.facilityType) || getCategoryVisuals(f.facilityType);
                return (
                  <li key={f.id} onClick={() => handleSelectFacility(f)}>
                    <div className="result-top">
                      <strong>{f.name}</strong>
                      <span className="result-type-badge">{vis.icon} {f.facilityType}</span>
                    </div>
                    <span className="result-sub">{f.country} • {f.id} • {formatNumber(f.capacityMW)} MW</span>
                  </li>
                );
              })}
            </>
          )}

          {results.length > 0 && results[0]._isCoord && (
            <li className="coord-result" onClick={() => handleSelect(results[0])}>
              <div className="result-top">
                <strong>📍 {Number(results[0].lat).toFixed(5)}, {Number(results[0].lon).toFixed(5)}</strong>
                <span className="result-type-badge coord-badge">🌐 Coordinates</span>
              </div>
              <span className="result-sub">{results[0].display_name}</span>
            </li>
          )}

          {results.length > 0 && !results[0]._isCoord && (
            <>
              <div className="search-group-header">Geographic Locations</div>
              {results.map((r) => (
                <li key={r.place_id} onClick={() => handleSelect(r)}>
                  <div className="result-top">
                    <strong>{r.display_name.split(',')[0]}</strong>
                    <span className="result-type-badge">{placeLabel(r)}</span>
                  </div>
                  <span className="result-sub">{r.display_name.split(',').slice(1, 3).join(',')}</span>
                </li>
              ))}
            </>
          )}
        </ul>
      )}
    </div>
  );
}

function MapViewport({ onViewChange, sidebarOpen, selectedFacility, flyTarget, fitBoundsTarget }) {
  const map = useMapEvents({
    moveend: () => publish(),
    zoomend: () => publish(),
  });

  const publish = useCallback(() => {
    const b = map.getBounds();
    onViewChange({
      zoom: map.getZoom(),
      bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
    });
  }, [map, onViewChange]);

  useEffect(() => { publish(); }, [publish]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      map.invalidateSize();
      publish();
    }, 80);
    return () => window.clearTimeout(id);
  }, [map, publish, sidebarOpen, selectedFacility]);

  useEffect(() => {
    if (flyTarget) map.flyTo([flyTarget.lat, flyTarget.lon], flyTarget.zoom || 15, { duration: 1.1 });
  }, [map, flyTarget]);

  useEffect(() => {
    if (fitBoundsTarget && Array.isArray(fitBoundsTarget.bounds)) {
      map.flyToBounds(fitBoundsTarget.bounds, { padding: [45, 45], maxZoom: 12, duration: 1.2 });
    }
  }, [map, fitBoundsTarget]);

  return null;
}

function makeClusters(facilities, zoom, bounds) {
  const result = new Map();
  const [west, south, east, north] = bounds;
  const latPadding = Math.max(0.1, (north - south) * 0.12);
  const lonPadding = Math.max(0.1, (east - west) * 0.12);
  const z = Math.max(1, Math.round(zoom));

  for (const f of facilities) {
    const { lat, lon } = f;
    if (lat < south - latPadding || lat > north + latPadding) continue;
    if (lon < west - lonPadding || lon > east + lonPadding) continue;

    const point = L.CRS.EPSG3857.latLngToPoint(L.latLng(lat, lon), z);
    const gx = Math.floor(point.x / CLUSTER_SIZE_PX);
    const gy = Math.floor(point.y / CLUSTER_SIZE_PX);
    const key = `${gx}:${gy}`;
    let cluster = result.get(key);
    if (!cluster) {
      cluster = { key, count: 0, x: 0, y: 0, typeCounts: {}, capacity: 0, lone: null };
      result.set(key, cluster);
    }
    cluster.count++;
    cluster.x += point.x;
    cluster.y += point.y;
    cluster.typeCounts[f.facilityType] = (cluster.typeCounts[f.facilityType] || 0) + 1;
    cluster.capacity += Number(f.capacityMW) || 0;
    cluster.lone = cluster.count === 1 ? f : null;
  }

  return [...result.values()].map((cluster) => {
    const latLng = L.CRS.EPSG3857.pointToLatLng(L.point(cluster.x / cluster.count, cluster.y / cluster.count), z);
    return { ...cluster, lat: latLng.lat, lon: latLng.lng };
  });
}

function ClusterMarker({ cluster, mapZoom, categoryVisualMap, onSelectFacility }) {
  const map = useMap();
  const { count, typeCounts } = cluster;

  if (count === 1 && cluster.lone) {
    const f = cluster.lone;
    const vis = categoryVisualMap.get(f.facilityType) || getCategoryVisuals(f.facilityType);
    return (
      <CircleMarker
        center={[f.lat, f.lon]}
        radius={f.capacityMW >= 1000 ? 7 : f.capacityMW >= 250 ? 6 : 5}
        pathOptions={{ color: '#ffffff', weight: 1.2, fillColor: vis.color, fillOpacity: 0.94 }}
        eventHandlers={{ click: () => onSelectFacility(f) }}
      >
        <Popup className="facility-popup">
          <div className="fac-name">{f.name}</div>
          <div className="fac-row">
            <span className="fac-badge" style={{ backgroundColor: vis.color }}>{vis.icon} {f.facilityType}</span>
          </div>
          <div className="fac-meta"><b>Country:</b> {f.country}</div>
          <div className="fac-meta"><b>Status:</b> {f.statuses.join(', ')}</div>
          {f.capacityMW > 0 && <div className="fac-meta"><b>Listed capacity:</b> {formatNumber(f.capacityMW)} MW</div>}
          {f.unitCount > 0 && <div className="fac-meta"><b>Units:</b> {f.unitCount} ({f.operatingUnits} operating)</div>}
          {f.coordinateAccuracy && <div className="fac-meta"><b>Accuracy:</b> {f.coordinateAccuracy}</div>}
          <div className="fac-meta"><b>Facility ID:</b> {f.id}</div>
          <div className="fac-coords">{f.lat.toFixed(4)}, {f.lon.toFixed(4)}</div>
          <button type="button" className="popup-inspect-btn" onClick={() => onSelectFacility(f)}>
            Inspect Facility &amp; Environmental Telemetry →
          </button>
        </Popup>
      </CircleMarker>
    );
  }

  const entries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const dominantType = entries[0]?.[0];
  const dominantVis = categoryVisualMap.get(dominantType) || getCategoryVisuals(dominantType || '');
  const icon = L.divIcon({
    className: 'facility-cluster-icon',
    html: `<span class="cluster-bubble" style="--cluster-color:${dominantVis.color}">${formatNumber(count)}</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  return (
    <Marker
      position={[cluster.lat, cluster.lon]}
      icon={icon}
      eventHandlers={{
        click: () => {
          if (mapZoom < 13) map.flyTo([cluster.lat, cluster.lon], Math.min(mapZoom + 2, 13), { duration: 0.5 });
        },
      }}
    >
      <Popup className="facility-popup" autoPan={true}>
        <div className="fac-name">{formatNumber(count)} facilities in this cluster</div>
        <div className="cluster-breakdown">
          {entries.map(([typeName, typeCount]) => {
            const vis = categoryVisualMap.get(typeName) || getCategoryVisuals(typeName);
            return (
              <div className="cluster-breakdown-row" key={typeName}>
                <span><span className="cluster-key-dot" style={{ backgroundColor: vis.color }} />{typeName}</span>
                <b>{formatNumber(typeCount)}</b>
              </div>
            );
          })}
        </div>
        <p className="cluster-popup-hint">Zoom in to separate and inspect individual facilities.</p>
      </Popup>
    </Marker>
  );
}

function FacilityMarkers({ clusters, zoom, categoryVisualMap, onSelectFacility }) {
  return (
    <>
      {clusters.map((c) => (
        <ClusterMarker
          key={c.key}
          cluster={c}
          mapZoom={zoom}
          categoryVisualMap={categoryVisualMap}
          onSelectFacility={onSelectFacility}
        />
      ))}
    </>
  );
}

function EnvironmentalTelemetryView({ envData, loading, error }) {
  if (loading) {
    return (
      <div className="env-card">
        <div className="env-card-header"><span className="env-card-title">🛰️ Fetching Environmental Telemetry…</span></div>
        <p className="env-scientific-note">Querying <code>GET /environmental/facilities/&#123;facility_id&#125;</code> for GPM rainfall and SMAP soil-moisture observations.</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="env-card">
        <div className="env-card-header">
          <span className="env-card-title">⚠️ Environmental Endpoint Notice</span>
          <span className="env-readiness-badge">{error}</span>
        </div>
        <p className="env-scientific-note">Could not retrieve facility environmental record from <code>GET /environmental/facilities/&#123;facility_id&#125;</code>.</p>
      </div>
    );
  }
  if (!envData || typeof envData !== 'object') return null;

  const ignoredKeys = new Set([
    'GEM_Location_ID', 'gem_location_id', 'facility_id', 'id', 'Facility_Name',
    'facility_name', 'name', 'Country', 'country', 'Facility_Type', 'facility_type',
    'Latitude', 'latitude', 'lat', 'Longitude', 'longitude', 'lon',
  ]);

  const scalarEntries = [];
  const objectSections = [];
  const arraySeries = [];

  Object.entries(envData).forEach(([key, value]) => {
    if (ignoredKeys.has(key) || value === null || value === undefined) return;
    if (Array.isArray(value)) arraySeries.push([key, value]);
    else if (typeof value === 'object') objectSections.push([key, value]);
    else scalarEntries.push([key, value]);
  });

  return (
    <>
      {scalarEntries.length > 0 && (
        <div className="env-card">
          <div className="env-card-header">
            <span className="env-card-title">🛰️ Global &amp; Site Observations</span>
            <span className="env-readiness-badge env-readiness-badge--live">Live Backend</span>
          </div>
          <div className="bento-grid">
            {scalarEntries.map(([k, v]) => (
              <div className="bento-card" key={k}>
                <div className="bento-label">{humanizeKey(k)}</div>
                <div className="bento-value">{formatMetricValue(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {objectSections.map(([sectionKey, sectionObj]) => {
        const subScalars = Object.entries(sectionObj).filter(([, val]) => val !== null && val !== undefined && typeof val !== 'object');
        const subArrays = Object.entries(sectionObj).filter(([, val]) => Array.isArray(val));
        return (
          <div className="env-card" key={sectionKey}>
            <div className="env-card-header">
              <span className="env-card-title">{humanizeKey(sectionKey)}</span>
              <span className="env-readiness-badge env-readiness-badge--live">Verified</span>
            </div>
            {subScalars.length > 0 && (
              <div className="bento-grid">
                {subScalars.slice(0, 24).map(([sk, sv]) => (
                  <div className="bento-card" key={sk}>
                    <div className="bento-label">{humanizeKey(sk)}</div>
                    <div className="bento-value">{formatMetricValue(sv)}</div>
                  </div>
                ))}
              </div>
            )}
            {subArrays.map(([arrKey, arrVal]) => (
              <div key={arrKey} className="env-series-box">
                <div className="bento-label">{humanizeKey(arrKey)} ({arrVal.length} observations)</div>
                <div className="env-series-list">
                  {arrVal.slice(0, 8).map((item, idx) => (
                    <span className="env-spec-tag" key={idx}>
                      {typeof item === 'object' ? JSON.stringify(item) : formatMetricValue(item)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {arraySeries.map(([seriesKey, seriesArr]) => (
        <div className="env-card" key={seriesKey}>
          <div className="env-card-header">
            <span className="env-card-title">📈 {humanizeKey(seriesKey)}</span>
            <span className="env-readiness-badge env-readiness-badge--live">{seriesArr.length} records</span>
          </div>
          <div className="env-series-list">
            {seriesArr.slice(0, 10).map((item, idx) => (
              <div className="env-series-row" key={idx}>
                {typeof item === 'object' && item !== null ? (
                  Object.entries(item).map(([ik, iv]) => (
                    <span key={ik} className="env-spec-tag"><b>{humanizeKey(ik)}:</b> {formatMetricValue(iv)}</span>
                  ))
                ) : (
                  <span className="env-spec-tag">{formatMetricValue(item)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export default function App() {
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [pin, setPin] = useState(null);
  const [searchBoundary, setSearchBoundary] = useState(null);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('filters');
  const [legendExpanded, setLegendExpanded] = useState(true);
  const [basemap, setBasemap] = useState('street');
  const [datasetSourceMode, setDatasetSourceMode] = useState('all');

  const [facilitiesById, setFacilitiesById] = useState(() => new Map());
  const [envFacilities, setEnvFacilities] = useState([]);
  const [globalStats, setGlobalStats] = useState(null);
  const [envStats, setEnvStats] = useState(null);
  const [facilitiesMeta, setFacilitiesMeta] = useState(null);
  const [auxAggregations, setAuxAggregations] = useState({ countriesPayload: null, categoriesPayload: null });
  const [openApiInfo, setOpenApiInfo] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingViewport, setLoadingViewport] = useState(false);
  const [dataError, setDataError] = useState('');

  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState(new Set());
  const [selectedCapacities, setSelectedCapacities] = useState(new Set(CAPACITY_RANGES.map((c) => c.id)));
  const [selectedCountries, setSelectedCountries] = useState(new Set());
  const [countrySearch, setCountrySearch] = useState('');
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  const [selectedFacility, setSelectedFacility] = useState(null);
  const [facilityDetail, setFacilityDetail] = useState(null);
  const [facilityEnvData, setFacilityEnvData] = useState(null);
  const [loadingInspector, setLoadingInspector] = useState(false);
  const [inspectorEnvError, setInspectorEnvError] = useState('');

  const [flyTarget, setFlyTarget] = useState(null);
  const [fitBoundsTarget, setFitBoundsTarget] = useState(null);
  const [copiedCoords, setCopiedCoords] = useState(false);

  const [openSections, setOpenSections] = useState({ country: true, types: true, status: false, capacity: false });
  const [view, setView] = useState({ zoom: 3, bounds: [-180, -60, 180, 75] });
  const monitorRef = useRef(null);
  const exploreRef = useRef(null);
  const viewportDebounceRef = useRef(null);
  const viewportAbortRef = useRef(null);

  const mergeFacilitiesIntoStore = useCallback((newRecords, replace = false) => {
    setFacilitiesById((prev) => {
      const next = replace ? new Map() : new Map(prev);
      for (const item of newRecords) {
        if (item && item.id) next.set(item.id, item);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let live = true;

    async function bootstrapGlobalInventory() {
      setLoadingData(true);
      setDataError('');
      try {
        const spec = await fetchOpenApiSpec(controller.signal);
        if (live && spec) {
          setOpenApiInfo({ title: spec.info?.title || 'TerraTrace FastAPI', version: spec.info?.version || '1.0' });
        }

        const [globalStatsRes, envStatsRes, auxRes, facBatchRes, envFacRes] = await Promise.allSettled([
          getGlobalStats({ signal: controller.signal }),
          getEnvironmentalStats({ signal: controller.signal }),
          fetchAuxiliaryAggregations(controller.signal),
          getFacilitiesBatch({}, { maxPages: 4, signal: controller.signal }),
          getEnvironmentalFacilities({}, { signal: controller.signal }),
        ]);

        if (!live) return;

        const resolvedGlobalStats = globalStatsRes.status === 'fulfilled' ? globalStatsRes.value : null;
        const resolvedEnvStats = envStatsRes.status === 'fulfilled' ? envStatsRes.value : null;
        const resolvedAux = auxRes.status === 'fulfilled' ? auxRes.value : { countriesPayload: null, categoriesPayload: null };

        if (facBatchRes.status !== 'fulfilled') {
          throw facBatchRes.reason || new Error('Failed to load GET /facilities');
        }

        const initialFacilities = facBatchRes.value.facilities;
        const initialMeta = facBatchRes.value.meta;
        const resolvedEnvFacilities = envFacRes.status === 'fulfilled' ? envFacRes.value.facilities : [];

        mergeFacilitiesIntoStore(initialFacilities, true);
        setFacilitiesMeta(initialMeta);
        setGlobalStats(resolvedGlobalStats);
        setEnvStats(resolvedEnvStats);
        setAuxAggregations(resolvedAux);
        setEnvFacilities(resolvedEnvFacilities);

        const globalMeta = buildGlobalMetadata({
          globalStats: resolvedGlobalStats,
          envStats: resolvedEnvStats,
          facilitiesMeta: initialMeta,
          auxCountries: resolvedAux.countriesPayload,
          auxCategories: resolvedAux.categoriesPayload,
          loadedFacilities: initialFacilities,
        });

        setSelectedCategories(new Set(globalMeta.categoryCounts.keys()));
        setSelectedStatuses(new Set(globalMeta.statusCounts.keys()));
        setSelectedCountries(new Set(globalMeta.countryCounts.keys()));
        setFiltersInitialized(true);
      } catch (err) {
        if (live && err.name !== 'AbortError') {
          setDataError(err.message || 'Could not connect to FastAPI backend at http://127.0.0.1:8000');
        }
      } finally {
        if (live) setLoadingData(false);
      }
    }

    bootstrapGlobalInventory();
    return () => {
      live = false;
      controller.abort();
    };
  }, [mergeFacilitiesIntoStore]);

  const loadedFacilitiesArray = useMemo(() => [...facilitiesById.values()], [facilitiesById]);
  const activeDataset = datasetSourceMode === 'environmental' && envFacilities.length > 0 ? envFacilities : loadedFacilitiesArray;

  const backendMeta = useMemo(
    () =>
      buildGlobalMetadata({
        globalStats,
        envStats,
        facilitiesMeta,
        auxCountries: auxAggregations.countriesPayload,
        auxCategories: auxAggregations.categoriesPayload,
        loadedFacilities: activeDataset,
      }),
    [globalStats, envStats, facilitiesMeta, auxAggregations, activeDataset]
  );

  const allCountriesList = useMemo(
    () => [...backendMeta.countryCounts.keys()].sort((a, b) => a.localeCompare(b)),
    [backendMeta.countryCounts]
  );

  const dynamicCategories = useMemo(
    () =>
      [...backendMeta.categoryCounts.entries()]
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))
        .map(([name, count], idx) => ({ name, count, ...getCategoryVisuals(name, idx) })),
    [backendMeta.categoryCounts]
  );

  const categoryVisualMap = useMemo(() => {
    const map = new Map();
    dynamicCategories.forEach((cat) => map.set(cat.name, cat));
    return map;
  }, [dynamicCategories]);

  const dynamicStatuses = useMemo(
    () => [...backendMeta.statusCounts.entries()].sort((a, b) => (b[1] || 0) - (a[1] || 0)),
    [backendMeta.statusCounts]
  );

  const topCountriesChips = useMemo(
    () =>
      [...backendMeta.countryCounts.entries()]
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))
        .slice(0, 6)
        .map(([country]) => country),
    [backendMeta.countryCounts]
  );

  useEffect(() => {
    if (!filtersInitialized || datasetSourceMode === 'environmental') return;
    clearTimeout(viewportDebounceRef.current);
    viewportDebounceRef.current = setTimeout(() => {
      if (viewportAbortRef.current) viewportAbortRef.current.abort();
      const controller = new AbortController();
      viewportAbortRef.current = controller;

      const diag = getBackendDiagnostics();
      const singleCountry =
        selectedCountries.size === 1 && selectedCountries.size < allCountriesList.length
          ? [...selectedCountries][0]
          : undefined;
      const singleCategory =
        selectedCategories.size === 1 && selectedCategories.size < dynamicCategories.length
          ? [...selectedCategories][0]
          : undefined;

      if (!diag.hasBbox && !singleCountry && !singleCategory) return;

      setLoadingViewport(true);
      getFacilitiesBatch(
        {
          country: singleCountry,
          facilityType: singleCategory,
          bounds: diag.hasBbox ? view.bounds : undefined,
        },
        { maxPages: singleCountry ? 4 : 2, signal: controller.signal }
      )
        .then((res) => {
          if (!controller.signal.aborted && res.facilities.length > 0) {
            mergeFacilitiesIntoStore(res.facilities, false);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) setLoadingViewport(false);
        });
    }, 280);

    return () => clearTimeout(viewportDebounceRef.current);
  }, [
    filtersInitialized,
    datasetSourceMode,
    view.bounds,
    view.zoom,
    selectedCountries,
    selectedCategories,
    allCountriesList.length,
    dynamicCategories.length,
    mergeFacilitiesIntoStore,
  ]);

  const handleSelectSingleCountry = useCallback(
    async (countryName) => {
      setSelectedCountries(new Set([countryName]));
      setLoadingViewport(true);
      try {
        const res = await getFacilitiesBatch({ country: countryName }, { maxPages: 4 });
        if (res.facilities.length > 0) {
          mergeFacilitiesIntoStore(res.facilities, false);
          const countryMatches = res.facilities.filter((f) => f.country === countryName);
          const targetList = countryMatches.length > 0 ? countryMatches : res.facilities;
          let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
          for (const f of targetList) {
            if (f.lat < minLat) minLat = f.lat;
            if (f.lat > maxLat) maxLat = f.lat;
            if (f.lon < minLon) minLon = f.lon;
            if (f.lon > maxLon) maxLon = f.lon;
          }
          if (minLat <= maxLat && minLon <= maxLon) {
            setFitBoundsTarget({ bounds: [[minLat, minLon], [maxLat, maxLon]], ts: Date.now() });
          }
        }
      } catch {
        // Ignore
      } finally {
        setLoadingViewport(false);
      }
    },
    [mergeFacilitiesIntoStore]
  );

  const handleSelectFacility = useCallback((facility) => {
    if (!facility) {
      setSelectedFacility(null);
      setFacilityDetail(null);
      setFacilityEnvData(null);
      return;
    }
    setSelectedFacility(facility);
    setFacilityDetail(null);
    setFacilityEnvData(null);
    setInspectorEnvError('');
    setLoadingInspector(true);

    Promise.allSettled([getFacilityById(facility.id), getFacilityEnvironmental(facility.id)]).then(
      ([detailRes, envRes]) => {
        if (detailRes.status === 'fulfilled' && detailRes.value) {
          setFacilityDetail(detailRes.value.raw);
          if (detailRes.value.adapted) {
            setSelectedFacility((prev) =>
              prev && prev.id === facility.id ? { ...prev, ...detailRes.value.adapted, raw: detailRes.value.raw } : prev
            );
          }
        }
        if (envRes.status === 'fulfilled') setFacilityEnvData(envRes.value);
        else setInspectorEnvError(envRes.reason?.message || 'Unavailable');
        setLoadingInspector(false);
      }
    );
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (monitorRef.current && !monitorRef.current.contains(event.target)) setMonitorOpen(false);
      if (exploreRef.current && !exploreRef.current.contains(event.target)) setExploreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredFacilities = useMemo(() => {
    return activeDataset.filter((f) => {
      if (selectedCountries.size < allCountriesList.length && !selectedCountries.has(f.country)) return false;
      if (selectedCategories.size < dynamicCategories.length && !selectedCategories.has(f.facilityType)) return false;
      if (selectedStatuses.size < dynamicStatuses.length && !f.statuses.some((st) => selectedStatuses.has(st))) return false;
      const cap = Number(f.capacityMW);
      return !Number.isFinite(cap) || CAPACITY_RANGES.some((cr) => selectedCapacities.has(cr.id) && cap >= cr.min && cap < cr.max);
    });
  }, [
    activeDataset,
    selectedCountries,
    allCountriesList.length,
    selectedCategories,
    dynamicCategories.length,
    selectedStatuses,
    dynamicStatuses.length,
    selectedCapacities,
  ]);

  const clusters = useMemo(() => makeClusters(filteredFacilities, view.zoom, view.bounds), [filteredFacilities, view]);

  const filteredCountriesList = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    return allCountriesList.filter((c) => c.toLowerCase().includes(q));
  }, [allCountriesList, countrySearch]);

  const toggleInSet = (setter, key) =>
    setter((old) => {
      const next = new Set(old);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleSection = (key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSelectFacilityFromSearch = (f) => {
    mergeFacilitiesIntoStore([f], false);
    if (f.country && !selectedCountries.has(f.country)) setSelectedCountries((old) => new Set([...old, f.country]));
    if (f.facilityType && !selectedCategories.has(f.facilityType)) setSelectedCategories((old) => new Set([...old, f.facilityType]));
    if (f.statuses?.length && !f.statuses.some((s) => selectedStatuses.has(s))) {
      setSelectedStatuses((old) => new Set([...old, ...f.statuses]));
    }
    handleSelectFacility(f);
  };

  const handleCopyCoords = (lat, lon) => {
    navigator.clipboard?.writeText(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 1800);
  };

  const maxGlobalCategoryCount = Math.max(1, ...dynamicCategories.map((c) => c.count || 0));
  const diag = getBackendDiagnostics();

  return (
    <div className="app-container">
      <header className="top-bar">
        <div className="top-bar-left-group">
          <button
            type="button"
            className={`sidebar-toggle-btn${sidebarOpen ? ' sidebar-toggle-btn--active' : ''}`}
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Hide Filters Sidebar' : 'Show Filters Sidebar'}
          >
            <span>☰</span><span>Filters</span>
          </button>
          <div className="brand-lockup">
            <h2 className="top-bar-title"><span className="brand-dot" />TerraTrace</h2>
            <span className="top-bar-subtitle">Global Power Infrastructure &amp; Satellite Environmental Intelligence</span>
          </div>
        </div>

        <nav className="top-nav" aria-label="Main navigation">
          <div
            className="nav-status-pill"
            title={`Global Inventory: ${formatNumber(backendMeta.totalFacilities)} facilities across ${formatNumber(backendMeta.totalCountries)} countries`}
          >
            <span
              className="nav-status-dot"
              style={{ backgroundColor: dataError ? '#dc2626' : loadingViewport ? '#eab308' : '#16a34a' }}
            />
            <span>
              Inventory: {formatNumber(backendMeta.totalFacilities)} sites • {formatNumber(backendMeta.totalCountries)} countries ({formatNumber(filteredFacilities.length)} in view)
            </span>
          </div>

          <div className="nav-item" ref={monitorRef}>
            <button
              type="button"
              className={`nav-btn${monitorOpen || datasetSourceMode === 'environmental' ? ' nav-btn--active' : ''}`}
              onClick={() => { setMonitorOpen((v) => !v); setExploreOpen(false); }}
            >
              📡 Environmental Feeds <span className="nav-caret">▾</span>
            </button>
            {monitorOpen && (
              <div className="nav-dropdown">
                <div className="dropdown-header-box">
                  <div className="dropdown-section-label">FastAPI Global &amp; Environmental Endpoints</div>
                  <div className="dropdown-section-note">Switch map feed or inspect global GPM &amp; SMAP statistics</div>
                </div>
                <button
                  type="button"
                  className={`dropdown-item${datasetSourceMode === 'all' ? ' dropdown-item--active' : ''}`}
                  onClick={() => { setDatasetSourceMode('all'); setMonitorOpen(false); }}
                >
                  <span className="di-icon">🌐</span>
                  <span className="di-title">Global Facilities (GET /facilities)</span>
                  <span className="di-soon">{formatNumber(backendMeta.totalFacilities)}</span>
                </button>
                <button
                  type="button"
                  className={`dropdown-item${datasetSourceMode === 'environmental' ? ' dropdown-item--active' : ''}`}
                  onClick={() => {
                    if (envFacilities.length > 0) setDatasetSourceMode('environmental');
                    setSidebarTab('envStats');
                    setSidebarOpen(true);
                    setMonitorOpen(false);
                  }}
                >
                  <span className="di-icon">🌧️</span>
                  <span className="di-title">Environmental Facilities (GET /environmental/facilities)</span>
                  <span className="di-soon">{envFacilities.length > 0 ? formatNumber(envFacilities.length) : 'Stats View'}</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setSidebarTab('envStats'); setSidebarOpen(true); setMonitorOpen(false); }}
                >
                  <span className="di-icon">📊</span>
                  <span className="di-title">Global &amp; Environmental Stats (/global-stats &amp; /environmental/stats)</span>
                  <span className="di-soon">Inspect</span>
                </button>
              </div>
            )}
          </div>

          <div className="nav-item" ref={exploreRef}>
            <button
              type="button"
              className={`nav-btn${exploreOpen ? ' nav-btn--active' : ''}`}
              onClick={() => { setExploreOpen((v) => !v); setMonitorOpen(false); }}
            >
              🔌 API Status <span className="nav-caret">▾</span>
            </button>
            {exploreOpen && (
              <div className="nav-dropdown explore-dropdown">
                <div className="dropdown-header-box">
                  <div className="dropdown-section-label">Connected FastAPI Contract ({openApiInfo?.title || 'Backend'})</div>
                  <div className="dropdown-section-note">{getApiBaseUrl()} • Max Page Limit: {diag.maxLimit}</div>
                </div>
                {[
                  [globalStats ? '✅' : '⚠️', 'GET /global-stats', globalStats ? `${formatNumber(backendMeta.totalFacilities)} total` : 'Not exposed'],
                  ['✅', 'GET /facilities', `${formatNumber(activeDataset.length)} cached / ${formatNumber(backendMeta.totalFacilities)}`],
                  ['✅', 'GET /facilities/{facility_id}', 'On-click detail'],
                  [envStats ? '✅' : '⏳', 'GET /environmental/stats', envStats ? 'Active' : 'Pending'],
                  ['✅', 'GET /environmental/facilities/{id}', 'On-click telemetry'],
                ].map(([icon, endpoint, statusText]) => (
                  <div key={endpoint} className="dropdown-item">
                    <span className="di-icon">{icon}</span>
                    <span className="di-title" style={{ fontFamily: 'var(--tt-font-mono)', fontSize: '0.75rem' }}>{endpoint}</span>
                    <span className="di-soon">{statusText}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="nav-btn nav-btn--ghost" onClick={() => setWelcomeOpen(true)}>
            Overview
          </button>
        </nav>
      </header>

      <div className="body-layout">
        {sidebarOpen && (
          <aside className="left-sidebar">
            <div className="sidebar-header">
              <div className="sidebar-header-top">
                <span className="sidebar-title">Global Facility Inventory</span>
                <span className="facility-badge-count">{formatNumber(backendMeta.totalFacilities)} global</span>
              </div>

              {/* Global Inventory KPI */}
              <div className="global-kpi-strip" aria-label="Global Inventory KPI">
                <div className="global-kpi-item">
                  <span className="global-kpi-label">Total Inventory</span>
                  <strong className="global-kpi-val">{formatNumber(backendMeta.totalFacilities)}</strong>
                </div>
                <div className="global-kpi-item">
                  <span className="global-kpi-label">Countries</span>
                  <strong className="global-kpi-val">{formatNumber(backendMeta.totalCountries)}</strong>
                </div>
                <div className="global-kpi-item">
                  <span className="global-kpi-label">Map Store</span>
                  <strong className="global-kpi-val">{formatNumber(filteredFacilities.length)}</strong>
                </div>
              </div>

              <div className="sidebar-segmented" role="tablist" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sidebarTab === 'filters'}
                  className={`seg-btn${sidebarTab === 'filters' ? ' seg-btn--active' : ''}`}
                  onClick={() => setSidebarTab('filters')}
                >
                  Filters
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sidebarTab === 'summary'}
                  className={`seg-btn${sidebarTab === 'summary' ? ' seg-btn--active' : ''}`}
                  onClick={() => setSidebarTab('summary')}
                >
                  Categories ({dynamicCategories.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sidebarTab === 'envStats'}
                  className={`seg-btn${sidebarTab === 'envStats' ? ' seg-btn--active' : ''}`}
                  onClick={() => setSidebarTab('envStats')}
                >
                  Global Stats
                </button>
              </div>
            </div>

            <div className="sidebar-scrollable">
              {sidebarTab === 'filters' && (
                <>
                  <section className="filter-section">
                    <div className="filter-section-header" onClick={() => toggleSection('country')}>
                      <div className="filter-header-text">
                        <h3 className="section-title">
                          Country / Territory
                          <span className="section-pill-summary">
                            {allCountriesList.length} listed / {backendMeta.totalCountries} total
                          </span>
                        </h3>
                        <p className="section-subtitle">Select a country to fetch &amp; focus its facilities</p>
                      </div>
                      <span className={`section-chevron${openSections.country ? ' section-chevron--open' : ''}`}>▾</span>
                    </div>
                    {openSections.country && (
                      <div className="filter-section-body">
                        {!backendMeta.hasFullCountryAggregation && allCountriesList.length < backendMeta.totalCountries && (
                          <div className="backend-schema-notice">
                            <strong>Backend Country Aggregation Missing:</strong> FastAPI <code>GET /global-stats</code> returned <code>country_count: {backendMeta.totalCountries}</code>, but did not include the <code>countries</code> count dictionary (currently showing <b>{allCountriesList.length}</b> countries from loaded pages). Add <code>&quot;countries&quot;: df[&quot;Country&quot;].value_counts().to_dict()</code> to <code>GET /global-stats</code> in FastAPI to populate all {backendMeta.totalCountries} countries.
                          </div>
                        )}

                        {topCountriesChips.length > 0 && (
                          <div className="country-quick-chips">
                            {topCountriesChips.map((c) => (
                              <button
                                key={c}
                                type="button"
                                className={`country-chip${selectedCountries.size === 1 && selectedCountries.has(c) ? ' country-chip--active' : ''}`}
                                onClick={() => handleSelectSingleCountry(c)}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="country-search-box">
                          <input
                            className="country-search-input"
                            placeholder="Search any country (e.g. India, Brazil, Germany)..."
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && countrySearch.trim()) handleSelectSingleCountry(countrySearch.trim());
                            }}
                          />
                          {countrySearch && (
                            <button type="button" className="search-clear-mini" onClick={() => setCountrySearch('')}>✕</button>
                          )}
                        </div>

                        {countrySearch.trim().length >= 2 &&
                          !allCountriesList.some((c) => c.toLowerCase() === countrySearch.trim().toLowerCase()) && (
                            <button
                              type="button"
                              className="action-btn"
                              style={{ width: '100%', marginBottom: 8 }}
                              onClick={() => handleSelectSingleCountry(countrySearch.trim())}
                            >
                              🔍 Query Backend for &ldquo;{countrySearch.trim()}&rdquo; →
                            </button>
                          )}

                        <div className="btn-actions-row">
                          <button type="button" className="action-btn" onClick={() => setSelectedCountries(new Set(allCountriesList))}>
                            All countries ({allCountriesList.length})
                          </button>
                          <button type="button" className="action-btn" onClick={() => setSelectedCountries(new Set())}>
                            Clear all
                          </button>
                        </div>

                        <div className="selected-counter-text">
                          {selectedCountries.size} of {allCountriesList.length} listed countries active ({backendMeta.totalCountries} in global inventory)
                        </div>

                        <div className="countries-scroll-list">
                          {filteredCountriesList.map((c) => {
                            const globalCount = backendMeta.countryCounts.get(c);
                            return (
                              <label key={c} className="checkbox-row">
                                <span className="cb-left">
                                  <input
                                    type="checkbox"
                                    checked={selectedCountries.has(c)}
                                    onChange={() => toggleInSet(setSelectedCountries, c)}
                                  />
                                  <span className="cb-label" onDoubleClick={() => handleSelectSingleCountry(c)}>
                                    {c}
                                  </span>
                                </span>
                                <span className="cb-count">
                                  {globalCount !== null && globalCount !== undefined ? formatNumber(globalCount) : '—'}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="filter-section">
                    <div className="filter-section-header" onClick={() => toggleSection('types')}>
                      <div className="filter-header-text">
                        <h3 className="section-title">
                          Facility Category
                          <span className="section-pill-summary">{selectedCategories.size}/{dynamicCategories.length}</span>
                        </h3>
                        <p className="section-subtitle">Global category counts across complete inventory</p>
                      </div>
                      <span className={`section-chevron${openSections.types ? ' section-chevron--open' : ''}`}>▾</span>
                    </div>
                    {openSections.types && (
                      <div className="filter-section-body">
                        <div className="btn-actions-row">
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => setSelectedCategories(new Set(dynamicCategories.map((c) => c.name)))}
                          >
                            Select all
                          </button>
                          <button type="button" className="action-btn" onClick={() => setSelectedCategories(new Set())}>
                            Clear all
                          </button>
                        </div>
                        <div className="filter-list">
                          {dynamicCategories.map((cat) => (
                            <label key={cat.name} className="checkbox-row">
                              <span className="cb-left">
                                <input
                                  type="checkbox"
                                  checked={selectedCategories.has(cat.name)}
                                  onChange={() => toggleInSet(setSelectedCategories, cat.name)}
                                />
                                <span className="cb-color-dot" style={{ backgroundColor: cat.color }} />
                                <span className="cb-label">{cat.name}</span>
                              </span>
                              <span className="cb-count">{formatNumber(cat.count)}</span>
                            </label>
                          ))}
                        </div>
                        <p className="filter-footnote">
                          Counts represent the complete global inventory ({formatNumber(backendMeta.totalFacilities)} facilities), not just the current map viewport.
                        </p>
                      </div>
                    )}
                  </section>

                  <section className="filter-section">
                    <div className="filter-section-header" onClick={() => toggleSection('status')}>
                      <div className="filter-header-text">
                        <h3 className="section-title">
                          Unit Status
                          <span className="section-pill-summary">{selectedStatuses.size}/{dynamicStatuses.length}</span>
                        </h3>
                        <p className="section-subtitle">Filter by operating, construction, or pre-construction units</p>
                      </div>
                      <span className={`section-chevron${openSections.status ? ' section-chevron--open' : ''}`}>▾</span>
                    </div>
                    {openSections.status && (
                      <div className="filter-section-body">
                        <div className="filter-list">
                          {dynamicStatuses.map(([statusName, count]) => (
                            <label key={statusName} className="checkbox-row">
                              <span className="cb-left">
                                <input
                                  type="checkbox"
                                  checked={selectedStatuses.has(statusName)}
                                  onChange={() => toggleInSet(setSelectedStatuses, statusName)}
                                />
                                <span className="cb-label">{statusName}</span>
                              </span>
                              <span className="cb-count">{formatNumber(count)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="filter-section">
                    <div className="filter-section-header" onClick={() => toggleSection('capacity')}>
                      <div className="filter-header-text">
                        <h3 className="section-title">
                          Listed Capacity (MW)
                          <span className="section-pill-summary">{selectedCapacities.size}/{CAPACITY_RANGES.length}</span>
                        </h3>
                        <p className="section-subtitle">Filter by generation capacity</p>
                      </div>
                      <span className={`section-chevron${openSections.capacity ? ' section-chevron--open' : ''}`}>▾</span>
                    </div>
                    {openSections.capacity && (
                      <div className="filter-section-body">
                        <div className="filter-list">
                          {CAPACITY_RANGES.map((c) => (
                            <label key={c.id} className="checkbox-row">
                              <span className="cb-left">
                                <input
                                  type="checkbox"
                                  checked={selectedCapacities.has(c.id)}
                                  onChange={() => toggleInSet(setSelectedCapacities, c.id)}
                                />
                                <span className="cb-label">{c.label}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}

              {sidebarTab === 'summary' && (
                <section className="filter-section">
                  <div className="filter-section-body">
                    <h3 className="section-title" style={{ marginBottom: 4 }}>Global Inventory by Category</h3>
                    <p className="section-subtitle" style={{ marginBottom: 12 }}>
                      Complete dataset category distribution ({formatNumber(backendMeta.totalFacilities)} total facilities) vs. currently loaded map store.
                    </p>
                    <div className="filter-list">
                      {dynamicCategories.map((cat) => {
                        const globalCount = cat.count || 0;
                        const loadedCount = backendMeta.loadedCategoryCounts.get(cat.name) || 0;
                        const pct = Math.round((globalCount / maxGlobalCategoryCount) * 100);
                        return (
                          <div className="summary-bar-row" key={cat.name}>
                            <div className="checkbox-row" style={{ padding: 0 }}>
                              <span className="cb-left">
                                <span className="cb-color-dot" style={{ backgroundColor: cat.color }} />
                                <span className="cb-label">{cat.name}</span>
                              </span>
                              <strong className="cb-count">
                                {formatNumber(globalCount)}{' '}
                                <span style={{ color: 'var(--tt-text-muted)', fontWeight: 400 }}>({formatNumber(loadedCount)} loaded)</span>
                              </strong>
                            </div>
                            <div className="summary-bar-track">
                              <div
                                className="summary-bar-fill"
                                style={{ width: `${globalCount > 0 ? Math.max(4, pct) : 0}%`, backgroundColor: cat.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {sidebarTab === 'envStats' && (
                <section className="filter-section">
                  <div className="filter-section-body">
                    <h3 className="section-title" style={{ marginBottom: 4 }}>Global &amp; Environmental Statistics</h3>
                    <p className="section-subtitle" style={{ marginBottom: 12 }}>
                      Live aggregations from <code>GET /global-stats</code> &amp; <code>GET /environmental/stats</code>
                    </p>
                    {globalStats && (
                      <div style={{ marginBottom: 12 }}>
                        <div className="inspector-kicker" style={{ marginBottom: 6 }}>GET /global-stats</div>
                        <EnvironmentalTelemetryView envData={globalStats} loading={false} error="" />
                      </div>
                    )}
                    {envStats && (
                      <div>
                        <div className="inspector-kicker" style={{ marginBottom: 6 }}>GET /environmental/stats</div>
                        <EnvironmentalTelemetryView envData={envStats} loading={false} error="" />
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </aside>
        )}

        <main className="map-wrapper">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={3}
            minZoom={2}
            maxZoom={20}
            maxBounds={[[-85, -180], [85, 180]]}
            maxBoundsViscosity={1}
            zoomControl
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              key={basemap}
              attribution={BASEMAPS[basemap].attribution}
              url={BASEMAPS[basemap].url}
              maxNativeZoom={19}
              maxZoom={20}
            />
            <MapViewport
              onViewChange={setView}
              sidebarOpen={sidebarOpen}
              selectedFacility={selectedFacility}
              flyTarget={flyTarget}
              fitBoundsTarget={fitBoundsTarget}
            />
            {searchBoundary && (
              <GeoJSON
                key={JSON.stringify(searchBoundary).slice(0, 80)}
                data={searchBoundary}
                style={{ color: '#0066cc', weight: 2.5, opacity: 0.9, fillColor: '#0066cc', fillOpacity: 0.08 }}
              />
            )}
            <FacilityMarkers
              clusters={clusters}
              zoom={view.zoom}
              categoryVisualMap={categoryVisualMap}
              onSelectFacility={handleSelectFacility}
            />
            {pin && (
              <Marker position={[pin.lat, pin.lon]} icon={redPinIcon}>
                <Popup className="pin-popup">
                  <div className="popup-name">{pin.name}</div>
                  <div className="popup-full">{pin.full}</div>
                  <div className="popup-coords">{pin.lat.toFixed(5)}, {pin.lon.toFixed(5)}</div>
                </Popup>
              </Marker>
            )}
            <SearchControl
              setPin={setPin}
              setSearchBoundary={setSearchBoundary}
              facilities={activeDataset}
              categoryVisualMap={categoryVisualMap}
              onSelectFacilityFromSearch={handleSelectFacilityFromSearch}
            />
          </MapContainer>

          <div className="basemap-switcher" role="group" aria-label="Map style">
            {Object.entries(BASEMAPS).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                className={`basemap-btn${basemap === key ? ' basemap-btn--active' : ''}`}
                onClick={() => setBasemap(key)}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          <div className="map-legend-guide">
            <div
              className={`legend-guide-header${legendExpanded ? ' legend-guide-header--expanded' : ''}`}
              onClick={() => setLegendExpanded((v) => !v)}
            >
              <span className="legend-guide-title">Facility Legend {legendExpanded ? '▾' : '▸'}</span>
              <span className="legend-guide-count">{formatNumber(clusters.length)} map markers ({formatNumber(filteredFacilities.length)} sites)</span>
            </div>
            {legendExpanded && (
              <>
                <div className="legend-guide-grid">
                  {dynamicCategories.map((cat) => (
                    <button
                      type="button"
                      key={cat.name}
                      className={`legend-guide-item${selectedCategories.has(cat.name) ? '' : ' legend-item-inactive'}`}
                      onClick={() => toggleInSet(setSelectedCategories, cat.name)}
                      title={`Toggle ${cat.name} (${formatNumber(cat.count)} global)`}
                    >
                      <span className="legend-swatch" style={{ backgroundColor: cat.color }} />
                      <span className="legend-text">{cat.name}</span>
                    </button>
                  ))}
                </div>
                <div className="legend-note">
                  Global Inventory: {formatNumber(backendMeta.totalFacilities)} facilities across {formatNumber(backendMeta.totalCountries)} countries.
                </div>
              </>
            )}
          </div>

          {(loadingData || loadingViewport) && (
            <div className="data-loading-banner">
              {loadingData ? `Loading global inventory (${getApiBaseUrl()})…` : 'Updating regional facilities…'}
            </div>
          )}
          {dataError && (
            <div className="data-error-banner">
              <strong>Backend Connection Error</strong>
              <p>{dataError}</p>
              <p>Ensure the TerraTrace FastAPI server is running at <code>http://127.0.0.1:8000</code>.</p>
            </div>
          )}
        </main>

        {selectedFacility &&
          (() => {
            const f = selectedFacility;
            const vis = categoryVisualMap.get(f.facilityType) || getCategoryVisuals(f.facilityType);
            return (
              <aside className="facility-inspector" aria-label="Selected facility intelligence">
                <div className="inspector-header">
                  <div>
                    <div className="inspector-kicker">Facility Intelligence • {f.id}</div>
                    <h3 className="inspector-title">{f.name}</h3>
                  </div>
                  <button type="button" className="inspector-close-btn" onClick={() => handleSelectFacility(null)}>✕</button>
                </div>

                <div className="inspector-body">
                  <div className="inspector-badges-row">
                    <span className="inspector-pill" style={{ backgroundColor: vis.color, color: '#ffffff', borderColor: vis.color }}>
                      {vis.icon} {f.facilityType}
                    </span>
                    <span className="inspector-pill">🌐 {f.country}</span>
                    <span className="inspector-pill">⚡ {f.statuses.join(', ')}</span>
                  </div>

                  <div className="inspector-quick-actions">
                    <button
                      type="button"
                      className="inspector-action-btn inspector-action-btn--primary"
                      onClick={() => {
                        setBasemap('satellite');
                        setFlyTarget({ lat: f.lat, lon: f.lon, zoom: 16, ts: Date.now() });
                      }}
                    >
                      🛰️ Satellite View
                    </button>
                    <button type="button" className="inspector-action-btn" onClick={() => handleCopyCoords(f.lat, f.lon)}>
                      {copiedCoords ? '✓ Coords Copied' : '📋 Copy Coords'}
                    </button>
                  </div>

                  <div className="bento-grid">
                    <div className="bento-card">
                      <div className="bento-label">Listed Capacity</div>
                      <div className="bento-value">{f.capacityMW > 0 ? `${formatNumber(f.capacityMW)} MW` : '0 MW'}</div>
                      <div className="bento-sub">Total Units: {f.unitCount}</div>
                    </div>

                    <div className="bento-card">
                      <div className="bento-label">Unit Breakdown</div>
                      <div className="bento-value">{f.operatingUnits} Operating</div>
                      <div className="bento-sub">Const: {f.constructionUnits} • Pre: {f.preconstructionUnits} • Other: {f.otherStatusUnits}</div>
                    </div>

                    <div className="bento-card bento-card--full">
                      <div className="bento-label">Coordinates (WGS84)</div>
                      <div className="bento-value" style={{ fontFamily: 'var(--tt-font-mono)' }}>
                        {f.lat.toFixed(5)}°, {f.lon.toFixed(5)}°
                      </div>
                      <div className="bento-sub">
                        {f.coordinateAccuracy ? `Accuracy: ${f.coordinateAccuracy}` : ''}
                        {f.coordinateMethod ? ` • ${f.coordinateMethod}` : ''}
                      </div>
                    </div>
                  </div>

                  {facilityDetail && typeof facilityDetail === 'object' && (
                    <EnvironmentalTelemetryView envData={facilityDetail} loading={false} error="" />
                  )}

                  <div className="inspector-kicker" style={{ marginTop: 4 }}>Environmental Telemetry (GPM &amp; SMAP)</div>
                  <EnvironmentalTelemetryView envData={facilityEnvData} loading={loadingInspector} error={inspectorEnvError} />
                </div>
              </aside>
            );
          })()}
      </div>

      {welcomeOpen && (
        <div className="welcome-overlay" role="presentation">
          <section className="welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
            <div className="welcome-kicker">🛰️ TerraTrace Environmental Intelligence</div>
            <h2 id="welcome-title">Understand the environmental impact around industrial infrastructure.</h2>
            <p className="welcome-lead">
              Connected live to the TerraTrace FastAPI backend ({getApiBaseUrl()}), indexing {formatNumber(backendMeta.totalFacilities)} global power facilities across {formatNumber(backendMeta.totalCountries)} countries and territories.
            </p>
            <div className="welcome-footer">
              <span className="welcome-audience-tag">
                Live FastAPI Backend • {formatNumber(backendMeta.totalFacilities)} Facilities
              </span>
              <button type="button" className="welcome-next" onClick={() => setWelcomeOpen(false)} autoFocus>
                Return to Global Map <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
