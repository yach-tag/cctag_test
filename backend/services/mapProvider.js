/**
 * mapProvider.js
 * -----------------------------------------------------------------------
 * Single seam between "real map/routing data" and the rest of the backend.
 *
 * `getRoute()` calls 高德地图 (Amap) Web服务 API's 驾车路径规划 (driving
 * directions) endpoint when `AMAP_KEY` is configured, and falls back to a
 * haversine (great-circle distance) estimate with a flat average-speed
 * assumption whenever:
 *   - `AMAP_KEY` is not set (e.g. CI, a dev's local env without a key), or
 *   - the Amap request fails for any reason (network error, bad key,
 *     rate limit / quota exhausted, malformed response, no route found).
 *
 * The fallback never throws — callers always get back the same shape
 * regardless of whether real routing data was available.
 *
 * routes/itineraryPlan.js and services/itineraryPlanner.js only depend on
 * this function's return shape ({ distanceKm, durationMinutes, mode,
 * isEstimate }), not on how the numbers were produced.
 * -----------------------------------------------------------------------
 */

require('dotenv').config();

const EARTH_RADIUS_KM = 6371;
const AMAP_DRIVING_URL = 'https://restapi.amap.com/v3/direction/driving';
const AMAP_REQUEST_TIMEOUT_MS = 5000;

/**
 * Haversine great-circle distance between two lat/lng points, in km.
 */
function haversineDistanceKm(origin, destination) {
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(destination.lat - origin.lat);
  const dLng = toRad(destination.lng - origin.lng);

  const lat1 = toRad(origin.lat);
  const lat2 = toRad(destination.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

// Effective average speed assumption used to turn distance into a rough
// transit-time estimate. Real trips mix subway/bus/driving/walking and
// have transfer overhead, so this is deliberately conservative
// (25-30 km/h) rather than a highway speed. Only used by the fallback
// estimate path (no AMAP_KEY, or the Amap call failed).
const ASSUMED_AVERAGE_SPEED_KMH = 27.5;

function estimateDurationMinutes(distanceKm) {
  return Math.round((distanceKm / ASSUMED_AVERAGE_SPEED_KMH) * 60);
}

/**
 * getEstimateRoute(origin, destination)
 *
 * The haversine-based fallback. Always succeeds, never throws.
 */
function getEstimateRoute(origin, destination) {
  const distanceKm = haversineDistanceKm(origin, destination);
  const durationMinutes = estimateDurationMinutes(distanceKm);

  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationMinutes,
    mode: 'estimate',
    isEstimate: true,
  };
}

function toAmapLngLat(point) {
  return `${point.lng},${point.lat}`;
}

/**
 * fetchWithTimeout — global fetch (Node >= 18) with an AbortController-based
 * timeout, so a hung Amap request can't stall a request indefinitely.
 */
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * getDrivingRoute(origin, destination)
 *
 * Calls 高德's 驾车路径规划 (driving directions) endpoint and returns the
 * same shape as getEstimateRoute, or throws on any failure (missing key,
 * network error, non-OK HTTP status, Amap-reported error status, or no
 * route found) — callers are expected to catch and fall back.
 */
async function getDrivingRoute(origin, destination) {
  const apiKey = process.env.AMAP_KEY;
  if (!apiKey) {
    throw new Error('AMAP_KEY is not set');
  }

  const params = new URLSearchParams({
    key: apiKey,
    origin: toAmapLngLat(origin),
    destination: toAmapLngLat(destination),
    extensions: 'base',
  });

  const response = await fetchWithTimeout(`${AMAP_DRIVING_URL}?${params.toString()}`, AMAP_REQUEST_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(`Amap driving API HTTP ${response.status}`);
  }

  const data = await response.json();

  // Amap's own status field: '1' = success, '0' = failure (see `info`/`infocode`).
  if (data.status !== '1') {
    throw new Error(`Amap driving API error: ${data.info || 'unknown'} (${data.infocode || 'no code'})`);
  }

  const path = data.route && data.route.paths && data.route.paths[0];
  if (!path) {
    throw new Error('Amap driving API returned no route paths');
  }

  const distanceMeters = Number(path.distance);
  const durationSeconds = Number(path.duration);

  if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) {
    throw new Error('Amap driving API returned non-numeric distance/duration');
  }

  return {
    distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
    durationMinutes: Math.round(durationSeconds / 60),
    mode: 'driving',
    isEstimate: false,
  };
}

/**
 * getRoute(origin, destination)
 *
 * origin/destination: { lat, lng }
 *
 * Returns a Promise resolving to: {
 *   distanceKm: number,
 *   durationMinutes: number,
 *   mode: 'driving' | 'estimate',
 *   isEstimate: boolean,
 * }
 *
 * Tries a real 高德 driving-directions call first (when AMAP_KEY is
 * configured); on any failure it logs a warning and falls back to the
 * haversine estimate rather than throwing, so callers never need their own
 * try/catch around this.
 */
async function getRoute(origin, destination) {
  try {
    return await getDrivingRoute(origin, destination);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[mapProvider] Amap driving route lookup failed, falling back to haversine estimate: ${err.message}`
    );
    return getEstimateRoute(origin, destination);
  }
}

module.exports = {
  getRoute,
  getEstimateRoute,
  getDrivingRoute,
  haversineDistanceKm,
  estimateDurationMinutes,
  ASSUMED_AVERAGE_SPEED_KMH,
};
