import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    // Fetch all bikes
    const bikesSnap = await db.collection('bikes').orderBy('name').get();
    const bikes = bikesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // For each bike, fetch the most recent application that references it (if any)
    // Note: This performs N additional queries; optimize later with denormalization if needed.
    const bikesWithLatestApp = await Promise.all(
      bikes.map(async (bike: any) => {
        const appsSnap = await db
          .collection('applications')
          .where('bikeId', '==', bike.id)
          .get();
        const apps = appsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        apps.sort((a: any, b: any) => {
          const ad = (a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0)) as Date;
          const bd = (b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0)) as Date;
          return bd.getTime() - ad.getTime();
        });
        const applications = apps.slice(0, 1);
        return { ...bike, applications };
      })
    );

    return NextResponse.json({ success: true, bikes: bikesWithLatestApp });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}