// Usage:
//   MONGODB_URI=... MONGODB_DB=... node scripts/mongo-fix-maintenance-preds-index.js
//
// Fixes:
// - Migrates documents using 'bikelId' -> 'bikeId'
// - Deduplicates by bikeId (keeps newest by updatedAt/_id timestamp)
// - Drops incorrect unique index on 'bikelId'
// - Creates proper unique index on 'bikeId'

const { MongoClient } = require('mongodb');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

// Load env
(() => {
	const root = process.cwd();
	const local = path.join(root, '.env.local');
	if (fs.existsSync(local)) dotenv.config({ path: local });
	else dotenv.config();
})();

function toStr(x) {
	return x == null ? '' : String(x);
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
	const col = db.collection('maintenance_predictions');

	// 1) Migrate bikelId -> bikeId
	const withBikelId = await col.find({ bikelId: { $exists: true } }).toArray();
	let migrated = 0;
	for (const doc of withBikelId) {
		const bikeId = toStr(doc.bikeId || doc.bikelId);
		await col.updateOne({ _id: doc._id }, { $set: { bikeId }, $unset: { bikelId: '' } });
		migrated += 1;
	}

	// 2) Deduplicate by bikeId, keep newest
	const all = await col.find({}).toArray();
	const byBike = new Map();
	for (const doc of all) {
		const k = toStr(doc.bikeId);
		if (!k) continue;
		const arr = byBike.get(k) || [];
		arr.push(doc);
		byBike.set(k, arr);
	}
	let removed = 0;
	for (const [bikeId, docs] of byBike.entries()) {
		if (docs.length <= 1) continue;
		docs.sort((a, b) => {
			const ta = new Date(a?.updatedAt || 0).getTime() || (a?._id?.getTimestamp?.()?.getTime?.() || 0);
			const tb = new Date(b?.updatedAt || 0).getTime() || (b?._id?.getTimestamp?.()?.getTime?.() || 0);
			return tb - ta;
		});
		const keep = docs[0];
		const toRemoveIds = docs.slice(1).map(d => d._id);
		if (toRemoveIds.length) {
			await col.deleteMany({ _id: { $in: toRemoveIds } });
			removed += toRemoveIds.length;
		}
	}

	// 3) Drop wrong unique index on 'bikelId' if it exists
	try {
		const idx = await col.indexes();
		const bikelIdx = idx.find(i => i.key && i.key.bikelId === 1);
		if (bikelIdx) {
			await col.dropIndex(bikelIdx.name);
		}
	} catch (e) {
		// ignore
	}

	// 4) Ensure proper unique index on 'bikeId'
	try {
		await col.createIndex({ bikeId: 1 }, { unique: true });
	} catch (e) {
		// ignore
	}

	console.log(`✅ Fixed maintenance_predictions in ${dbName}: migrated=${migrated}, removed_dupes=${removed}`);
	await client.close();
})().catch(e => {
	console.error('Fix failed:', e);
	process.exit(1);
});


