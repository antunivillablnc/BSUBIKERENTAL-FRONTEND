// Seed minimal data to light up the hybrid weekly forecast card
//
// Usage (from project root):
//   1) Put MONGODB_URI and MONGODB_DB in .env.local (root)
//      MONGODB_URI=your_atlas_uri
//      MONGODB_DB=BSUbikerental
//   2) Run:  node scripts/seed-forecast-demo.js
//   (Optional PowerShell override)
//      $env:MONGODB_URI="YOUR_ATLAS_URI"; $env:MONGODB_DB="BSUbikerental"; node scripts/seed-forecast-demo.js
//
// What it does:
// - Ensures bikes BSU 001..BSU 005 exist
// - Adds recent rides so weekly usage ≈ 20 km/week (dist30 ≈ 80)
// - Adds ~10 weeks of reported_issues as historical signal for Prophet
// - Writes maintenance_predictions so some bikes become "at risk" in NEXT MONTH buckets

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

function weekStartMonday(dt) {
  const d = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
  const dow = d.getUTCDay(); // 0..6 Sun..Sat
  const diff = (dow + 6) % 7; // Monday=0
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  const dbName = process.env.MONGODB_DB || (uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i)?.[1]) || 'bikerental';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const bikesCol = db.collection('bikes');
  const ridesCol = db.collection('analytical_data');
  const issuesCol = db.collection('reported_issues');
  const predsCol = db.collection('maintenance_predictions');

  // 1) Bikes
  const names = ['BSU 001', 'BSU 002', 'BSU 003', 'BSU 004', 'BSU 005'];
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

  // 2) Recent rides for dist30 ≈ 80 → weekly ≈ 20
  const today = new Date();
  const rideDocs = [];
  for (const b of bikes) {
    for (let i = 1; i <= 8; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - (i * 3)); // every ~3 days
      rideDocs.push({
        bike_name: b.name,
        ride_date: d,
        distance_km: 10,
        duration_min: 40,
        avg_speed_kmh: 15,
      });
    }
  }
  if (rideDocs.length) await ridesCol.insertMany(rideDocs);

  // 3) Weekly issues for the last ~10 weeks as Prophet signal
  const issues = [];
  for (let w = 10; w >= 1; w--) {
    const d = new Date(today);
    d.setDate(d.getDate() - w * 7);
    // 2–4 issues per week
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const b = bikes[(w + i) % bikes.length];
      issues.push({
        subject: 'seeded issue',
        message: 'seeded',
        category: 'other',
        priority: 'low',
        status: 'open',
        reportedBy: 'system',
        reportedAt: new Date(d),
        bikeId: b.id,
      });
    }
  }
  if (issues.length) await issuesCol.insertMany(issues);

  // 4) Predictions landing in next month weeks
  const baseWeek = weekStartMonday(today);
  const firstNextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  const firstAfter = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 2, 1));
  const weekStartsNextMonth = [];
  for (let d = weekStartMonday(firstNextMonth); d < firstAfter; d = new Date(d.getTime() + 7 * 86400_000)) {
    weekStartsNextMonth.push(new Date(d));
  }
  if (weekStartsNextMonth.length === 0) weekStartsNextMonth.push(firstNextMonth);

  // weeklyKm ≈ 20; predictedKm = weeksTo * 20 (ensure >0)
  const ops = [];
  for (let i = 0; i < Math.min(bikes.length, weekStartsNextMonth.length); i++) {
    const b = bikes[i];
    const wk = weekStartsNextMonth[i];
    const weeksTo = Math.max(0, Math.round((wk.getTime() - baseWeek.getTime()) / (7 * 86400_000)));
    const predictedKmUntilMaintenance = Math.max(10, weeksTo * 20);
    ops.push({
      updateOne: {
        filter: { _id: b.id }, // prediction doc id == bikeId (string)
        update: { $set: { bikeId: b.id, predictedKmUntilMaintenance, updatedAt: new Date().toISOString() } },
        upsert: true,
      },
    });
  }
  if (ops.length) await predsCol.bulkWrite(ops);

  console.log('Seeded forecast demo:', {
    db: dbName,
    bikes: bikes.length,
    rideDocs: rideDocs.length,
    issues: issues.length,
    preds: ops.length,
  });

  await client.close();
})();


