import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const apps = getApps();
let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
// Fallback: derive projectId from ADC JSON if available
if (!projectId && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    const raw = fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.project_id) projectId = parsed.project_id as string;
  } catch {
    // ignore
  }
}
export const firebaseApp = apps.length
  ? apps[0]
  : initializeApp({
      credential: process.env.FIREBASE_PRIVATE_KEY
        ? cert({
            projectId: process.env.FIREBASE_PROJECT_ID!,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
            privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
          })
        : applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });

    export const db = getFirestore(firebaseApp);