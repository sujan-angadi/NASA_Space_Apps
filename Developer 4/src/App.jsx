import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

// ── Energy type definitions & distinct colors ─────────────────────────────────
const ENERGY_TYPES = [
  { key:'solar', label:'Solar', color:'#eab308', icon:'☀️' },
  { key:'wind', label:'Wind', color:'#06b6d4', icon:'💨' },
  { key:'coal', label:'Coal power', color:'#475569', icon:'🏭' },
  { key:'gas', label:'Oil / Gas power', color:'#f97316', icon:'🛢️' },
  { key:'hydro', label:'Hydropower', color:'#2563eb', icon:'💧' },
  { key:'nuclear', label:'Nuclear', color:'#9333ea', icon:'☢️' },
  { key:'bioenergy', label:'Bioenergy', color:'#16a34a', icon:'🌱' },
  { key:'geothermal', label:'Geothermal', color:'#dc2626', icon:'🌋' },
  { key:'steel', label:'Iron & Steel', color:'#64748b', icon:'⚙️' },
  { key:'cement', label:'Cement & Concrete', color:'#a16207', icon:'🧱' },
  { key:'chemicals', label:'Chemicals', color:'#d946ef', icon:'⚗️' },
  { key:'coal-mine', label:'Coal mines', color:'#78716c', icon:'⛏️' },
  { key:'lng', label:'LNG terminals', color:'#0d9488', icon:'🚢' },
  { key:'extraction', label:'Oil & Gas extraction', color:'#b45309', icon:'🛢️' },
  { key:'iron-ore', label:'Iron ore mines', color:'#7c2d12', icon:'⛏️' },
  { key:'coal-terminal', label:'Coal terminals', color:'#0891b2', icon:'🚢' },
];

const STATUS_LIST = [
  'Operating',
  'Under construction',
  'Pre-construction',
  'Announced',
  'Retired',
  'Mothballed',
  'Cancelled / Shelved',
  'Unknown / Other'
];

const CAPACITY_RANGES = [
  { id: 'under50', label: 'Under 50 MW', min: 0, max: 50 },
  { id: '50-250', label: '50–250 MW', min: 50, max: 250 },
  { id: '250-1000', label: '250–1,000 MW', min: 250, max: 1000 },
  { id: 'above1000', label: 'Above 1,000 MW', min: 1000, max: Infinity },
];

// ── Red pin DivIcon ───────────────────────────────────────────────────────────
const redPinIcon = L.divIcon({
  className: '',
  html: `<div class="red-pin"><div class="red-pin-head"></div><div class="red-pin-stem"></div><div class="red-pin-shadow"></div></div>`,
  iconSize: [28, 42],
  iconAnchor: [14, 42],
  popupAnchor: [0, -44],
});

// ── Place-type labels ─────────────────────────────────────────────────────────
const TYPE_LABEL = {
  city: '🏙️ City', town: '🏘️ Town', village: '🏡 Village',
  suburb: '🏘️ Suburb', neighbourhood: '📍 Area', county: '🗺️ County',
  state: '🗺️ State', country: '🌐 Country', postcode: '📮 Postcode',
  hotel: '🏨 Hotel', restaurant: '🍽️ Restaurant', hospital: '🏥 Hospital',
  school: '🏫 School', airport: '✈️ Airport', station: '🚉 Station',
  museum: '🏛️ Museum', park: '🌳 Park', beach: '🏖️ Beach',
};

function placeLabel(r) {
  return TYPE_LABEL[r.type] || TYPE_LABEL[r.class] || `📌 ${r.type || r.class || 'Place'}`;
}

