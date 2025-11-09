// Usage:
//   MONGODB_URI=... MONGODB_DB=... node scripts/fix-duplicate-maintenance-predictions.js
//
// What it does:
// - Finds duplicate maintenance_predictions by bikeId
// - Keeps the newest doc (by updatedAt) and deletes the rest
// - Ensures a unique index exists on bikeId

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
	const col = db.collection('maintenance_predictions');

	// Build map bikeId -> docs[]
	const all = await col.find({}).toArray();
	const byBike = new Map();
	for (const doc of all) {
		const k = String(doc.bikeId || '');
		if (!k) continue;
		const arr = byBike.get(k) || [];
		arr.push(doc);
		byBike.set(k, arr);
	}

	let removed = 0;
	for (const [bikeId, docs] of byBike.entries()) {
		if (docs.length <= 1) continue;
		// Keep newest by updatedAt (fallback to ObjectId time)
		docs.sort((a, b) => {
			const ta = new Date(a?.updatedAt || 0).getTime() || (a?._id?.getTimestamp?.()?.getTime?.() || 0);
			const tb = new Date(b?.updatedAt || 0).getTime() || (b?._id?.getTimestamp?.()?.getTime?.() || 0);
			return tb - ta;
		});
		const keep = docs[0];
		const toRemove = docs.slice(1);
		const ids = toRemove.map(d => d._id);
		if (ids.length) {
			await col.deleteMany({ _id: { $in: ids } });
			removed += ids.length;
		}
	}

	// Ensure unique index on bikeId
	try {
		await col.createIndex({ bikeId: 1 }, { unique: true });
	} catch (e) {
		// ignore if already exists
	}

	console.log(`✅ Dedup complete for maintenance_predictions in ${dbName}. Removed: ${removed}`);
	await client.close();
})().catch(e => {
	console.error('Dedup failed:', e);
	process.exit(1);
});


