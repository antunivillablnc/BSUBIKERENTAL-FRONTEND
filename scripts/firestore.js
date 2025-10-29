const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
let csv;

// Initialize Firebase Admin SDK (same as your lib/firebase.ts)
let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;

function buildCredential() {
  // 1) JSON blob or base64-encoded JSON in FIREBASE_CREDENTIALS_JSON
  const json = process.env.FIREBASE_CREDENTIALS_JSON;
  if (json) {
    try {
      const decoded = json.trim().startsWith('{') ? json : Buffer.from(json, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (!projectId && parsed.project_id) projectId = parsed.project_id;
      return admin.credential.cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      });
    } catch {
      // fallthrough
    }
  }
  // 2) Explicit env triple
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    return admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }
  // 3) Fall back to ADC
  return admin.credential.applicationDefault();
}

const apps = admin.apps;
const firebaseApp = apps.length
  ? apps[0]
  : admin.initializeApp({
      credential: buildCredential(),
      ...(projectId ? { projectId } : {}),
    });

const db = admin.firestore();

// Export for use in other scripts
module.exports = { db, admin };

// Function to delete all documents in a collection
async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const batchSize = 100; // Process in batches to avoid memory issues

  console.log(`Starting deletion of all documents in '${collectionName}' collection...`);

  try {
    let deletedCount = 0;

    // Get all documents in batches
    while (true) {
      const snapshot = await collectionRef.limit(batchSize).get();

      if (snapshot.empty) {
        break;
      }

      // Delete documents in this batch
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deletedCount += snapshot.docs.length;

      console.log(`Deleted ${snapshot.docs.length} documents (total: ${deletedCount})`);

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Successfully deleted ${deletedCount} documents from '${collectionName}' collection`);
    return deletedCount;

  } catch (error) {
    console.error(`❌ Error deleting collection '${collectionName}':`, error);
    throw error;
  }
}

// Function to delete all applications
async function deleteAllApplications() {
  await deleteCollection('applications'); // ← Change 'applications' to your actual collection name if different
}

// Function to delete all applications
async function deleteAllBikes() {
  await deleteCollection('bikes'); // ← Change 'applications' to your actual collection name if different
}

async function deleteAllRentalHistory() {
  await deleteCollection('rentalHistory'); // ← Change 'applications' to your actual collection name if different
}

// Function to delete all analytical_data
async function deleteAllAnalyticalData() {
  await deleteCollection('analytical_data');
}

// Initialize analytical_data collection with a meta document
async function initAnalyticalData() {
  const metaRef = db.collection('analytical_data').doc('meta');
  await metaRef.set(
    {
      initialized: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      note: 'Initialized analytical_data collection via scripts/firestore.js',
    },
    { merge: true }
  );

  // Optional: add an example document to confirm writes
  const exampleRef = db.collection('analytical_data').doc();
  await exampleRef.set({
    type: 'example',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("✅ 'analytical_data' collection initialized (docs: meta, example)");
}

// Generic CSV → Firestore importer
async function importCsvToCollection(filePath, collectionName, transformRow, options = {}) {
  const batchLimit = options.batchSize || 400; // keep under 500
  if (!csv) {
    try {
      csv = require('csv-parser');
    } catch (e) {
      console.error("csv-parser is not installed. Run: npm i csv-parser");
      throw e;
    }
  }

  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`CSV file not found: ${abs}`);
  }

  let committed = 0;
  let batch = db.batch();
  let inBatch = 0;

  function resetBatch() {
    batch = db.batch();
    inBatch = 0;
  }

  async function maybeCommitBatch() {
    if (inBatch >= batchLimit) {
      await batch.commit();
      committed += inBatch;
      resetBatch();
      console.log(`Committed ${committed} doc(s) so far...`);
    }
  }

  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(abs).pipe(csv());

    stream.on('data', (row) => {
      stream.pause();
      try {
        const data = transformRow(row);
        // Prefer ride_id as a stable doc id when present; otherwise, generate a deterministic fallback key
        const ridRaw = (row.ride_id ?? row.rideId ?? row.id ?? '').toString().trim();
        let ref;
        if (ridRaw) {
          ref = db.collection(collectionName).doc(ridRaw);
        } else {
          const parts = [row.bike_id ?? '', row.ride_date ?? '', row.distance_km ?? '', row.duration_min ?? '']
            .map(v => String(v ?? '').trim());
          const fallbackKey = parts.join('|') || `auto_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          ref = db.collection(collectionName).doc(fallbackKey);
        }
        batch.set(ref, data, { merge: true });
        inBatch += 1;
        maybeCommitBatch().then(() => stream.resume()).catch(reject);
      } catch (e) {
        reject(e);
      }
    });

    stream.on('end', async () => {
      try {
        if (inBatch > 0) {
          await batch.commit();
          committed += inBatch;
        }
        console.log(`✅ Done. Imported ${committed} document(s) into '${collectionName}'.`);
        resolve();
      } catch (e) {
        reject(e);
      }
    });

    stream.on('error', reject);
  });
}

