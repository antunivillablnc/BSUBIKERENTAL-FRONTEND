// Usage:
//   Ensure .env.local has Firebase admin creds and RTDB URL + Mongo URI/DB
//   node scripts/sync-maintenance-rtdb.js
//
// Copies metrics from Mongo maintenance_model and predictions from
// maintenance_predictions into Firebase Realtime Database at:
//   maintenance/model
//   maintenance/predictions

const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');
const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// Load env
(() => {
	const root = process.cwd();
	const local = path.join(root, '.env.local');
	if (fs.existsSync(local)) dotenv.config({ path: local });
	else dotenv.config();
})();

function buildCredential() {
	const json = process.env.FIREBASE_CREDENTIALS_JSON;
	if (json) {
		try {
			const decoded = json.trim().startsWith('{') ? json : Buffer.from(json, 'base64').toString('utf8');
			const parsed = JSON.parse(decoded);
			return cert({
				projectId: parsed.project_id,
				clientEmail: parsed.client_email,
				privateKey: parsed.private_key,
			});
		} catch {
			// fallthrough to key pair
		}
	}
	if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
		return cert({
			projectId: process.env.FIREBASE_PROJECT_ID,
			clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
			privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
		});
	}
	return applicationDefault();
}

(async () => {
	const uri = process.env.MONGODB_URI;
	if (!uri) throw new Error('MONGODB_URI not set');
	const dbName =
		process.env.MONGODB_DB ||
		(uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i)?.[1]) ||
		'bikerental';

	const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
	if (!databaseURL) throw new Error('NEXT_PUBLIC_FIREBASE_DATABASE_URL not set');

	// Init Firebase RTDB
	initializeApp({ credential: buildCredential(), databaseURL });
	const rtdb = getDatabase();

	// Read Mongo
	const client = new MongoClient(uri);
	await client.connect();
	const mdb = client.db(dbName);

	// Pick latest metrics by metrics.updatedAt
	const arr = await mdb.collection('maintenance_model').find({}).toArray();
	const latest = arr && arr.length ? arr.sort((a, b) => {
		const ta = new Date(a?.metrics?.updatedAt || 0).getTime();
		const tb = new Date(b?.metrics?.updatedAt || 0).getTime();
		return tb - ta;
	})[0] : null;
	const metrics = latest?.metrics || null;
	if (!metrics) {
		console.warn('No metrics found in maintenance_model; continuing with null');
	}

	// Gather predictions
	const predsDocs = await mdb.collection('maintenance_predictions').find({}).toArray();
	const predsObject = {};
	for (const d of predsDocs) {
		const bikeId = String(d.bikeId || d._id || '');
		if (!bikeId) continue;
		predsObject[bikeId] = {
			bikeId,
			predictedKmUntilMaintenance: Number(d.predictedKmUntilMaintenance || 0),
			updatedAt: (d.updatedAt || new Date().toISOString()).toString(),
		};
	}

	// Write to RTDB
	await rtdb.ref('maintenance/model').set({
		metrics,
		syncedAt: new Date().toISOString(),
		source: 'mongo',
	});
	await rtdb.ref('maintenance/predictions').set(predsObject);

	console.log('✅ Synced Mongo → RTDB:', {
		metricsRmse: metrics?.rmse,
		predictionCount: Object.keys(predsObject).length,
	});

	await client.close();
	process.exit(0);
})().catch((e) => {
	console.error('Sync failed:', e);
	process.exit(1);
});


