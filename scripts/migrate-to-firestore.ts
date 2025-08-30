import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { db } from '@/lib/firebase';

// Firestore batch limit
const FIRESTORE_BATCH_LIMIT = 450;

const prisma = new PrismaClient();

async function writeInBatches<T>(
  collection: string,
  items: Array<{ id?: string } & T>
) {
  let index = 0;
  while (index < items.length) {
    const chunk = items.slice(index, index + FIRESTORE_BATCH_LIMIT);
    const batch = db.batch();
    for (const item of chunk) {
      const { id, ...rest } = item as any;
      const docRef = id
        ? db.collection(collection).doc(id)
        : db.collection(collection).doc();
      batch.set(docRef, normalizeForFirestore(rest));
    }
    await batch.commit();
    index += FIRESTORE_BATCH_LIMIT;
  }
}

function normalizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj; // admin SDK converts
  if (Array.isArray(obj)) return obj.map(normalizeForFirestore);
  if (typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v instanceof Date) {
        out[k] = v;
      } else if (v === null || v === undefined) {
        out[k] = v as any;
      } else if (Array.isArray(v)) {
        out[k] = v.map(normalizeForFirestore);
      } else if (typeof v === 'object') {
        out[k] = normalizeForFirestore(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return obj;
}

async function migrateUsers() {
  let lastId: string | undefined;
  const pageSize = 500;
  for (;;) {
    const page = await prisma.user.findMany({
      take: pageSize,
      orderBy: { id: 'asc' },
      ...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
    });
    if (page.length === 0) break;
    await writeInBatches('users', page);
    if (page.length < pageSize) break;
    lastId = page[page.length - 1].id;
  }
}

async function migrateBikes() {
  let lastId: string | undefined;
  const pageSize = 500;
  for (;;) {
    const page = await prisma.bike.findMany({
      take: pageSize,
      orderBy: { id: 'asc' },
      ...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
    });
    if (page.length === 0) break;
    await writeInBatches('bikes', page);
    if (page.length < pageSize) break;
    lastId = page[page.length - 1].id;
  }
}

async function migrateApplications() {
  let lastId: string | undefined;
  const pageSize = 500;
  for (;;) {
    const page = await prisma.bikeRentalApplication.findMany({
      take: pageSize,
      orderBy: { id: 'asc' },
      ...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
    });
    if (page.length === 0) break;
    await writeInBatches('applications', page);
    if (page.length < pageSize) break;
    lastId = page[page.length - 1].id;
  }
}

async function migrateActivityLogs() {
  let lastId: number | undefined;
  const pageSize = 500;
  for (;;) {
    const page = await prisma.activityLog.findMany({
      take: pageSize,
      orderBy: { id: 'asc' },
      ...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
    });
    if (page.length === 0) break;
    const payload = page.map(({ id, ...rest }) => ({ ...rest, legacyId: id }));
    await writeInBatches('activityLogs', payload);
    if (page.length < pageSize) break;
    lastId = page[page.length - 1].id;
  }
}

async function migrateRentalHistory() {
  let lastId: string | undefined;
  const pageSize = 500;
  for (;;) {
    const page = await prisma.rentalHistory.findMany({
      take: pageSize,
      orderBy: { id: 'asc' },
      ...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
    });
    if (page.length === 0) break;
    await writeInBatches('rentalHistory', page);
    if (page.length < pageSize) break;
    lastId = page[page.length - 1].id;
  }
}

async function migrateLeaderboard() {
  let lastId: string | undefined;
  const pageSize = 500;
  for (;;) {
    const page = await prisma.leaderboard.findMany({
      take: pageSize,
      orderBy: { id: 'asc' },
      ...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
    });
    if (page.length === 0) break;
    await writeInBatches('leaderboard', page);
    if (page.length < pageSize) break;
    lastId = page[page.length - 1].id;
  }
}

function parseOnlyArg(): Set<string> | null {
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  if (!onlyArg) return null;
  const list = onlyArg.split('=')[1]?.split(',').map(s => s.trim()).filter(Boolean) || [];
  return new Set(list);
}

async function main() {
  // Order matters for foreign keys that are denormalized as plain ids
  const only = parseOnlyArg();
  const should = (name: string) => !only || only.has(name);

  if (should('users')) await migrateUsers();
  if (should('bikes')) await migrateBikes();
  if (should('applications')) await migrateApplications();
  if (should('rentalHistory')) await migrateRentalHistory();
  if (should('activityLogs')) await migrateActivityLogs();
  if (should('leaderboard')) await migrateLeaderboard();
}

main()
  .then(() => {
    console.log('Migration complete');
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