// ── Coordinate parser ─────────────────────────────────────────────────────────
function parseCoords(raw) {
  const s = raw.trim();
  const decRe = /^(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/;
  const dec = s.match(decRe);
  if (dec) {
    const lat = parseFloat(dec[1]), lon = parseFloat(dec[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) return { lat, lon };
  }

  const dmsRe = /(\d{1,3})[°d]\s*(\d{1,2})[′'m]\s*([\d.]+)[″"s]?\s*([NSns])[,\s]+(\d{1,3})[°d]\s*(\d{1,2})[′'m]\s*([\d.]+)[″"s]?\s*([EWew])/;
  const dms = s.match(dmsRe);
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
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

function smartFit(map, place) {
  const [s, n, w, e] = place.boundingbox.map(Number);
  if ((n - s) < 0.005 && (e - w) < 0.005) {
    map.flyTo([Number(place.lat), Number(place.lon)], 16, { duration: 1.4 });
  } else {
    map.flyToBounds([[s, w], [n, e]], { padding: [50, 50], duration: 1.4, maxZoom: 16 });
  }
}

// ── SearchControl with polygon boundary extraction ────────────────────────────
function SearchControl({ setPin, setSearchBoundary }) {
  const map = useMap();
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [coordMode, setCoordMode] = useState(false);
  const debounceRef               = useRef(null);

  const search = async (value) => {
    const coords = parseCoords(value);
    if (coords) {
      setCoordMode(true);
      setResults([]);
      setLoading(true);
      const fullName = await reverseLookup(coords.lat, coords.lon);
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
    if (!value.trim() || value.trim().length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Include polygon_geojson=1 to get the exact boundary
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=10&addressdetails=1&polygon_geojson=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const minImportance = value.trim().length <= 4 ? 0.35 : 0.2;
      setResults(data.filter((r) => Number(r.importance) >= minImportance).slice(0, 6));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), parseCoords(val) ? 200 : 500);
  };

  const handleSelect = (place) => {
    smartFit(map, place);
    setPin({
      lat: Number(place.lat),
      lon: Number(place.lon),
      name: place.display_name.split(',')[0],
      full: place.display_name,
    });

    // Check if Nominatim returned an explicit polygon
    if (place.geojson && (place.geojson.type === 'Polygon' || place.geojson.type === 'MultiPolygon')) {
      setSearchBoundary(place.geojson);
    } else if (place.boundingbox) {
      // Fallback: draw rectangular boundary from boundingbox
      const [s, n, w, e] = place.boundingbox.map(Number);
      setSearchBoundary({
        type: 'Polygon',
        coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]]
      });
    }

    setQuery(place.display_name.split(',')[0]);
    setResults([]);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setCoordMode(false);
    setPin(null);
    setSearchBoundary(null);
  };

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <div className="search-box-wrapper">
      <div className={`search-input-row${coordMode ? ' coord-mode' : ''}`}>
        <span className="search-icon">{coordMode ? '🌐' : '🔍'}</span>
        <input
          className="search-input"
          type="text"
          placeholder="Place name or lat, lon…"
          value={query}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Escape' && setResults([])}
        />
        {loading && <span className="search-spinner" />}
        {query && !loading && (
          <button type="button" className="search-clear" onClick={clearSearch} title="Clear">
            ✕
          </button>
        )}
      </div>

      {results.length > 0 && results[0]._isCoord && (
        <ul className="search-results">
          <li className="coord-result" onClick={() => handleSelect(results[0])}>
            <div className="result-top">
              <strong>📍 {Number(results[0].lat).toFixed(5)}, {Number(results[0].lon).toFixed(5)}</strong>
              <span className="result-type-badge coord-badge">🌐 Coordinates</span>
            </div>
            <span className="result-sub">{results[0].display_name}</span>
          </li>
        </ul>
      )}

      {results.length > 0 && !results[0]._isCoord && (
        <ul className="search-results">
          {results.map((r) => (
            <li key={r.place_id} onClick={() => handleSelect(r)}>
              <div className="result-top">
                <strong>{r.display_name.split(',')[0]}</strong>
                <span className="result-type-badge">{placeLabel(r)}</span>
              </div>
              <span className="result-sub">{r.display_name.split(',').slice(1, 3).join(',')}</span>
            </li>
          ))}
        </ul>
      )}

      {!coordMode && results.length === 0 && query.trim().length > 0 && query.trim().length < 3 && (
        <div className="search-hint">Type at least 3 characters…</div>
      )}
    </div>
  );
}

// Dataset contract: public/data/facilities.json schema 3 produced from uploaded GEM trackers.
// [name,countryIndex,typeIndex,capacity,primaryStatus,lat,lon,statusMask,
//  operatingCapacityMW,GEM_ID,accuracy,startYear,sourceUrl,owner,capacityUnit,tracker]
function normalizeDataset(payload) {
  if (!payload || payload.schemaVersion !== 3 || !Array.isArray(payload.countries)
      || !Array.isArray(payload.data) || !Array.isArray(payload.types)
      || !Array.isArray(payload.statuses)) {
    throw new Error('Expected schema version 3. Use the matching facilities.json from this package.');
  }
  if (payload.types.length !== ENERGY_TYPES.length ||
      ENERGY_TYPES.some((t,i) => t.label !== payload.types[i]) ||
      STATUS_LIST.some((s,i) => s !== payload.statuses[i])) {
    throw new Error('Facility type or status order differs from the frontend. Regenerate the JSON.');
  }
  const valid = payload.data.filter(f => Array.isArray(f) && f.length >= 16 &&
    Number.isInteger(f[1]) && f[1] >= 0 && f[1] < payload.countries.length &&
    Number.isInteger(f[2]) && f[2] >= 0 && f[2] < ENERGY_TYPES.length &&
    Number.isFinite(f[5]) && Math.abs(f[5]) <= 90 &&
    Number.isFinite(f[6]) && Math.abs(f[6]) <= 180 &&
    Number.isInteger(f[7]) && f[7] > 0);
  return { ...payload, data:valid };
}

const CLUSTER_SIZE_PX = 84;
const formatNumber = (value) => Number(value || 0).toLocaleString();

function MapViewport({ onViewChange, sidebarOpen }) {
  const map = useMapEvents({
    moveend: () => publish(),
    zoomend: () => publish(),
  });

  const publish = useCallback(() => {
    const b = map.getBounds();
    onViewChange({ zoom: map.getZoom(), bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] });
  }, [map, onViewChange]);

  useEffect(() => { publish(); }, [publish]);
  useEffect(() => {
    const id = window.setTimeout(() => { map.invalidateSize(); publish(); }, 80);
    return () => window.clearTimeout(id);
  }, [map, publish, sidebarOpen]);
  return null;
}

