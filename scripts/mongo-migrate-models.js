// Usage:
//   MONGODB_URI=... MONGODB_DB=... node scripts/mongo-migrate-models.js
//
// Migrates any Mongo 'maintenance_models' (plural) docs into the
// singular 'maintenance_model' collection, picking the latest metrics,
// then drops the plural collection to avoid future confusion.

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

	const plural = db.collection('maintenance_models');
	const singular = db.collection('maintenance_model');

	let migrated = 0;
	try {
		const hasPlural = await plural.countDocuments({});
		if (hasPlural > 0) {
			const docs = await plural.find({}).toArray();
			// Take the latest doc by metrics.updatedAt or createdAt
			docs.sort((a, b) => {
				const ta = new Date(a?.metrics?.updatedAt || a?.createdAt || 0).getTime();
				const tb = new Date(b?.metrics?.updatedAt || b?.createdAt || 0).getTime();
				return tb - ta;
			});
			const latest = docs[0];
			if (latest?.metrics) {
				await singular.updateOne(
					{ key: 'current' },
					{ $set: { metrics: latest.metrics, migratedFromPluralAt: new Date().toISOString() } },
					{ upsert: true }
				);
				migrated = 1;
			}
			// Drop old collection to prevent future writes there being read mistakenly
			await plural.drop().catch(() => {});
		}
	} catch (e) {
		console.warn('Migration encountered an issue:', e?.message || e);
	}

	console.log(`✅ Mongo models migration complete on ${dbName}. Migrated: ${migrated}`);
	await client.close();
	process.exit(0);
})().catch((e) => {
	console.error('Migration failed:', e);
	process.exit(1);
});


