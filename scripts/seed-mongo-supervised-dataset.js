// Usage:
//   MONGODB_URI=... MONGODB_DB=... node scripts/seed-mongo-supervised-dataset.js
//
// Seeds a supervised dataset in Mongo ('maintenance_supervised') with the schema:
// - bike_id
// - total_rides
// - total_distance_km
// - avg_ride_duration_min
// - usage_days
// - last_maintenance_days_ago
// - usage_intensity = total_rides / usage_days
// - next_maintenance_in_days (target)
// Target formula (as specified):
//   next_maintenance_in_days = 60
//     - 0.05 * total_rides
//     - 0.08 * total_distance_km
//     - 0.3  * avg_ride_duration_min
//     - 0.4  * last_maintenance_days_ago
//     + 0.5  * usage_intensity
//     - epsilon,  epsilon ~ Normal(0, 2)

const { MongoClient } = require('mongodb');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

(() => {
  const root = process.cwd();
  const local = path.join(root, '.env.local');
  if (fs.existsSync(local)) dotenv.config({ path: local });
  else dotenv.config();
})();

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
// Box–Muller transform for normal(0,1)
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  const dbName =
    process.env.MONGODB_DB ||
    (uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i)?.[1]) ||
    'bikerental';

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const bikesCol = db.collection('bikes');
  const supCol = db.collection('maintenance_supervised');

  // Row count (default 1000)
  const ROWS = Number(process.env.ROWS || 1000);

  // Ensure bikes exist (BSU 001..BSU 050)
  const bikeCount = Math.max(20, Math.min(100, Number(process.env.SUP_BIKES || 50)));
  const names = Array.from({ length: bikeCount }, (_, i) => `BSU ${String(i + 1).padStart(3, '0')}`);
  const bikes = [];
  for (const name of names) {
    const res = await bikesCol.findOneAndUpdate(
      { name },
      { $setOnInsert: { name } },
      { upsert: true, returnDocument: 'after' }
    );
    const doc = res.value || (await bikesCol.findOne({ name }));
    bikes.push({ id: String(doc._id), name });
  }

  // Build supervised rows
  const docs = [];
  for (let i = 0; i < ROWS; i++) {
    const b = bikes[randInt(0, bikes.length - 1)];
    const usage_days = Math.round(rand(45, 180));
    const total_rides = Math.round(rand(Math.max(5, usage_days * 0.4), usage_days * 1.8));
    const avg_ride_duration_min = Math.round(rand(12, 60));
    const km_per_ride = rand(2.0, 9.0);
    const total_distance_km = Math.round(total_rides * km_per_ride * 10) / 10;
    const last_maintenance_days_ago = Math.max(1, Math.round(rand(5, Math.min(usage_days, 90))));
    const usage_intensity = Math.max(0.1, total_rides / Math.max(1, usage_days));
    const epsilon = randn() * 2; // Normal(0, 2)
    let next_maintenance_in_days =
      60
      - 0.05 * total_rides
      - 0.08 * total_distance_km
      - 0.3  * avg_ride_duration_min
      - 0.4  * last_maintenance_days_ago
      + 0.5  * usage_intensity
      - epsilon;
    next_maintenance_in_days = clamp(Math.round(next_maintenance_in_days * 10) / 10, 1, 120);

    docs.push({
      bike_id: b.id,
      total_rides,
      total_distance_km,
      avg_ride_duration_min,
      usage_days,
      last_maintenance_days_ago,
      usage_intensity,
      next_maintenance_in_days,
      createdAt: new Date(),
    });
  }

  // Replace collection contents
  await supCol.deleteMany({});
  if (docs.length) await supCol.insertMany(docs);

  console.log('✅ Seeded maintenance_supervised:', {
    db: dbName,
    rows: docs.length,
  });

  await client.close();
  process.exit(0);
})().catch((e) => {
  console.error('Supervised seed failed:', e);
  process.exit(1);
});