// Group by Web-Mercator screen cells. As zoom decreases, cells cover more land,
// producing fewer, numbered cluster markers. No arbitrary point truncation.
function makeClusters(facilities, zoom, bounds) {
  const result = new Map();
  const [west, south, east, north] = bounds;
  const latPadding = Math.max(0.1, (north - south) * 0.12);
  const lonPadding = Math.max(0.1, (east - west) * 0.12);
  const z = Math.max(1, Math.round(zoom));
  for (const f of facilities) {
    const lat = f[5], lon = f[6];
    if (lat < south - latPadding || lat > north + latPadding) continue;
    // Normal bounds for TerraTrace's non-wrapping, [-180,+180] world view.
    if (lon < west - lonPadding || lon > east + lonPadding) continue;
    const point = L.CRS.EPSG3857.latLngToPoint(L.latLng(lat, lon), z);
    const gx = Math.floor(point.x / CLUSTER_SIZE_PX);
    const gy = Math.floor(point.y / CLUSTER_SIZE_PX);
    const key = `${gx}:${gy}`;
    let cluster = result.get(key);
    if (!cluster) {
      cluster = { key, count: 0, x: 0, y: 0, types: new Array(ENERGY_TYPES.length).fill(0),
        statuses: new Array(STATUS_LIST.length).fill(0), capacity: 0, lone: null };
      result.set(key, cluster);
    }
    cluster.count++;
    cluster.x += point.x;
    cluster.y += point.y;
    cluster.types[f[2]]++;
    cluster.capacity += Number(f[3]) || 0;
    cluster.lone = cluster.count === 1 ? f : null;
  }
  return [...result.values()].map(cluster => {
    const latLng = L.CRS.EPSG3857.pointToLatLng(L.point(cluster.x / cluster.count, cluster.y / cluster.count), z);
    return { ...cluster, lat: latLng.lat, lon: latLng.lng };
  });
}

