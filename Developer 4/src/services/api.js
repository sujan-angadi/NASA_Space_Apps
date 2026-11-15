const DIRECT_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(
  /\/+$/,
  ''
);
const PROXY_BASE_URL = '/api';

let activeBaseUrl = DIRECT_BASE_URL;
let cachedOpenApiSpec = null;

const endpointCapabilities = {
  paths: new Set(),
  queryParams: {},
  maxLimits: {},
  defaultLimits: {},
};

const QUERY_CACHE_MAX = 40;
const facilitiesQueryCache = new Map();
const inFlightRequests = new Map();

function getCachedQuery(cacheKey) {
  if (!facilitiesQueryCache.has(cacheKey)) return null;
  const entry = facilitiesQueryCache.get(cacheKey);
  if (Date.now() - entry.timestamp > 120000) {
    facilitiesQueryCache.delete(cacheKey);
    return null;
  }
  facilitiesQueryCache.delete(cacheKey);
  facilitiesQueryCache.set(cacheKey, entry);
  return entry.data;
}

function setCachedQuery(cacheKey, data) {
  if (facilitiesQueryCache.size >= QUERY_CACHE_MAX) {
    const oldestKey = facilitiesQueryCache.keys().next().value;
    facilitiesQueryCache.delete(oldestKey);
  }
  facilitiesQueryCache.set(cacheKey, { timestamp: Date.now(), data });
}

