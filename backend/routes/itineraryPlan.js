const express = require('express');
const db = require('../db/database');
const { planItinerary } = require('../services/itineraryPlanner');
const { START_POINTS } = require('../data/destinations');

const router = express.Router();

function resolveStartPoint(startPoint) {
  if (typeof startPoint === 'string' && START_POINTS[startPoint]) {
    return { ...START_POINTS[startPoint], label: startPoint };
  }
  return null;
}

// POST /api/itinerary/plan
// body: { startPoint: '天安门' | '中关村' | '国贸' | '首都机场', destinationIds: string[] }
router.post('/plan', (req, res) => {
  const { startPoint, destinationIds } = req.body || {};

  const resolvedStart = resolveStartPoint(startPoint);
  if (!resolvedStart) {
    return res.status(400).json({
      error: `startPoint must be one of: ${Object.keys(START_POINTS).join(', ')}`,
    });
  }

  if (!Array.isArray(destinationIds) || destinationIds.length === 0) {
    return res.status(400).json({ error: 'destinationIds must be a non-empty array' });
  }

  const placeholders = destinationIds.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT * FROM destinations WHERE id IN (${placeholders})`)
    .all(...destinationIds);

  if (rows.length !== destinationIds.length) {
    const foundIds = new Set(rows.map((r) => r.id));
    const missing = destinationIds.filter((id) => !foundIds.has(id));
    return res.status(404).json({ error: 'some destinationIds were not found', missing });
  }

  // Preserve nearest-neighbor greedy order starting from the chosen start point.
  const plan = planItinerary(resolvedStart, rows);

  res.json({
    startPoint: resolvedStart.label,
    ...plan,
  });
});

module.exports = router;
