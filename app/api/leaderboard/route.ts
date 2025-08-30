import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

// GET /api/leaderboard?limit=10
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.max(1, Math.min(100, Number(limitParam) || 10));
    // Optional backfill: ensure every non-admin user has a leaderboard row (best-effort)
    try {
      const usersSnap = await db.collection('users').get();
      const users = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(u => (u.role || '').toLowerCase() !== 'admin');
      const existingSnap = await db.collection('leaderboard').select('userId').get();
      const existingSet = new Set(existingSnap.docs.map(d => (d.data() as any).userId || ''));
      const toCreate = users.filter(u => !existingSet.has(u.id));
      if (toCreate.length) {
        const batch = db.batch();
        toCreate.forEach(u => {
          const ref = db.collection('leaderboard').doc();
          batch.set(ref, {
            userId: u.id,
            name: u.name || u.email,
            distanceKm: 0,
            co2SavedKg: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        });
        await batch.commit();
      }
    } catch {
      // ignore best-effort errors
    }

    // Fetch and sort in memory to avoid composite index requirements
    const snap = await db
      .collection('leaderboard')
      .orderBy('distanceKm', 'desc')
      .get();
    const entries = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .sort((a, b) => {
        if (b.distanceKm !== a.distanceKm) return b.distanceKm - a.distanceKm;
        if (b.co2SavedKg !== a.co2SavedKg) return b.co2SavedKg - a.co2SavedKg;
        const ad = (a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0)) as Date;
        const bd = (b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0)) as Date;
        return bd.getTime() - ad.getTime();
      })
      .slice(0, limit);

    return NextResponse.json({ success: true, entries });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/leaderboard
// { name: string, distanceKm: number, co2SavedKg: number, userId?: string }
export async function POST(req: Request) {
  try {
    const { name, distanceKm, co2SavedKg, userId } = await req.json();

    if (!name || typeof distanceKm !== 'number' || typeof co2SavedKg !== 'number') {
      return NextResponse.json(
        { success: false, error: 'name, distanceKm, and co2SavedKg are required.' },
        { status: 400 }
      );
    }

    const ref = await db.collection('leaderboard').add({
      name,
      distanceKm,
      co2SavedKg,
      userId: userId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const entry = { id: ref.id, name, distanceKm, co2SavedKg, userId: userId || null };

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/leaderboard
// { id: string, name?: string, distanceKm?: number, co2SavedKg?: number }
export async function PUT(req: Request) {
  try {
    const { id, name, distanceKm, co2SavedKg } = await req.json();
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required.' },
        { status: 400 }
      );
    }

    const data: any = {};
    if (typeof name === 'string') data.name = name;
    if (typeof distanceKm === 'number') data.distanceKm = distanceKm;
    if (typeof co2SavedKg === 'number') data.co2SavedKg = co2SavedKg;

    data.updatedAt = new Date();
    await db.collection('leaderboard').doc(id).update(data);
    const doc = await db.collection('leaderboard').doc(id).get();
    const entry = { id, ...doc.data() };
    return NextResponse.json({ success: true, entry });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}


