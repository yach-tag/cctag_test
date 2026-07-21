/**
 * Seeds SQLite with the 20 real Beijing-area destinations + their transit
 * options. Safe to re-run: it wipes and re-inserts destination/transit data,
 * but leaves favorites/itineraries untouched.
 *
 * Usage:
 *   node db/seed.js
 */
const db = require('./database');
const { destinations } = require('../data/destinations');

function seed() {
  const insertDestination = db.prepare(`
    INSERT INTO destinations (id, name, category, tagline, best_duration, best_season, tags, lat, lng)
    VALUES (@id, @name, @category, @tagline, @bestDuration, @bestSeason, @tags, @lat, @lng)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      tagline = excluded.tagline,
      best_duration = excluded.best_duration,
      best_season = excluded.best_season,
      tags = excluded.tags,
      lat = excluded.lat,
      lng = excluded.lng
  `);

  const deleteTransitForDestination = db.prepare(
    `DELETE FROM transit_options WHERE destination_id = ?`
  );

  const insertTransit = db.prepare(`
    INSERT INTO transit_options (id, destination_id, sort_order, mode, duration_estimate, cost_estimate, notes)
    VALUES (@id, @destinationId, @sortOrder, @mode, @durationEstimate, @costEstimate, @notes)
  `);

  const runAll = db.transaction((items) => {
    for (const dest of items) {
      insertDestination.run({
        id: dest.id,
        name: dest.name,
        category: dest.category,
        tagline: dest.tagline,
        bestDuration: dest.bestDuration,
        bestSeason: dest.bestSeason,
        tags: JSON.stringify(dest.tags),
        lat: dest.lat,
        lng: dest.lng,
      });

      deleteTransitForDestination.run(dest.id);

      dest.transitOptions.forEach((opt, index) => {
        insertTransit.run({
          id: `${dest.id}-transit-${index}`,
          destinationId: dest.id,
          sortOrder: index,
          mode: opt.mode,
          durationEstimate: opt.durationEstimate,
          costEstimate: opt.costEstimate,
          notes: opt.notes || null,
        });
      });
    }
  });

  runAll(destinations);

  console.log(`Seeded ${destinations.length} destinations.`);
}

seed();
