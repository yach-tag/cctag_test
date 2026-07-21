const express = require('express');
const db = require('../db/database');

const router = express.Router();

function rowToDestination(row, transitRows) {
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
    transitOptions: transitRows.map((t) => ({
      mode: t.mode,
      durationEstimate: t.duration_estimate,
      costEstimate: t.cost_estimate,
      notes: t.notes || undefined,
    })),
  };
}

const transitStmt = db.prepare(
  `SELECT * FROM transit_options WHERE destination_id = ? ORDER BY sort_order ASC`
);

// GET /api/destinations?category=自然风光&keyword=长城
router.get('/', (req, res) => {
  const { category, keyword } = req.query;

  let sql = 'SELECT * FROM destinations';
  const conditions = [];
  const params = [];

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY name ASC';

  let rows = db.prepare(sql).all(...params);

  // Keyword search across name/category/tags. Done in JS after the SQL
  // fetch since `tags` is stored as a JSON string column — for a dataset
  // of 20 rows this is simpler than LIKE-matching a serialized array and
  // avoids false positives/negatives from substring matches inside JSON.
  if (keyword && keyword.trim() !== '') {
    const kw = keyword.trim().toLowerCase();
    rows = rows.filter((row) => {
      const tags = JSON.parse(row.tags);
      const haystack = [row.name, row.category, ...tags].join(' ').toLowerCase();
      return haystack.includes(kw);
    });
  }

  const results = rows.map((row) => rowToDestination(row, transitStmt.all(row.id)));

  res.json({ count: results.length, destinations: results });
});

// GET /api/destinations/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM destinations WHERE id = ?').get(req.params.id);

  if (!row) {
    return res.status(404).json({ error: 'destination not found' });
  }

  const destination = rowToDestination(row, transitStmt.all(row.id));
  res.json({ destination });
});

module.exports = router;
