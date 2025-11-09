// Usage:
//   MONGODB_URI=... MONGODB_DB=... node scripts/mongo-drop-bikelId-index.js
//
// Force-drop any index named 'bikelId_1' or whose key includes { bikelId: 1 }
// Then ensure a proper unique index exists on { bikeId: 1 } (sparse: false).

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

	const indexes = await col.indexes();
	let dropped = 0;
	for (const idx of indexes) {
		if (idx.name === 'bikelId_1' || (idx.key && Object.prototype.hasOwnProperty.call(idx.key, 'bikelId'))) {
			try {
				await col.dropIndex(idx.name);
				dropped += 1;
			} catch (e) {
				console.warn('dropIndex failed for', idx.name, e?.message || e);
			}
		}
	}

	// Ensure correct unique index on bikeId
	try {
		await col.createIndex({ bikeId: 1 }, { unique: true });
	} catch {}

	console.log(`✅ Index cleanup complete on ${dbName}. Dropped bikelId indexes: ${dropped}`);
	await client.close();
})().catch(e => {
	console.error('Index cleanup failed:', e);
	process.exit(1);
});


