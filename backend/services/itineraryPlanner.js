/**
 * itineraryPlanner.js
 * -----------------------------------------------------------------------
 * Greedy nearest-neighbor route planning over haversine distance.
 *
 * Given a starting point and a set of chosen destinations, repeatedly picks
 * the nearest not-yet-visited destination as the next stop. This is the
 * same conceptual approach validated in the earlier HTML/SVG demo rounds,
 * re-implemented fresh here in real server-side JS.
 *
 * NOTE: nearest-neighbor is a heuristic, not an optimal TSP solver — it's
 * fast, easy to explain to users ("we go to whichever spot is closest next"),
 * and good enough for a handful of weekend stops. It is NOT guaranteed to
 * find the shortest possible overall route.
 *
 * Distances/durations are haversine-based ESTIMATES via services/mapProvider.js,
 * pending real map API (高德/百度) integration for actual road/transit routing.
 * -----------------------------------------------------------------------
 */

const { getRoute } = require('./mapProvider');

/**
 * planItinerary
 *
 * @param {{ lat: number, lng: number, label?: string }} startPoint
 * @param {Array<{ id: string, name: string, lat: number, lng: number }>} destinations
 *   The full destination objects for the ids the user selected, in any order.
 *
 * @returns {{
 *   stops: Array<{
 *     order: number,
 *     destinationId: string,
 *     name: string,
 *     legDistanceKm: number,        // distance from previous stop (or start point) to this stop
 *     estimatedTransitMinutes: number,
 *   }>,
 *   totalDistanceKm: number,
 *   totalEstimatedTransitMinutes: number,
 * }}
 */
function planItinerary(startPoint, destinations) {
  const remaining = [...destinations];
  const stops = [];

  let currentPoint = { lat: startPoint.lat, lng: startPoint.lng };
  let totalDistanceKm = 0;
  let totalEstimatedTransitMinutes = 0;
  let order = 1;

  while (remaining.length > 0) {
    // Find the nearest remaining destination to the current point.
    let nearestIndex = 0;
    let nearestRoute = getRoute(currentPoint, remaining[0]);

    for (let i = 1; i < remaining.length; i += 1) {
      const route = getRoute(currentPoint, remaining[i]);
      if (route.distanceKm < nearestRoute.distanceKm) {
        nearestIndex = i;
        nearestRoute = route;
      }
    }

    const nextStop = remaining.splice(nearestIndex, 1)[0];

    stops.push({
      order,
      destinationId: nextStop.id,
      name: nextStop.name,
      legDistanceKm: nearestRoute.distanceKm,
      estimatedTransitMinutes: nearestRoute.durationMinutes,
    });

    totalDistanceKm += nearestRoute.distanceKm;
    totalEstimatedTransitMinutes += nearestRoute.durationMinutes;
    currentPoint = { lat: nextStop.lat, lng: nextStop.lng };
    order += 1;
  }

  return {
    stops,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    totalEstimatedTransitMinutes,
  };
}

module.exports = { planItinerary };
