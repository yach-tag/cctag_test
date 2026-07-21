/**
 * 北京周末去哪儿玩 — backend entry point.
 *
 * Node.js + Express + SQLite (better-sqlite3).
 * See backend/README.md for setup/run/seed instructions.
 */
const express = require('express');
const cors = require('cors');

const destinationsRouter = require('./routes/destinations');
const favoritesRouter = require('./routes/favorites');
const itineraryPlanRouter = require('./routes/itineraryPlan');
const itinerariesRouter = require('./routes/itineraries');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'beijing-weekend-app-backend' });
});

app.use('/api/destinations', destinationsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/itinerary', itineraryPlanRouter); // POST /api/itinerary/plan
app.use('/api/itineraries', itinerariesRouter); // GET/POST /api/itineraries

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`beijing-weekend-app backend listening on http://localhost:${PORT}`);
});

module.exports = app;