// Transformer for CSV with bike_id
function transformAnalyticalWithBikeIdRow(row) {
  const parseNum = (v) => {
    if (v === undefined || v === null || String(v).trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  function parseDateFlexible(v) {
    const s = (v || '').toString().trim();
    if (!s) return null;
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const day = Number(m[1]);
      const mon = Number(m[2]) - 1;
      const year = Number(m[3].length === 2 ? ('20' + m[3]) : m[3]);
      const dt = new Date(year, mon, day);
      return Number.isFinite(dt.getTime()) ? dt : null;
    }
    const dt = new Date(s);
    return Number.isFinite(dt.getTime()) ? dt : null;
  }

  const rideDate = parseDateFlexible(row.ride_date);

  // Support bike_name by extracting a numeric identifier, keep original label
  const rawBikeName = (row.bike_name || row.bike || '').toString().trim();
  const numFromNameMatch = rawBikeName.match(/(\d+)/);
  const bikeNumFromName = numFromNameMatch ? Number(numFromNameMatch[1]) : null;
  const csvBikeId = parseNum(row.bike_id);
  const resolvedBikeId = csvBikeId != null ? csvBikeId : bikeNumFromName;

  return {
    // Ensure ride_id is preserved as the logical identifier of a row (not bike_id)
    ride_id: parseNum(row.ride_id),
    // Map to a numeric bike identifier derived from bike_id or bike_name digits
    bike_id: resolvedBikeId,
    bike_name: rawBikeName || null,
    ride_date: rideDate || null,
    distance_km: parseNum(row.distance_km),
    duration_min: parseNum(row.duration_min),
    avg_speed_kmh: parseNum(row.avg_speed_kmh),
    co2_saved_kg: parseNum(row.co2_saved_kg),
    calories_burned_kcal: parseNum(row.calories_burned_kcal),
    // convenience derived fields
    duration_sec: (() => {
      const m = parseNum(row.duration_min);
      return m == null ? null : Math.round(m * 60);
    })(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    source: 'csv:analytical_with_bike_id',
  };
}

async function importAnalyticalCsvWithBikeId(filePath) {
  await importCsvToCollection(filePath, 'analytical_data', transformAnalyticalWithBikeIdRow, { batchSize: 400 });
}

// Seed rental history for specific users with random completed rentals
async function seedRentalHistoryForUsers() {
  const targetNames = [
    'Anthony Villablanca',
    'Brian Neil Babasa',
    'Adrian Camota',
    'Teaching',
    'non teaching',
  ].map((s) => s.toLowerCase());

  const colleges = [
    'College of Informatics and Computing Sciences (CICS)',
    'College of Nursing (CON)',
    'College of Education (COE)',
    'College of Arts and Sciences (CAS)',
    'College of Engineering (CEN)',
    'College of Business Administration (CBA)',
  ];

  const usersSnap = await db.collection('users').get();
  const allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Always seed all users; names list is only used for logging/verification
  const namedUsers = allUsers.filter((u) => (u.name || '').toLowerCase && targetNames.includes((u.name || '').toLowerCase()));
  const users = allUsers;
  const missingNamed = targetNames.filter((n) => !allUsers.some((u) => ((u.name || '').toLowerCase && (u.name || '').toLowerCase() === n)));
  console.log(`Seeding rental history for ALL users (${users.length}). Matched named users: ${namedUsers.length}. Missing from users collection: ${missingNamed.join(', ') || 'none'}.`);

  const bikesSnap = await db.collection('bikes').get();
  const bikes = bikesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  let created = 0;
  const batchSize = 400; // commit in chunks
  let batch = db.batch();
  let batchCount = 0;

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  for (const user of users) {
    const countForUser = randomBetween(1, 3);
    for (let i = 0; i < countForUser; i++) {
      const daysAgoStart = randomBetween(1, 90);
      const start = new Date();
      start.setDate(start.getDate() - daysAgoStart);
      start.setHours(randomBetween(7, 20), randomBetween(0, 59), randomBetween(0, 59), 0);
      const end = new Date(start.getTime() + randomBetween(30, 60 * 24 * 7) * 60 * 1000); // 30 minutes to 7 days later
      const createdAt = new Date(start.getTime() + randomBetween(0, Math.max(1, (end.getTime() - start.getTime()) / 2)));

      const bike = bikes.length > 0 ? bikes[randomBetween(0, bikes.length - 1)] : null;
      const bikeId = bike ? bike.id : null;
      const bikeName = bike ? bike.name || null : null;
      const college = colleges[randomBetween(0, colleges.length - 1)];

      // optional: link to any existing application for this user (if present)
      let applicationId = null;
      try {
        const appSnap = await db.collection('applications').where('userId', '==', user.id).limit(1).get();
        applicationId = appSnap.empty ? null : appSnap.docs[0].id;
      } catch (_) {
        applicationId = null;
      }

      const ref = db.collection('rentalHistory').doc();
      batch.set(ref, {
        applicationId,
        userId: user.id,
        bikeId,
        bikeName,
        college, // stored on history; backend prefers app/user college but falls back when needed
        startDate: start,
        endDate: end,
        createdAt,
      });
      created++;
      batchCount++;
      if (batchCount >= batchSize) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
  console.log(`✅ Seeded ${created} rental history records for ${users.length} user(s).`);
  return created;
}

// If this file is run directly, execute example queries
if (require.main === module) {
  require('dotenv').config({ path: '.env.local' });

  // Check for command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'delete-applications') {
    console.log('🚨 WARNING: You are about to delete ALL applications from Firestore!');
    console.log('This action cannot be undone. All application data will be permanently lost.');
    console.log('');

    // In a real scenario, you might want to add a confirmation prompt here
    // For now, we'll proceed (remove this check in production if you want auto-execution)

    deleteAllApplications()
      .then(() => {
        console.log('✅ All applications deleted successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Failed to delete applications:', error);
        process.exit(1);
      });
  } else if (command === 'delete-bikes') {
    console.log('🚨 WARNING: You are about to delete ALL bikes from Firestore!');
    console.log('This action cannot be undone. All bike data will be permanently lost.');
    console.log('');

    deleteAllBikes()
      .then(() => {
        console.log('✅ All bikes deleted successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Failed to delete bikes:', error);
        process.exit(1);
      });
  }else if (command === 'delete-rental-history') {
    console.log('🚨 WARNING: You are about to delete ALL rental history from Firestore!');
    console.log('This action cannot be undone. All rental history will be permanently lost.');
    console.log('');

    deleteAllRentalHistory()
      .then(() => {
        console.log('✅ All rental history deleted successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Failed to delete rental history:', error);
        process.exit(1);
      });
  } else if (command === 'delete-analytical-data') {
    console.log('🚨 WARNING: You are about to delete ALL analytical_data from Firestore!');
    console.log('This action cannot be undone. All analytical rows will be permanently lost.');
    console.log('');

    deleteAllAnalyticalData()
      .then(() => {
        console.log('✅ All analytical_data deleted successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Failed to delete analytical_data:', error);
        process.exit(1);
      });
  } else if (command === 'init-analytical-data') {
    initAnalyticalData()
      .then(() => {
        console.log("✅ 'analytical_data' collection created/updated successfully");
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Failed to initialize analytical_data:', error);
        process.exit(1);
      });
  } else if (command === 'import-analytical-csv') {
    const fileArg = (args.find(a => a.startsWith('--file=')) || '').split('=')[1];
    const defaultPath = 'C:/Users/Anthony/Downloads/Analytical_data.csv';
    const filePath = fileArg || defaultPath;
    console.log(`Importing analytical CSV from: ${filePath}`);
    importAnalyticalCsvWithBikeId(filePath)
      .then(() => {
        console.log("✅ Analytical CSV import completed");
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Failed to import analytical CSV:', error);
        process.exit(1);
      });
  } else if (command === 'seed-rental-history') {
    seedRentalHistoryForUsers()
      .then((count) => {
        console.log(`✅ Done seeding rental history (${count} records).`);
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Failed to seed rental history:', error);
        process.exit(1);
      });
  } else {
    console.log('Running example queries...');
    console.log('Available commands:');
    console.log('  node scripts/firestore.js delete-applications  - Delete all applications');
    console.log('  node scripts/firestore.js delete-analytical-data  - Delete all analytical_data');
    console.log("  node scripts/firestore.js init-analytical-data  - Create 'analytical_data' collection with sample docs");
    console.log('  node scripts/firestore.js import-analytical-csv --file=PATH  - Import analytical CSV into analytical_data');
    console.log('');
    console.log('Example queries completed successfully');
    process.exit(0);
  }
}