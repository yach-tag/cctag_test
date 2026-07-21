const express = require('express');
const db = require('../db/database');

const router = express.Router();

// TODO: add real auth. Everything here operates on a single demo user
// until authentication is designed/implemented.
const DEMO_USER_ID = 'demo-user';

// GET /api/itineraries — list saved itineraries for the demo user.
router.get('/', (req, res) => {
  const rows = db
    .prepare(`SELECT * FROM itineraries WHERE user_id = ? ORDER BY created_at DESC`)
    .all(DEMO_USER_ID);

  const itineraries = rows.map((row) => ({
    id: row.id,
    name: row.name,
    startPoint: row.start_point,
    destinationIds: JSON.parse(row.destination_ids),
    orderedStopIds: JSON.parse(row.ordered_stop_ids),
    totalDistanceKm: row.total_distance_km,
    createdAt: row.created_at,
  }));

  res.json({ count: itineraries.length, itineraries });
});

// POST /api/itineraries — persist a previously-computed itinerary so it
// survives a server restart.
// body: {
//   name?: string,
//   startPoint: string,
//   destinationIds: string[],     // original selection
//   orderedStopIds: string[],     // computed visit order (from /api/itinerary/plan)
//   totalDistanceKm: number,
// }
router.post('/', (req, res) => {
  const { name, startPoint, destinationIds, orderedStopIds, totalDistanceKm } = req.body || {};

  if (!startPoint || !Array.isArray(destinationIds) || !Array.isArray(orderedStopIds)) {
    return res.status(400).json({
      error: 'startPoint, destinationIds[], and orderedStopIds[] are required',
    });
  }

  const result = db
    .prepare(
      `INSERT INTO itineraries (user_id, name, start_point, destination_ids, ordered_stop_ids, total_distance_km)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      DEMO_USER_ID,
      name || null,
      startPoint,
      JSON.stringify(destinationIds),
      JSON.stringify(orderedStopIds),
      totalDistanceKm || 0
    );

  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

module.exports = router;