function ClusterMarker({ cluster, mapZoom }) {
  const map = useMap();
  const { count, types } = cluster;
  if (count === 1 && cluster.lone) {
    const f = cluster.lone;
    const et = ENERGY_TYPES[f[2]];
    const mask = Number.isInteger(f[7]) ? f[7] : (1 << f[4]);
    const presentStatuses = STATUS_LIST.filter((_, i) => (mask & (1 << i)) !== 0);
    return (
      <CircleMarker center={[f[5], f[6]]} radius={Number(f[3]) >= 1000 ? 6 : Number(f[3]) >= 250 ? 5 : 4}
        pathOptions={{ color: '#ffffff', weight: 0.8, fillColor: et.color, fillOpacity: 0.92 }}>
        <Popup className="facility-popup">
          <div className="fac-name">{f[0]}</div>
          <div className="fac-row"><span className="fac-badge" style={{ backgroundColor: et.color }}>{et.icon} {et.label}</span></div>
          <div className="fac-meta"><b>Status:</b> {presentStatuses.join(', ')}</div>
          {Number.isFinite(f[3]) && f[3] > 0 && <div className="fac-meta"><b>{f[2] < 8 ? 'Listed power capacity' : 'Production capacity'}:</b> {formatNumber(f[3])} {f[14] || ''}</div>}
          {f[2] < 8 && Number.isFinite(f[8]) && f[8] > 0 && <div className="fac-meta"><b>Operating capacity:</b> {formatNumber(f[8])} MW</div>}
          {f[11] && <div className="fac-meta"><b>Start year:</b> {f[11]}</div>}
          {f[13] && <div className="fac-meta"><b>Operator / owner:</b> {f[13]}</div>}
          {f[15] && <div className="fac-meta"><b>Dataset:</b> {f[15]}</div>}
          {f[10] && <div className="fac-meta"><b>Coordinates:</b> {f[10]}</div>}
          {f[9] && <div className="fac-meta"><b>GEM ID:</b> {f[9]}</div>}
          {typeof f[12] === 'string' && /^https:\/\//.test(f[12]) && <a className="facility-source-link" href={f[12]} target="_blank" rel="noreferrer">View source ↗</a>}
          <div className="fac-coords">{f[5].toFixed(4)}, {f[6].toFixed(4)}</div>
        </Popup>
      </CircleMarker>
    );
  }
  const dominant = types.indexOf(Math.max(...types));
  const color = ENERGY_TYPES[dominant]?.color || '#2563eb';
  const icon = L.divIcon({
    className: 'facility-cluster-icon',
    html: `<span class="cluster-bubble" style="--cluster-color:${color}">${formatNumber(count)}</span>`,
    iconSize: [42, 42], iconAnchor: [21, 21],
  });
  return (
    <Marker position={[cluster.lat, cluster.lon]} icon={icon} eventHandlers={{
      click: () => { if (mapZoom < 13) map.flyTo([cluster.lat, cluster.lon], Math.min(mapZoom + 2, 13), { duration: 0.5 }); },
    }}>
      <Popup className="facility-popup" autoPan={true}>
        <div className="fac-name">{formatNumber(count)} facilities in this cluster</div>
        <div className="cluster-breakdown">
          {ENERGY_TYPES.map((et, i) => types[i] > 0 && (
            <div className="cluster-breakdown-row" key={et.key}>
              <span><span className="cluster-key-dot" style={{ backgroundColor: et.color }} />{et.label}</span>
              <b>{formatNumber(types[i])}</b>
            </div>
          ))}
        </div>
        <p className="cluster-popup-hint">Zoom in to separate the facilities.</p>
      </Popup>
    </Marker>
  );
}

function FacilityMarkers({ clusters, zoom }) {
  return <>{clusters.map(c => <ClusterMarker key={c.key} cluster={c} mapZoom={zoom} />)}</>;
}

export default function App() {
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [pin, setPin] = useState(null);
  const [searchBoundary, setSearchBoundary] = useState(null);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [facilitiesData, setFacilitiesData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');
  const [selectedEnergyTypes, setSelectedEnergyTypes] = useState(new Set(ENERGY_TYPES.map((_, i) => i)));
  const [selectedStatuses, setSelectedStatuses] = useState(new Set([0])); // Operating only
  const [selectedCapacities, setSelectedCapacities] = useState(new Set(CAPACITY_RANGES.map(c => c.id)));
  const [selectedCountries, setSelectedCountries] = useState(new Set(['India']));
  const [countrySearch, setCountrySearch] = useState('');
  const [view, setView] = useState({ zoom: 5, bounds: [45, 5, 115, 41] });
  const monitorRef = useRef(null);
  const exploreRef = useRef(null);

  useEffect(() => {
    let live = true;
    fetch('/data/facilities.json')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}: /data/facilities.json not found`); return res.json(); })
      .then(payload => { if (live) { setFacilitiesData(normalizeDataset(payload)); setDataError(''); } })
      .catch(err => { if (live) { setDataError(err.message || 'Could not load facilities.json'); console.error(err); } })
      .finally(() => { if (live) setLoadingData(false); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    const handler = event => {
      if (monitorRef.current && !monitorRef.current.contains(event.target)) setMonitorOpen(false);
      if (exploreRef.current && !exploreRef.current.contains(event.target)) setExploreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredFacilities = useMemo(() => {
    if (!facilitiesData) return [];
    return facilitiesData.data.filter(f => {
      const country = facilitiesData.countries[f[1]];
      if (!selectedCountries.has(country) || !selectedEnergyTypes.has(f[2])) return false;
      const mask = Number.isInteger(f[7]) ? f[7] : (1 << f[4]);
      if (![...selectedStatuses].some(i => (mask & (1 << i)) !== 0)) return false;
      if (f[2] >= 8) return true; // Production-capacity units must not be compared to MW.
      const cap = Number(f[3]);
      return f[3] == null || CAPACITY_RANGES.some(cr => selectedCapacities.has(cr.id) && Number.isFinite(cap) && cap >= cr.min && cap < cr.max);
    });
  }, [facilitiesData, selectedCountries, selectedEnergyTypes, selectedStatuses, selectedCapacities]);

  const clusters = useMemo(() => makeClusters(filteredFacilities, view.zoom, view.bounds), [filteredFacilities, view]);
  const energyCounts = useMemo(() => {
    const a = new Array(ENERGY_TYPES.length).fill(0);
    if (facilitiesData) for (const f of facilitiesData.data) a[f[2]]++;
    return a;
  }, [facilitiesData]);
  const filteredTypeCounts = useMemo(() => {
    const a = new Array(ENERGY_TYPES.length).fill(0);
    for (const f of filteredFacilities) a[f[2]]++;
    return a;
  }, [filteredFacilities]);
  const filteredCountriesList = useMemo(() => {
    if (!facilitiesData) return [];
    const q = countrySearch.trim().toLowerCase();
    return facilitiesData.countries.filter(c => c.toLowerCase().includes(q)).sort((a,b) => a.localeCompare(b));
  }, [facilitiesData, countrySearch]);
  const toggleInSet = (setter, key) => setter(old => {
    const next = new Set(old);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return (
    <div className="app-container">
      <header className="top-bar">
        <div className="top-bar-left-group">
          <button type="button" className="sidebar-toggle-btn" onClick={() => setSidebarOpen(v => !v)} title={sidebarOpen ? 'Collapse filters' : 'Show filters'}>☰</button>
          <h2 className="top-bar-title">🛰️ TerraTrace: Satellite Evidence for Smarter Industrial Siting</h2>
        </div>
        <nav className="top-nav" aria-label="Main navigation">
          <div className="nav-item" ref={monitorRef}>
            <button type="button" className={`nav-btn${monitorOpen ? ' nav-btn--active' : ''}`} onClick={() => { setMonitorOpen(v => !v); setExploreOpen(false); }} aria-expanded={monitorOpen} aria-haspopup="true">📡 Monitor <span className="nav-caret">▾</span></button>
            {monitorOpen && <div className="nav-dropdown">
              <div className="dropdown-section-label">Satellite Monitoring Layers</div>
              {[
                ['💨', 'Air Pollution (NO₂)'],
                ['🔥', 'Thermal Hotspots'],
                ['⬜', 'Methane Emissions'],
                ['🌡️', 'Land Surface Temperature'],
                ['🌱', 'Vegetation Health (NDVI)'],
                ['🏞️', 'Land-Use Change'],
                ['💧', 'Water Quality & Turbidity'],
              ].map(([icon, label]) => <button key={label} className="dropdown-item dropdown-item--disabled" type="button" disabled title="Available in a future version"><span className="di-icon">{icon}</span><span className="di-title">{label}</span><span className="di-soon">Soon</span></button>)}
            </div>}
          </div>
          <div className="nav-item" ref={exploreRef}>
            <button type="button" className={`nav-btn${exploreOpen ? ' nav-btn--active' : ''}`} onClick={() => { setExploreOpen(v => !v); setMonitorOpen(false); }} aria-expanded={exploreOpen} aria-haspopup="true">🔭 Explore <span className="nav-caret">▾</span></button>
            {exploreOpen && <div className="nav-dropdown explore-dropdown">
              <div className="dropdown-section-label">SATELLITE ASSISTED SITING</div>
              {[
                ['☢️', 'New Nuclear Power Plant'],
                ['🏭', 'New Thermal Power Plant'],
                ['☀️', 'New Solar Plant'],
                ['💨', 'New Wind Plant'],
                ['💧', 'New Hydropower Plant'],
                ['🛢️', 'New Oil / Gas Power Plant'],
                ['🌱', 'New Bioenergy Plant'],
                ['🌋', 'New Geothermal Plant'],
                ['🏗️', 'New Manufacturing Sites'],
              ].map(([icon, label]) => <button key={label} className="dropdown-item dropdown-item--disabled" type="button" disabled title="Siting analysis is coming soon"><span className="di-icon">{icon}</span><span className="di-title">{label}</span><span className="di-soon">Soon</span></button>)}
            </div>}
          </div>
        </nav>
      </header>
      <div className="body-layout">
        {sidebarOpen && <aside className="left-sidebar">
          <div className="sidebar-header"><span className="sidebar-title">Global Industrial Facilities</span><span className="facility-badge-count">{formatNumber(filteredFacilities.length)} matching</span></div>
          <div className="sidebar-scrollable">
            <section className="filter-section">
              <div className="filter-section-header"><h3 className="section-title">Facility Type Filters</h3><p className="section-subtitle">Choose power generation and industrial facility categories.</p></div>
              <div className="btn-actions-row"><button className="action-btn" onClick={() => setSelectedEnergyTypes(new Set(ENERGY_TYPES.map((_,i)=>i)))}>Select all</button><button className="action-btn" onClick={() => setSelectedEnergyTypes(new Set())}>Clear all</button></div>
              <div className="filter-list">{ENERGY_TYPES.map((e, i) => <label key={e.key} className="checkbox-row"><span className="cb-left"><input type="checkbox" checked={selectedEnergyTypes.has(i)} onChange={() => toggleInSet(setSelectedEnergyTypes, i)} /><span className="cb-color-dot" style={{ backgroundColor:e.color }} /><span className="cb-label">{e.label}</span></span><span className="cb-count" title="Worldwide, all statuses">{formatNumber(energyCounts[i])}</span></label>)}</div>
              <p className="filter-footnote">Type counts show all global locations, regardless of country or status. Filtered totals appear below.</p>
            </section>
            <section className="filter-section">
              <div className="filter-section-header"><h3 className="section-title">Facility Status</h3><p className="section-subtitle">Includes locations with at least one unit of the selected status.</p></div>
              <div className="filter-list">{STATUS_LIST.map((s,i) => <label key={s} className="checkbox-row"><span className="cb-left"><input type="checkbox" checked={selectedStatuses.has(i)} onChange={() => toggleInSet(setSelectedStatuses,i)}/><span className="cb-label">{s}</span></span></label>)}</div>
            </section>
            <section className="filter-section">
              <div className="filter-section-header"><h3 className="section-title">Power Capacity (MW)</h3><p className="section-subtitle">Applies only to power plants. Other industries have different units.</p></div>
              <div className="filter-list">{CAPACITY_RANGES.map(c => <label key={c.id} className="checkbox-row"><span className="cb-left"><input type="checkbox" checked={selectedCapacities.has(c.id)} onChange={() => toggleInSet(setSelectedCapacities,c.id)}/><span className="cb-label">{c.label}</span></span></label>)}</div>
            </section>
            <section className="filter-section">
              <div className="filter-section-header"><h3 className="section-title">Country Filters</h3><p className="section-subtitle">Search and select countries to explore facilities.</p></div>
              <div className="country-search-box"><input className="country-search-input" placeholder="Search country..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)} />{countrySearch && <button className="search-clear-mini" onClick={() => setCountrySearch('')}>✕</button>}</div>
              <div className="btn-actions-row"><button className="action-btn" onClick={() => setSelectedCountries(new Set(facilitiesData?.countries || []))}>Select all</button><button className="action-btn" onClick={() => setSelectedCountries(new Set())}>Clear all</button></div>
              <div className="selected-counter-text">{selectedCountries.size} of {facilitiesData?.countries?.length ?? 0} countries selected</div>
              <div className="countries-scroll-list">{filteredCountriesList.map(c => <label key={c} className="checkbox-row"><span className="cb-left"><input type="checkbox" checked={selectedCountries.has(c)} onChange={() => toggleInSet(setSelectedCountries,c)}/><span className="cb-label">{c}</span></span><span className="cb-count">{formatNumber(facilitiesData?.countryCounts?.[c])}</span></label>)}</div>
            </section>
            <section className="filter-section">
              <div className="filter-section-header"><h3 className="section-title">Matching facilities by type</h3><p className="section-subtitle">Exact totals across the selected countries and filters, independent of map zoom.</p></div>
              <div className="filter-list">{ENERGY_TYPES.map((e,i)=> <div className="checkbox-row" key={e.key}><span className="cb-left"><span className="cb-color-dot" style={{ backgroundColor:e.color }}/><span className="cb-label">{e.label}</span></span><strong className="cb-count">{formatNumber(filteredTypeCounts[i])}</strong></div>)}</div>
            </section>
          </div>
        </aside>}
        <main className="map-wrapper">
          <MapContainer center={[20.5937,78.9629]} zoom={5} minZoom={2} maxZoom={20} maxBounds={[[-85,-180],[85,180]]} maxBoundsViscosity={1} zoomControl style={{ height:'100%',width:'100%' }}>
            <TileLayer attribution='Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={19} maxZoom={20}/>
            <MapViewport onViewChange={setView} sidebarOpen={sidebarOpen}/>
            {searchBoundary && <GeoJSON key={JSON.stringify(searchBoundary).slice(0,80)} data={searchBoundary} style={{ color:'#8B4513',weight:3,opacity:.95,fillColor:'#8B4513',fillOpacity:.08 }}/>}
            <FacilityMarkers clusters={clusters} zoom={view.zoom}/>
            {pin && <Marker position={[pin.lat,pin.lon]} icon={redPinIcon}><Popup className="pin-popup"><div className="popup-name">{pin.name}</div><div className="popup-full">{pin.full}</div><div className="popup-coords">{pin.lat.toFixed(5)}, {pin.lon.toFixed(5)}</div></Popup></Marker>}
            <SearchControl setPin={setPin} setSearchBoundary={setSearchBoundary}/>
          </MapContainer>
          <div className="map-legend-guide">
            <div className="legend-guide-header"><span className="legend-guide-title">Facility Types Guide</span><span className="legend-guide-count">{formatNumber(clusters.length)} map markers</span></div>
            <div className="legend-guide-grid">{ENERGY_TYPES.map((e,i) => <button type="button" key={e.key} className={`legend-guide-item${selectedEnergyTypes.has(i)?'':' legend-item-inactive'}`} onClick={() => toggleInSet(setSelectedEnergyTypes,i)} title={`Toggle ${e.label}`}><span className="legend-swatch" style={{ backgroundColor:e.color }}/><span className="legend-text">{e.label}</span></button>)}</div>
            <div className="legend-note">Numbered circles combine nearby facilities. Click for a facility-type breakdown; zoom in to separate them.</div>
          </div>
          {loadingData && <div className="data-loading-banner">Loading facility locations...</div>}
          {dataError && <div className="data-error-banner"><strong>Facility data unavailable</strong><p>{dataError}</p><p>Place <code>facilities.json</code> in <code>public/data/</code>.</p></div>}
        </main>
      </div>
      {welcomeOpen && <div className="welcome-overlay" role="presentation">
        <section className="welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="welcome-title" aria-describedby="welcome-description">
          <div className="welcome-kicker">🛰️ WELCOME TO TERRATRACE</div>
          <h2 id="welcome-title">Explore industry. Understand the environment.</h2>
          <p id="welcome-description">TerraTrace maps existing power plants and industrial facilities worldwide. Use the filters to choose facility types, operating status and countries. Zoom in to see individual locations or click numbered clusters to see how many facilities they contain.</p>
          <p>Use <strong>Monitor</strong> to find upcoming satellite-based environmental indicators, and <strong>Explore</strong> for future lower-impact industrial siting tools. These analyses are still in development.</p>
          <button type="button" className="welcome-next" onClick={() => setWelcomeOpen(false)} autoFocus>Next <span aria-hidden="true">→</span></button>
        </section>
      </div>}
    </div>
  );
}
