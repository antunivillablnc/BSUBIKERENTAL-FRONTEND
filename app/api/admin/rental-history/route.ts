import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    // Completed rental events
    const rentalsSnap = await db.collection('rentalHistory').orderBy('createdAt', 'desc').get();
    const rentals = await Promise.all(rentalsSnap.docs.map(async d => {
      const r: any = { id: d.id, ...d.data() };
      const userDoc = await db.collection('users').doc(r.userId).get();
      const bikeDoc = await db.collection('bikes').doc(r.bikeId).get();
      const appDoc = r.applicationId ? await db.collection('applications').doc(r.applicationId).get() : null;
      return {
        ...r,
        type: 'rental',
        status: 'Completed',
        user: userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null,
        bike: bikeDoc.exists ? { id: bikeDoc.id, ...bikeDoc.data() } : null,
        application: appDoc && appDoc.exists ? { id: appDoc.id, ...appDoc.data() } : null,
      };
    }));

    // Rejected application events
    const rejSnap = await db.collection('applications').where('status', '==', 'rejected').get();
    const mappedRejections = await Promise.all(rejSnap.docs.map(async aDoc => {
      const a: any = { id: aDoc.id, ...aDoc.data() };
      const userDoc = await db.collection('users').doc(a.userId).get();
      return {
        id: `rej-${a.id}`,
        startDate: null,
        endDate: null,
        createdAt: a.createdAt,
        user: userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null,
        bike: null,
        application: { id: a.id, firstName: a.firstName, lastName: a.lastName, email: a.email },
        type: 'rejected',
        status: 'Rejected',
      };
    }));

    // Approved and currently rented (assigned/active) applications
    const progSnap = await db.collection('applications').where('status', 'in', ['approved', 'assigned', 'active']).get();
    const mappedInProgress = await Promise.all(progSnap.docs.map(async aDoc => {
      const a: any = { id: aDoc.id, ...aDoc.data() };
      const userDoc = await db.collection('users').doc(a.userId).get();
      const bikeDoc = a.bikeId ? await db.collection('bikes').doc(a.bikeId).get() : null;
      return {
        id: `app-${a.id}-${a.status}`,
        startDate: a.assignedAt || null,
        endDate: null,
        createdAt: a.assignedAt || a.createdAt,
        user: userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null,
        bike: bikeDoc && bikeDoc.exists ? { id: bikeDoc.id, ...bikeDoc.data() } : null,
        application: { id: a.id, firstName: a.firstName, lastName: a.lastName, email: a.email },
        type: 'rental',
        status: a.bikeId ? 'Rented' : 'Approved',
      };
    }));

    const history = [...rentals, ...mappedInProgress, ...mappedRejections]
      .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());

    return NextResponse.json({ success: true, history });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}


