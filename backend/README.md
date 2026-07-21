# 北京周末去哪儿玩 — Backend

Node.js + Express + SQLite (`better-sqlite3`) backend for the Beijing
weekend trip recommender. Serves destination data, favorites, and
itinerary/route planning.

> **地图/交通数据当前为估算值，等待高德/百度地图API Key后需替换。**
> All transit durations/costs in the seed data, and all itinerary-planning
> distances/times, are estimates (great-circle/haversine distance + an
> assumed average speed). See `services/mapProvider.js` — that is the one
> file to change once a real map API key is available.

## Install

```bash
cd backend
npm install
```

## Seed the database

Creates `db/app.db` (SQLite file, gitignored) and populates it with the 20
destinations + their transit options.

```bash
npm run seed
```

Re-running the seed script is safe — it upserts destinations/transit
options but leaves any saved `favorites`/`itineraries` untouched.

## Run

```bash
npm start
# or, for auto-restart on file changes:
npm run dev
```

Server listens on `http://localhost:3000` by default (override with
`PORT=xxxx`). Health check: `GET /api/health`.

## API

### Destinations

- `GET /api/destinations` — list all destinations.
  - Query params: `category` (`自然风光` | `人文历史`), `keyword` (matches
    name/category/tags, case-insensitive).
- `GET /api/destinations/:id` — single destination, including its
  `transitOptions` array.

### Favorites

Single demo user for now (`user_id = 'demo-user'`).
`TODO: add real auth` — see `routes/favorites.js`.

- `GET /api/favorites` — list favorited destinations.
- `POST /api/favorites` — body `{ "destinationId": "xiangshan" }`.
- `DELETE /api/favorites/:destinationId` — remove a favorite.

### Itinerary planning

- `POST /api/itinerary/plan` — body:
  ```json
  {
    "startPoint": "天安门",
    "destinationIds": ["xiangshan", "summer-palace", "old-summer-palace"]
  }
  ```
  `startPoint` must be one of `天安门` / `中关村` / `国贸` / `首都机场`.

  Computes a suggested visit order using a **greedy nearest-neighbor**
  algorithm over haversine distance (see `services/itineraryPlanner.js`):
  starting from `startPoint`, repeatedly travel to whichever remaining
  destination is closest. Returns each stop with its leg distance and an
  estimated transit time (assuming ~27.5 km/h effective speed — a rough
  stand-in for a subway/bus/driving mix, pending real routing data).

  Response shape:
  ```json
  {
    "startPoint": "天安门",
    "stops": [
      {
        "order": 1,
        "destinationId": "old-summer-palace",
        "name": "圆明园",
        "legDistanceKm": 12.3,
        "estimatedTransitMinutes": 27
      }
    ],
    "totalDistanceKm": 30.1,
    "totalEstimatedTransitMinutes": 66
  }
  ```

- `GET /api/itineraries` — list itineraries saved via the endpoint below
  (persisted, survives a restart).
- `POST /api/itineraries` — persist a computed itinerary. Body:
  ```json
  {
    "name": "周末长城一日游",
    "startPoint": "天安门",
    "destinationIds": ["xiangshan", "summer-palace"],
    "orderedStopIds": ["summer-palace", "xiangshan"],
    "totalDistanceKm": 30.1
  }
  ```

## Data model

SQLite schema lives in `db/database.js` (created automatically on first
run/seed):

- `destinations` — id, name, category, tagline, best_duration, best_season,
  tags (JSON array), lat, lng.
- `transit_options` — per-destination 交通方案 (mode/duration/cost), 2-3
  rows per destination.
- `favorites` — demo-user favorites.
- `itineraries` — saved itinerary plans (original selection + computed
  order).

Seed data (20 real Beijing-area destinations, ~10/10 split across
自然风光/人文历史) lives in `data/destinations.js`.

## Swapping in a real map API later

`services/mapProvider.js` exports a single `getRoute(origin, destination)`
function that everything else in the backend calls through. Today it
returns a haversine-distance estimate. To integrate a real provider
(高德地图 / 百度地图 / 腾讯地图 directions API):

1. Add the provider's SDK/HTTP client and API key (via env var, not
   committed to the repo).
2. Replace the body of `getRoute()` to call the real directions API and
   map its response into the same `{ distanceKm, durationMinutes, mode,
   isEstimate }` shape.
3. Nothing else needs to change — `routes/itineraryPlan.js` and
   `services/itineraryPlanner.js` only depend on that return shape.

## Tests

Not included in this pass — optional per the task spec. The seed data and
endpoints were prioritized instead.
