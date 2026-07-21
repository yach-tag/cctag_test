# 北京周末去哪儿玩 — Backend

Node.js + Express + SQLite (`better-sqlite3`) backend for the Beijing
weekend trip recommender. Serves destination data, favorites, and
itinerary/route planning.

> **配置AMAP_KEY后走真实高德数据，否则自动降级为估算值。**
> Itinerary-planning distances/times (`services/mapProvider.js#getRoute`)
> call 高德地图 (Amap) Web服务 API's 驾车路径规划 (driving directions)
> endpoint when `AMAP_KEY` is set, for real road distance/duration. If
> `AMAP_KEY` is unset, or the Amap call fails for any reason (bad key,
> network error, rate limit/quota exhausted, no route found), it
> automatically falls back to a great-circle/haversine distance + assumed
> average speed estimate — the endpoint never throws because of this. The
> seed data's transit durations/costs, and public-transit-mode routing,
> are still estimates for now (see "Swapping in a real map API later" below).

## Install

```bash
cd backend
npm install
```

## Map API key (AMAP_KEY)

Real driving-route distance/duration comes from 高德开放平台 (Amap) Web服务
API. To use it:

```bash
cp .env.example .env
# then edit .env and set AMAP_KEY to a real key from https://lbs.amap.com/
```

`.env` is gitignored — never commit it. `AMAP_KEY` is loaded via `dotenv`
(see `server.js` / `services/mapProvider.js`) and read from
`process.env.AMAP_KEY`. If it's not set (e.g. CI, a fresh clone, or a
teammate without a key yet), `getRoute()` just falls back to the haversine
estimate — no crash, no required setup step.

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
async function that everything else in the backend calls through
(`routes/itineraryPlan.js` and `services/itineraryPlanner.js` only depend
on its `{ distanceKm, durationMinutes, mode, isEstimate }` return shape).

Driving-mode real data (高德 `v3/direction/driving`) is wired up — see
above. Still estimate-only / follow-up ideas:

- **公交 (transit) mode**: `v3/direction/transit/integrated` returns
  multi-segment plans (walk/bus/subway transfers) which need more parsing
  than driving's single `paths[0]`; not done in this pass to avoid
  over-scoping. `getDrivingRoute()` in `mapProvider.js` is a template for
  adding a `getTransitRoute()` alongside it.
- Alternative providers (百度地图 / 腾讯地图 directions API) could be added
  as additional fallback tiers before the haversine estimate.

## Tests

Not included in this pass — optional per the task spec. The seed data and
endpoints were prioritized instead.
