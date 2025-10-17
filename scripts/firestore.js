const admin = require('firebase-admin');

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
  } else {
    console.log('Running example queries...');
    console.log('Available commands:');
    console.log('  node scripts/firestore.js delete-applications  - Delete all applications');
    console.log('');
    console.log('Example queries completed successfully');
    process.exit(0);
  }
}