async function requestJson(path, { params = {}, signal } = {}) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v !== undefined && v !== null && v !== '') searchParams.append(key, String(v));
      });
    } else {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  const buildUrl = (base) => `${base}${cleanPath}${queryString ? `?${queryString}` : ''}`;

  const executeFetch = async (baseUrl) => {
    const url = buildUrl(baseUrl);
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      let detail = `HTTP ${response.status} (${response.statusText})`;
      if (contentType.includes('application/json')) {
        try {
          const errJson = await response.json();
          detail = errJson.detail
            ? typeof errJson.detail === 'string'
              ? errJson.detail
              : JSON.stringify(errJson.detail)
            : detail;
        } catch {
          // Ignore JSON parse error on error response
        }
      }
      const error = new Error(`Backend error on ${cleanPath}: ${detail}`);
      error.status = response.status;
      throw error;
    }

    if (!contentType.includes('application/json')) {
      throw new Error(
        `Expected JSON from ${url}, but received '${
          contentType || 'unknown content-type'
        }'. Ensure FastAPI is running at ${DIRECT_BASE_URL}.`
      );
    }

    return response.json();
  };

  try {
    return await executeFetch(activeBaseUrl);
  } catch (err) {
    if (err.name !== 'AbortError' && activeBaseUrl === DIRECT_BASE_URL && !err.status) {
      try {
        const data = await executeFetch(PROXY_BASE_URL);
        activeBaseUrl = PROXY_BASE_URL;
        return data;
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

export async function fetchOpenApiSpec(signal) {
  if (cachedOpenApiSpec) return cachedOpenApiSpec;
  try {
    const spec = await requestJson('/openapi.json', { signal });
    cachedOpenApiSpec = spec;

    if (spec?.paths) {
      Object.entries(spec.paths).forEach(([pathName, pathItem]) => {
        endpointCapabilities.paths.add(pathName);
        const getOp = pathItem?.get;
        if (getOp?.parameters) {
          const paramMap = {};
          for (const p of getOp.parameters) {
            if (p.in === 'query' && p.name) {
              const s = p.schema || {};
              const anyOfMax = s.anyOf?.find((sub) => sub.maximum !== undefined)?.maximum;
              const anyOfDef = s.anyOf?.find((sub) => sub.default !== undefined)?.default;
              const max = s.maximum ?? s.exclusiveMaximum ?? anyOfMax ?? null;
              const def = s.default ?? anyOfDef ?? null;

              paramMap[p.name] = {
                name: p.name,
                required: Boolean(p.required),
                max,
                default: def,
                schema: s,
              };

              if (['limit', 'page_size', 'per_page', 'size'].includes(p.name)) {
                if (max !== null) endpointCapabilities.maxLimits[pathName] = Number(max);
                if (def !== null) endpointCapabilities.defaultLimits[pathName] = Number(def);
              }
            }
          }
          endpointCapabilities.queryParams[pathName] = paramMap;
        }
      });
    }
    return spec;
  } catch (err) {
    console.warn('Could not load /openapi.json:', err.message);
    return null;
  }
}

export function getBackendDiagnostics() {
  const facParams = endpointCapabilities.queryParams['/facilities'] || {};
  const paramNames = Object.keys(facParams);

  const hasBbox = paramNames.some((p) =>
    [
      'bbox',
      'min_lat',
      'max_lat',
      'min_lon',
      'max_lon',
      'south',
      'north',
      'west',
      'east',
      'lat_min',
      'lat_max',
    ].includes(p)
  );

  const hasSearch = paramNames.some((p) =>
    ['search', 'q', 'query', 'name', 'facility_name'].includes(p)
  );

  const hasCountryFilter = paramNames.some((p) =>
    ['country', 'countries', 'country_name', 'Country'].includes(p)
  );

  const hasCategoryFilter = paramNames.some((p) =>
    ['facility_type', 'type', 'category', 'Facility_Type', 'fuel_type'].includes(p)
  );

  const hasOffset = paramNames.some((p) => ['offset', 'skip', 'page'].includes(p));

  return {
    discoveredPaths: [...endpointCapabilities.paths],
    facilitiesParams: paramNames,
    maxLimit: endpointCapabilities.maxLimits['/facilities'] || 500,
    defaultLimit: endpointCapabilities.defaultLimits['/facilities'] || 500,
    hasBbox,
    hasSearch,
    hasCountryFilter,
    hasCategoryFilter,
    hasOffset,
    hasGlobalStatsEndpoint: endpointCapabilities.paths.has('/global-stats'),
    hasEnvStatsEndpoint: endpointCapabilities.paths.has('/environmental/stats'),
  };
}

function pickField(obj, candidates, fallback = undefined) {
  if (!obj || typeof obj !== 'object') return fallback;
  for (const key of candidates) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  return fallback;
}

export function unwrapCollectionResponse(payload) {
  if (Array.isArray(payload)) {
    return { items: payload, total: payload.length, limit: payload.length, offset: 0, meta: {} };
  }
  if (!payload || typeof payload !== 'object') {
    return { items: [], total: 0, limit: 0, offset: 0, meta: {} };
  }

  const arrayCandidates = [
    'facilities',
    'data',
    'items',
    'results',
    'records',
    'locations',
    'features',
  ];

  let items = [];
  for (const key of arrayCandidates) {
    if (Array.isArray(payload[key])) {
      items = payload[key];
      break;
    }
  }

  if (payload.type === 'FeatureCollection' && Array.isArray(payload.features)) {
    items = payload.features.map((feat) => ({
      ...(feat.properties || {}),
      Latitude:
        feat.geometry?.coordinates?.[1] ??
        feat.properties?.Latitude ??
        feat.properties?.latitude,
      Longitude:
        feat.geometry?.coordinates?.[0] ??
        feat.properties?.Longitude ??
        feat.properties?.longitude,
    }));
  }

  if (items.length === 0) {
    const firstArrayKey = Object.keys(payload).find((k) => Array.isArray(payload[k]));
    if (firstArrayKey) items = payload[firstArrayKey];
  }

  const total = Number(
    pickField(
      payload,
      ['total', 'total_count', 'count', 'total_facilities', 'matched_count', 'total_records'],
      items.length
    )
  );
  const limit = Number(pickField(payload, ['limit', 'page_size', 'per_page', 'size'], items.length));
  const offset = Number(pickField(payload, ['offset', 'skip', 'page'], 0));

  return {
    items,
    total: Number.isFinite(total) ? total : items.length,
    limit: Number.isFinite(limit) ? limit : items.length,
    offset: Number.isFinite(offset) ? offset : 0,
    meta: payload,
  };
}

export function adaptFacilityRecord(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;

  const id = String(
    pickField(
      raw,
      [
        'facility_id',
        'GEM_Location_ID',
        'gem_location_id',
        'id',
        'location_id',
        'GEM_ID',
        'gem_id',
      ],
      `fac-${index}`
    )
  ).trim();

  const name = String(
    pickField(
      raw,
      ['Facility_Name', 'facility_name', 'name', 'plant_name', 'title'],
      `Facility ${id}`
    )
  ).trim();

  const country = String(
    pickField(raw, ['Country', 'country', 'country_name', 'nation'], 'Unknown')
  ).trim();

  const facilityType = String(
    pickField(
      raw,
      ['Facility_Type', 'facility_type', 'type', 'category', 'fuel_type', 'energy_type', 'sector'],
      'Unspecified'
    )
  ).trim();

  const lat = Number(
    pickField(raw, ['Latitude', 'latitude', 'lat', 'y']) ??
      raw.coordinates?.lat ??
      raw.coordinates?.latitude ??
      raw.location?.lat ??
      raw.location?.latitude
  );

  const lon = Number(
    pickField(raw, ['Longitude', 'longitude', 'lon', 'lng', 'long', 'x']) ??
      raw.coordinates?.lon ??
      raw.coordinates?.lng ??
      raw.coordinates?.longitude ??
      raw.location?.lon ??
      raw.location?.lng ??
      raw.location?.longitude
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return null;
  }

  const capacityMW = Number(
    pickField(
      raw,
      [
        'Listed_Capacity_MW',
        'listed_capacity_mw',
        'capacity_mw',
        'capacity',
        'installed_capacity_mw',
      ],
      0
    )
  );

  const unitCount = Number(pickField(raw, ['Unit_Count', 'unit_count', 'units', 'total_units'], 0));
  const operatingUnits = Number(pickField(raw, ['Operating_Units', 'operating_units'], 0));
  const preconstructionUnits = Number(
    pickField(raw, ['Preconstruction_Units', 'preconstruction_units'], 0)
  );
  const constructionUnits = Number(
    pickField(raw, ['Construction_Units', 'construction_units'], 0)
  );
  const otherStatusUnits = Number(
    pickField(raw, ['Other_Status_Units', 'other_status_units'], 0)
  );

  const statuses = [];
  const explicitStatus = pickField(raw, ['status', 'primary_status', 'operating_status', 'Status']);
  if (typeof explicitStatus === 'string' && explicitStatus.trim()) {
    statuses.push(explicitStatus.trim());
  } else if (Array.isArray(explicitStatus)) {
    explicitStatus.forEach((s) => s && statuses.push(String(s).trim()));
  }

  if (operatingUnits > 0 && !statuses.includes('Operating')) statuses.push('Operating');
  if (constructionUnits > 0 && !statuses.includes('Construction')) statuses.push('Construction');
  if (preconstructionUnits > 0 && !statuses.includes('Pre-construction')) {
    statuses.push('Pre-construction');
  }
  if (otherStatusUnits > 0 && !statuses.includes('Other Status')) statuses.push('Other Status');
  if (statuses.length === 0) statuses.push('Operating');

  const coordinateMethod = pickField(raw, ['Coordinate_Method', 'coordinate_method'], null);
  const coordinateAccuracy = pickField(
    raw,
    ['Source_Coordinate_Accuracy', 'source_coordinate_accuracy', 'accuracy', 'coordinate_accuracy'],
    null
  );

  const rainfall = pickField(raw, [
    'gpm_rainfall',
    'rainfall_mm',
    'rainfall',
    'precipitation_mm',
    'precipitation',
    'mean_rainfall',
    'GPM_Rainfall',
  ]);

  const soilMoisture = pickField(raw, [
    'smap_soil_moisture',
    'soil_moisture',
    'surface_soil_moisture',
    'smap',
    'mean_soil_moisture',
    'SMAP_Soil_Moisture',
  ]);

  return {
    id,
    facility_id: id,
    name,
    country,
    facilityType,
    lat,
    lon,
    capacityMW: Number.isFinite(capacityMW) ? capacityMW : 0,
    unitCount: Number.isFinite(unitCount) ? unitCount : 0,
    operatingUnits: Number.isFinite(operatingUnits) ? operatingUnits : 0,
    preconstructionUnits: Number.isFinite(preconstructionUnits) ? preconstructionUnits : 0,
    constructionUnits: Number.isFinite(constructionUnits) ? constructionUnits : 0,
    otherStatusUnits: Number.isFinite(otherStatusUnits) ? otherStatusUnits : 0,
    statuses,
    coordinateMethod,
    coordinateAccuracy,
    rainfall: rainfall !== undefined ? rainfall : null,
    soilMoisture: soilMoisture !== undefined ? soilMoisture : null,
    raw,
  };
}

function mapFilterParams(
  endpoint,
  { country, facilityType, search, bounds, limit, offset, page } = {}
) {
  const specParams = endpointCapabilities.queryParams[endpoint];
  const out = {};

  const assignParam = (value, candidateNames, defaultName) => {
    if (value === undefined || value === null || value === '') return;
    if (specParams) {
      const matched = candidateNames.find((name) => specParams[name] !== undefined);
      if (matched) {
        out[matched] = value;
      }
      return;
    }
    out[defaultName] = value;
  };

  assignParam(country, ['country', 'countries', 'country_name', 'Country'], 'country');
  assignParam(
    facilityType,
    ['facility_type', 'type', 'category', 'Facility_Type', 'fuel_type'],
    'facility_type'
  );
  assignParam(search, ['search', 'q', 'query', 'name', 'facility_name'], 'search');

  if (Array.isArray(bounds) && bounds.length === 4) {
    const [west, south, east, north] = bounds.map((v) => Number(v.toFixed(4)));
    if (specParams) {
      if (specParams.bbox) {
        out.bbox = `${west},${south},${east},${north}`;
      } else {
        assignParam(south, ['min_lat', 'south', 'lat_min', 'minLat'], 'min_lat');
        assignParam(north, ['max_lat', 'north', 'lat_max', 'maxLat'], 'max_lat');
        assignParam(west, ['min_lon', 'min_lng', 'west', 'lon_min', 'minLon'], 'min_lon');
        assignParam(east, ['max_lon', 'max_lng', 'east', 'lon_max', 'maxLon'], 'max_lon');
      }
    }
  }

  const maxAllowed = endpointCapabilities.maxLimits[endpoint] || 500;
  const safeLimit = limit ? Math.min(Number(limit), maxAllowed) : maxAllowed;

  if (specParams) {
    const limitKey = ['limit', 'page_size', 'per_page', 'size'].find(
      (k) => specParams[k] !== undefined
    );
    if (limitKey) {
      const paramMax = specParams[limitKey].max;
      out[limitKey] = paramMax ? Math.min(safeLimit, Number(paramMax)) : safeLimit;
    }
  } else if (limit !== undefined) {
    out.limit = safeLimit;
  }

  if (offset !== undefined && offset !== null && offset > 0) {
    if (specParams) {
      if (specParams.offset) out.offset = offset;
      else if (specParams.skip) out.skip = offset;
      else if (specParams.page && safeLimit > 0) {
        out.page = Math.floor(offset / safeLimit) + 1;
      }
    } else {
      out.offset = offset;
    }
  } else if (page !== undefined && page !== null) {
    assignParam(page, ['page'], 'page');
  }

  return out;
}

export async function getFacilities(filters = {}, { signal, useCache = true } = {}) {
  const queryParams = mapFilterParams('/facilities', filters);
  const cacheKey = `/facilities?${new URLSearchParams(queryParams).toString()}`;

  if (useCache) {
    const cached = getCachedQuery(cacheKey);
    if (cached) return cached;
  }

  if (!signal && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    let payload;
    try {
      payload = await requestJson('/facilities', { params: queryParams, signal });
    } catch (err) {
      if (err.status === 422 && queryParams.limit) {
        const retryParams = { ...queryParams };
        delete retryParams.limit;
        payload = await requestJson('/facilities', { params: retryParams, signal });
      } else {
        throw err;
      }
    }

    const { items, total, limit, offset, meta } = unwrapCollectionResponse(payload);
    const facilities = [];
    for (let i = 0; i < items.length; i++) {
      const adapted = adaptFacilityRecord(items[i], offset + i);
      if (adapted) facilities.push(adapted);
    }

    const result = {
      facilities,
      total: Math.max(total, facilities.length),
      limit,
      offset,
      meta,
      queryParams,
    };

    if (useCache) setCachedQuery(cacheKey, result);
    return result;
  })();

  if (!signal) {
    inFlightRequests.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => inFlightRequests.delete(cacheKey));
  }

  return fetchPromise;
}

export async function getFacilitiesBatch(filters = {}, { maxPages = 3, signal } = {}) {
  const firstPage = await getFacilities({ ...filters, offset: 0 }, { signal });
  const byId = new Map();
  firstPage.facilities.forEach((f) => byId.set(f.id, f));

  const pageSize = firstPage.limit || firstPage.facilities.length || 500;
  const totalMatching = firstPage.total || firstPage.facilities.length;
  const diag = getBackendDiagnostics();

  if (totalMatching <= byId.size || maxPages <= 1 || !diag.hasOffset || pageSize <= 0) {
    return {
      facilities: [...byId.values()],
      total: totalMatching,
      meta: firstPage.meta,
    };
  }

  const extraOffsets = [];
  const pagesToFetch = Math.min(maxPages - 1, Math.ceil(totalMatching / pageSize) - 1);

  if (!filters.country && !filters.search && !diag.hasBbox && totalMatching > pageSize * maxPages) {
    const step = Math.floor(totalMatching / maxPages);
    for (let i = 1; i < maxPages; i++) {
      extraOffsets.push(i * step);
    }
  } else {
    for (let i = 1; i <= pagesToFetch; i++) {
      extraOffsets.push(i * pageSize);
    }
  }

  const pagePromises = extraOffsets.map((offset) =>
    getFacilities({ ...filters, offset }, { signal }).catch(() => null)
  );

  const results = await Promise.all(pagePromises);
  results.forEach((res) => {
    if (res?.facilities) {
      res.facilities.forEach((f) => byId.set(f.id, f));
    }
  });

  return {
    facilities: [...byId.values()],
    total: totalMatching,
    meta: firstPage.meta,
  };
}

export async function getFacilityById(facilityId, { signal } = {}) {
  if (!facilityId) throw new Error('facilityId is required');
  const encodedId = encodeURIComponent(String(facilityId));
  const payload = await requestJson(`/facilities/${encodedId}`, { signal });
  const record =
    payload?.facility && typeof payload.facility === 'object'
      ? payload.facility
      : payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
      ? payload.data
      : payload;
  return {
    adapted: adaptFacilityRecord(record),
    raw: payload,
  };
}

export async function getGlobalStats({ signal } = {}) {
  return requestJson('/global-stats', { signal });
}

export async function getEnvironmentalStats({ signal } = {}) {
  return requestJson('/environmental/stats', { signal });
}

export async function getEnvironmentalFacilities(filters = {}, { signal } = {}) {
  const queryParams = mapFilterParams('/environmental/facilities', filters);
  const payload = await requestJson('/environmental/facilities', { params: queryParams, signal });
  const { items, total, meta } = unwrapCollectionResponse(payload);
  const facilities = [];
  for (let i = 0; i < items.length; i++) {
    const adapted = adaptFacilityRecord(items[i], i);
    if (adapted) facilities.push(adapted);
  }
  return {
    facilities,
    total: Math.max(total, facilities.length),
    meta,
  };
}

export async function getFacilityEnvironmental(facilityId, { signal } = {}) {
  if (!facilityId) throw new Error('facilityId is required');
  const encodedId = encodeURIComponent(String(facilityId));
  return requestJson(`/environmental/facilities/${encodedId}`, { signal });
}

export async function fetchAuxiliaryAggregations(signal) {
  const paths = endpointCapabilities.paths;
  const countryCandidates = [
    '/countries',
    '/facilities/countries',
    '/stats/countries',
    '/global-stats/countries',
  ];
  const categoryCandidates = [
    '/categories',
    '/facility-types',
    '/facilities/types',
    '/facilities/categories',
    '/stats/categories',
  ];

  let countriesPayload = null;
  let categoriesPayload = null;

  for (const p of countryCandidates) {
    if (paths.has(p)) {
      try {
        countriesPayload = await requestJson(p, { signal });
        break;
      } catch {
        // Continue
      }
    }
  }

  for (const p of categoryCandidates) {
    if (paths.has(p)) {
      try {
        categoriesPayload = await requestJson(p, { signal });
        break;
      } catch {
        // Continue
      }
    }
  }

  return { countriesPayload, categoriesPayload };
}

export function buildGlobalMetadata({
  globalStats,
  envStats,
  facilitiesMeta,
  auxCountries,
  auxCategories,
  loadedFacilities = [],
}) {
  const countryCounts = new Map();
  const categoryCounts = new Map();
  const statusCounts = new Map();

  const ingestMapData = (source, targetMap) => {
    if (!source) return;
    if (Array.isArray(source)) {
      source.forEach((item) => {
        if (typeof item === 'string') {
          const clean = item.trim();
          if (clean && !targetMap.has(clean)) targetMap.set(clean, null);
        } else if (item && typeof item === 'object') {
          const name = pickField(item, [
            'country',
            'Country',
            'country_name',
            'facility_type',
            'Facility_Type',
            'type',
            'category',
            'status',
            'name',
            'label',
            'key',
          ]);
          const count = pickField(item, [
            'count',
            'total',
            'facilities',
            'facility_count',
            'total_facilities',
            'value',
          ]);
          if (name) {
            const cleanName = String(name).trim();
            const numCount = Number(count);
            targetMap.set(cleanName, Number.isFinite(numCount) ? numCount : null);
          }
        }
      });
    } else if (typeof source === 'object') {
      Object.entries(source).forEach(([k, v]) => {
        const cleanKey = k.trim();
        if (typeof v === 'number' && Number.isFinite(v)) {
          targetMap.set(cleanKey, v);
        } else if (v && typeof v === 'object') {
          const c = Number(
            pickField(v, ['count', 'total', 'facilities', 'facility_count', 'value'], NaN)
          );
          targetMap.set(cleanKey, Number.isFinite(c) ? c : null);
        }
      });
    }
  };

  [globalStats, envStats, facilitiesMeta].forEach((src) => {
    if (!src || typeof src !== 'object') return;

    ingestMapData(
      pickField(src, [
        'by_country',
        'countries',
        'country_counts',
        'facilities_by_country',
        'country_distribution',
        'country_breakdown',
        'top_countries',
      ]),
      countryCounts
    );

    ingestMapData(
      pickField(src, [
        'by_facility_type',
        'by_type',
        'facility_types',
        'categories',
        'types',
        'type_counts',
        'category_counts',
        'facilities_by_type',
        'facility_type_counts',
        'sector_breakdown',
      ]),
      categoryCounts
    );

    ingestMapData(
      pickField(src, ['status_counts', 'by_status', 'statuses', 'unit_status_counts']),
      statusCounts
    );
  });

  if (auxCountries) {
    ingestMapData(
      auxCountries.countries || auxCountries.data || auxCountries.items || auxCountries,
      countryCounts
    );
  }
  if (auxCategories) {
    ingestMapData(
      auxCategories.categories ||
        auxCategories.facility_types ||
        auxCategories.types ||
        auxCategories.data ||
        auxCategories,
      categoryCounts
    );
  }

  const globalCountriesComplete = countryCounts.size > 0;
  const globalCategoriesComplete = categoryCounts.size > 0;

  const loadedCountryCounts = new Map();
  const loadedCategoryCounts = new Map();
  const loadedStatusCounts = new Map();

  for (const f of loadedFacilities) {
    if (f.country) {
      loadedCountryCounts.set(f.country, (loadedCountryCounts.get(f.country) || 0) + 1);
    }
    if (f.facilityType) {
      loadedCategoryCounts.set(
        f.facilityType,
        (loadedCategoryCounts.get(f.facilityType) || 0) + 1
      );
    }
    for (const st of f.statuses) {
      loadedStatusCounts.set(st, (loadedStatusCounts.get(st) || 0) + 1);
    }
  }

  for (const [country, count] of loadedCountryCounts.entries()) {
    if (!countryCounts.has(country) || countryCounts.get(country) === null) {
      countryCounts.set(country, count);
    }
  }

  for (const [cat, count] of loadedCategoryCounts.entries()) {
    if (!categoryCounts.has(cat) || categoryCounts.get(cat) === null) {
      categoryCounts.set(cat, count);
    }
  }

  for (const [st, count] of loadedStatusCounts.entries()) {
    if (!statusCounts.has(st)) {
      statusCounts.set(st, count);
    }
  }

  const totalFacilities = Number(
    pickField(
      globalStats,
      ['total_facilities', 'facilities_count', 'total_locations', 'total_records', 'total', 'count'],
      0
    ) ||
      pickField(
        envStats,
        ['total_facilities', 'facilities_count', 'total_locations', 'total'],
        0
      ) ||
      pickField(
        facilitiesMeta,
        ['total', 'total_facilities', 'total_count', 'count'],
        loadedFacilities.length
      )
  );

  const reportedTotalCountries = Number(
    pickField(
      globalStats,
      ['total_countries', 'countries_count', 'country_count', 'num_countries'],
      0
    ) ||
      pickField(
        envStats,
        ['total_countries', 'countries_count', 'country_count'],
        0
      ) ||
      countryCounts.size
  );

  const totalCapacityMW = Number(
    pickField(
      globalStats,
      ['total_capacity_mw', 'total_listed_capacity_mw', 'capacity_mw', 'total_capacity'],
      NaN
    )
  );

  return {
    countryCounts,
    categoryCounts,
    statusCounts,
    loadedCountryCounts,
    loadedCategoryCounts,
    totalFacilities: Math.max(totalFacilities, loadedFacilities.length),
    totalCountries: Math.max(reportedTotalCountries, countryCounts.size),
    discoveredCountryCount: countryCounts.size,
    totalCapacityMW: Number.isFinite(totalCapacityMW) ? totalCapacityMW : null,
    hasFullCountryAggregation:
      globalCountriesComplete && countryCounts.size >= reportedTotalCountries,
    hasFullCategoryAggregation: globalCategoriesComplete,
  };
}

export function extractBackendMetadata(statsPayload, facilitiesMeta, loadedFacilities = []) {
  return buildGlobalMetadata({
    globalStats: statsPayload,
    envStats: statsPayload,
    facilitiesMeta,
    loadedFacilities,
  });
}

export function getApiBaseUrl() {
  return activeBaseUrl === PROXY_BASE_URL
    ? `${DIRECT_BASE_URL} (via /api proxy)`
    : DIRECT_BASE_URL;
}
