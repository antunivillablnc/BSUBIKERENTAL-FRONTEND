import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/firebase';

async function upsertAdmin() {
  const email = 'sdobsulipa@g.batstate-u.edu.ph';
  const password = 'sdobikerentallipa';
  const role = 'admin';
  const name = 'Admin User';

  const snap = await db.collection('users').where('email', '==', email).limit(1).get();
  if (!snap.empty) {
    console.log('Admin user already exists.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.collection('users').add({
    email,
    password: passwordHash,
    role,
    name,
    createdAt: new Date(),
  });
  console.log('Admin user created.');
}

async function seedBikes() {
  const bikes = Array.from({ length: 50 }).map((_, i) => ({
    name: `BSU ${String(i + 1).padStart(3, '0')}`,
    status: 'available',
    createdAt: new Date(),
  }));

  const existing = await db.collection('bikes').get();
  if (!existing.empty) {
    console.log('Bikes already exist, skipping.');
    return;
  }

  const batch = db.batch();
  const ref = db.collection('bikes');
  for (const bike of bikes) {
    batch.set(ref.doc(), bike);
  }
  await batch.commit();
  console.log('Bikes seeded.');
}

async function main() {
  await upsertAdmin();
  await seedBikes();
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});


