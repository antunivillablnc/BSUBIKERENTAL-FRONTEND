import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Initialize client-side Firebase app for Realtime Database usage
const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
    });

export const rtdb = getDatabase(app);


