// Usage:
//   1) Ensure .env.local (or env) has:
//        MONGODB_URI=your_atlas_uri
//        MONGODB_DB=your_db_name
//   2) node scripts/seed-mongo-maintenance-metrics.js
//
// What this does:
// - Upserts bikes named "BSU 001".."BSU 020" (if they don't exist)
// - Seeds maintenance_predictions with plausible values
// - Writes maintenance_model with a demo-friendly metrics object
//
// Notes:
// - This is intended for demos only. Do not use fabricated metrics for production evaluation.

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

function bsuName(i) {
	return `BSU ${String(i).padStart(3, '0')}`;
}

(async () => {
	const uri = process.env.MONGODB_URI;
	if (!uri) {
		console.error('MONGODB_URI not set');
		process.exit(1);
	}
	const dbName =
		process.env.MONGODB_DB ||
		(uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i)?.[1]) ||
		'bikerental';

	const client = new MongoClient(uri);
	await client.connect();
	const db = client.db(dbName);

	const bikesCol = db.collection('bikes');
	const predsCol = db.collection('maintenance_predictions');
	const modelCol = db.collection('maintenance_model');

	// Helpful indexes
	await bikesCol.createIndex({ name: 1 }, { unique: true }).catch(() => {});
	await predsCol.createIndex({ bikeId: 1 }, { unique: true }).catch(() => {});

	// 1) Ensure bikes exist: BSU 001..BSU 020
	const bikes = [];
	for (let i = 1; i <= 20; i++) {
		const name = bsuName(i);
		const res = await bikesCol.findOneAndUpdate(
			{ name },
			{ $setOnInsert: { name } },
			{ upsert: true, returnDocument: 'after' }
		);
		const doc = res.value || (await bikesCol.findOne({ name }));
		bikes.push({ id: String(doc._id), name });
	}

	// 2) Seed predictions (keep values plausible and varied)
	const nowIso = new Date().toISOString();
	const bulk = [];
	for (let i = 0; i < bikes.length; i++) {
		const b = bikes[i];
		const base = 60 + i * 3.5; // increasing risk across bikes
		const noise = Math.max(0, Math.round((Math.random() - 0.3) * 8));
		const predictedKmUntilMaintenance = Math.max(10, Math.round((base + noise) * 100) / 100);
		bulk.push({
			updateOne: {
				filter: { bikeId: b.id },
				update: {
					$set: {
						bikeId: b.id,
						predictedKmUntilMaintenance,
						updatedAt: nowIso,
						// Optional convenience for UIs that display name when mapping is missing:
						_bikeName: b.name,
					},
				},
				upsert: true,
			},
		});
	}
	if (bulk.length) await predsCol.bulkWrite(bulk);

	// 3) Seed a demo metrics document with lower RMSE (consistent: rmse = sqrt(mse))
	const mse = 36; // adjust for desired demo RMSE (sqrt(36)=6)
	const metrics = {
		mae: 4.5,
		mse,
		rmse: Math.sqrt(mse),
		r2: 0.93,
		updatedAt: nowIso,
	};
	await modelCol.updateOne(
		{ _id: 'current' },
		{ $set: { metrics } },
		{ upsert: true }
	);

	console.log('✅ Seeded Mongo maintenance demo data:', {
		db: dbName,
		bikes: bikes.length,
		predictions: bulk.length,
		metrics,
	});

	await client.close();
})().catch((e) => {
	console.error('Seed failed:', e);
	process.exit(1);
});


