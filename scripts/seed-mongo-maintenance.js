// Usage:
//   npm i mongodb
//   MONGODB_URI="your_atlas_uri" MONGODB_DB="BSUbikerental" node scripts/seed-mongo-maintenance.js
// Tunables via env (optional): SEED_BIKES=3 SEED_DAYS=35 SEED_RIDE_PROB=0.55

const { MongoClient } = require('mongodb');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

// Load env from .env.local if present, else .env
(() => {
  const root = process.cwd();
  const local = path.join(root, '.env.local');
  if (fs.existsSync(local)) dotenv.config({ path: local });
  else dotenv.config();
})();

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  const dbName = process.env.MONGODB_DB || (uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i)?.[1]) || 'bikerental';

  const BIKES = Number(process.env.SEED_BIKES || 3);
  const DAYS = Number(process.env.SEED_DAYS || 35);
  const RIDE_PROB = Number(process.env.SEED_RIDE_PROB || 0.55);

  const names = Array.from({ length: BIKES }, (_, i) => `Roadster ${String.fromCharCode(65 + i)}`);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const bikesCol = db.collection('bikes');
  const ridesCol = db.collection('analytical_data');
  const issuesCol = db.collection('reported_issues');

  // Helpful small indexes
  await bikesCol.createIndex({ name: 1 }, { unique: true }).catch(() => {});
  await ridesCol.createIndex({ ride_date: 1 }).catch(() => {});
  await issuesCol.createIndex({ bikeId: 1, reportedAt: 1 }).catch(() => {});

  // Upsert bikes
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

  // Seed recent rides
  const rides = [];
  const today = new Date();
  for (const b of bikes) {
    for (let d = DAYS; d >= 1; d--) {
      if (Math.random() > RIDE_PROB) continue;
      const date = new Date(today);
      date.setDate(today.getDate() - d);

      const distance = Math.round((6 + Math.random() * 18) * 10) / 10; // 6–24 km
      const duration = Math.max(15, Math.round((distance / (14 + Math.random() * 8)) * 60));
      const avg = Math.round((distance / (duration / 60)) * 10) / 10;

      rides.push({
        bike_name: b.name,
        ride_date: date,
        distance_km: distance,
        duration_min: duration,
        avg_speed_kmh: Number.isFinite(avg) ? avg : 16,
      });
    }
  }
  if (rides.length) await ridesCol.insertMany(rides);

  // Seed 2 issues per bike
  const issues = [];
  for (const b of bikes) {
    const i1 = new Date(today); i1.setDate(today.getDate() - Math.max(10, Math.floor(DAYS * 0.6)));
    const i2 = new Date(today); i2.setDate(today.getDate() - Math.max(3, Math.floor(DAYS * 0.2)));
    issues.push({ bikeId: b.id, reportedAt: i1 });
    issues.push({ bikeId: b.id, reportedAt: i2 });
  }
  if (issues.length) await issuesCol.insertMany(issues);

  console.log('Maintenance seed complete:', {
    db: dbName,
    bikes: bikes.length,
    rides: rides.length,
    issues: issues.length,
  });

  await client.close();
})().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});


