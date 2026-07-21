/**
 * mapProvider.js
 * -----------------------------------------------------------------------
 * STUB — 地图/交通数据当前为估算值，等待高德/百度地图API Key后需替换。
 *
 * This module is the single seam between "real map/routing data" and the
 * rest of the backend. Right now `getRoute()` just falls back to a
 * haversine (great-circle distance) estimate with a flat average-speed
 * assumption — it does NOT account for real roads, transit lines, traffic,
 * or transfers.
 *
 * When a real map API key (高德地图 / 百度地图 / 腾讯地图, etc.) is available,
 * swap the body of `getRoute()` to call that provider's directions API and
 * map its response into the same { distanceKm, durationMinutes, mode } shape.
 * Nothing outside this file should need to change — routes/itinerary.js and
 * services/itineraryPlanner.js only depend on this function's return shape.
 * -----------------------------------------------------------------------
 */

const EARTH_RADIUS_KM = 6371;

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
// (25-30 km/h) rather than a highway speed. TODO: replace with real
// routing durations once a map API key is wired up.
const ASSUMED_AVERAGE_SPEED_KMH = 27.5;

function estimateDurationMinutes(distanceKm) {
  return Math.round((distanceKm / ASSUMED_AVERAGE_SPEED_KMH) * 60);
}

/**
 * getRoute(origin, destination)
 *
 * origin/destination: { lat, lng }
 *
 * Returns: {
 *   distanceKm: number,          // great-circle distance, 2 decimal places
 *   durationMinutes: number,     // rough estimate, see ASSUMED_AVERAGE_SPEED_KMH
 *   mode: 'estimate',            // marks this as a non-real-routing estimate
 *   isEstimate: true,
 * }
 *
 * TODO(map-api): once a 高德/百度 map API key is available, replace this
 * body with a real directions-API call and keep the same return shape.
 */
function getRoute(origin, destination) {
  const distanceKm = haversineDistanceKm(origin, destination);
  const durationMinutes = estimateDurationMinutes(distanceKm);

  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationMinutes,
    mode: 'estimate',
    isEstimate: true,
  };
}

module.exports = {
  getRoute,
  haversineDistanceKm,
  estimateDurationMinutes,
  ASSUMED_AVERAGE_SPEED_KMH,
};
