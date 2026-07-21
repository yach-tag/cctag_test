const express = require('express');
const db = require('../db/database');

const router = express.Router();

// TODO: add real auth. Everything here operates on a single demo user
// until authentication is designed/implemented.
const DEMO_USER_ID = 'demo-user';

const transitStmt = db.prepare(
  `SELECT * FROM transit_options WHERE destination_id = ? ORDER BY sort_order ASC`
);

function destinationRowToJson(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    tagline: row.tagline,
    bestDuration: row.best_duration,
    bestSeason: row.best_season,
    tags: JSON.parse(row.tags),
    lat: row.lat,
    lng: row.lng,
    transitOptions: transitStmt.all(row.id).map((t) => ({
      mode: t.mode,
      durationEstimate: t.duration_estimate,
      costEstimate: t.cost_estimate,
      notes: t.notes || undefined,
    })),
  };
}

// GET /api/favorites — list favorited destinations for the demo user.
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT d.* FROM favorites f
       JOIN destinations d ON d.id = f.destination_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`
    )
    .all(DEMO_USER_ID);

  res.json({ count: rows.length, favorites: rows.map(destinationRowToJson) });
});

// POST /api/favorites  { destinationId: string }
router.post('/', (req, res) => {
  const { destinationId } = req.body || {};

  if (!destinationId) {
    return res.status(400).json({ error: 'destinationId is required' });
  }

  const destination = db.prepare('SELECT id FROM destinations WHERE id = ?').get(destinationId);
  if (!destination) {
    return res.status(404).json({ error: 'destination not found' });
  }

  db.prepare(
    `INSERT INTO favorites (user_id, destination_id) VALUES (?, ?)
     ON CONFLICT(user_id, destination_id) DO NOTHING`
  ).run(DEMO_USER_ID, destinationId);

  res.status(201).json({ ok: true, destinationId });
});

// DELETE /api/favorites/:destinationId
router.delete('/:destinationId', (req, res) => {
  const result = db
    .prepare('DELETE FROM favorites WHERE user_id = ? AND destination_id = ?')
    .run(DEMO_USER_ID, req.params.destinationId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'favorite not found' });
  }

  res.json({ ok: true });
});

module.exports = router;
