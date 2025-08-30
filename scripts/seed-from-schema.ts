import 'dotenv/config';
import { db } from '@/lib/firebase';
import bcrypt from 'bcryptjs';

function randomId() {
  return cryptoRandomId();
}

function cryptoRandomId() {
  // Simple UUID v4-ish; Firestore can generate IDs but we keep explicit for links
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function seedUsers() {
  const adminEmail = 'sdobsulipa@g.batstate-u.edu.ph';
  const adminSnap = await db.collection('users').where('email', '==', adminEmail).limit(1).get();
  if (adminSnap.empty) {
    const password = await bcrypt.hash('sdobikerentallipa', 10);
    await db.collection('users').add({
      email: adminEmail,
      password,
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date(),
    });
  }

  const sampleUserEmail = 'user1@example.com';
  const userSnap = await db.collection('users').where('email', '==', sampleUserEmail).limit(1).get();
  if (userSnap.empty) {
    const password = await bcrypt.hash('password123', 10);
    await db.collection('users').add({
      email: sampleUserEmail,
      password,
      name: 'Sample User',
      role: 'student',
      createdAt: new Date(),
    });
  }
}

async function seedBikes() {
  const bikesSnap = await db.collection('bikes').limit(1).get();
  if (!bikesSnap.empty) return; // already seeded
  const batch = db.batch();
  const ref = db.collection('bikes');
  for (let i = 1; i <= 10; i++) {
    batch.set(ref.doc(), {
      name: `BSU ${String(i).padStart(3, '0')}`,
      plateNumber: null,
      amenities: [],
      latitude: null,
      longitude: null,
      status: 'available',
      createdAt: new Date(),
    });
  }
  await batch.commit();
}

async function seedApplications() {
  // pick one user and one bike
  const userSnap = await db.collection('users').where('role', '==', 'student').limit(1).get();
  const bikeSnap = await db.collection('bikes').limit(1).get();
  if (userSnap.empty || bikeSnap.empty) return;
  const user = { id: userSnap.docs[0].id, ...userSnap.docs[0].data() } as any;
  const bike = { id: bikeSnap.docs[0].id, ...bikeSnap.docs[0].data() } as any;

  const exists = await db.collection('applications')
    .where('userId', '==', user.id)
    .limit(1)
    .get();
  if (!exists.empty) return;

  await db.collection('applications').add({
    lastName: 'User',
    firstName: 'Sample',
    middleName: null,
    srCode: 'SR123456',
    sex: 'M',
    dateOfBirth: new Date('2000-01-01'),
    phoneNumber: '09123456789',
    email: user.email,
    collegeProgram: null,
    college: null,
    program: null,
    gwaLastSemester: null,
    extracurricularActivities: null,
    houseNo: '123',
    streetName: 'Main St',
    barangay: 'Barangay 1',
    municipality: 'City',
    province: 'Province',
    distanceFromCampus: '2km',
    familyIncome: 'Low',
    intendedDuration: '1 month',
    intendedDurationOther: null,
    bikeId: bike.id,
    certificatePath: null,
    gwaDocumentPath: null,
    ecaDocumentPath: null,
    itrDocumentPath: null,
    status: 'approved',
    dueDate: null,
    assignedAt: new Date(),
    userId: user.id,
    createdAt: new Date(),
  });
}

async function seedLeaderboard() {
  const snap = await db.collection('leaderboard').limit(1).get();
  if (!snap.empty) return;
  await db.collection('leaderboard').add({
    name: 'Sample User',
    distanceKm: 10,
    co2SavedKg: 2,
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function seedActivityLogs() {
  const snap = await db.collection('activityLogs').limit(1).get();
  if (!snap.empty) return;
  await db.collection('activityLogs').add({
    type: 'Seed',
    adminName: 'Seeder',
    adminEmail: 'admin@example.com',
    description: 'Seeded initial data',
    createdAt: new Date(),
  });
}

async function seedRentalHistory() {
  const appSnap = await db.collection('applications').orderBy('createdAt', 'desc').limit(1).get();
  if (appSnap.empty) return;
  const application: any = { id: appSnap.docs[0].id, ...appSnap.docs[0].data() };
  await db.collection('rentalHistory').add({
    applicationId: application.id,
    userId: application.userId,
    bikeId: application.bikeId,
    startDate: application.assignedAt ?? application.createdAt,
    endDate: new Date(),
    createdAt: new Date(),
  });
}

async function main() {
  await seedUsers();
  await seedBikes();
  await seedApplications();
  await seedLeaderboard();
  await seedActivityLogs();
  await seedRentalHistory();
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});


