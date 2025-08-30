import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function POST(req: Request) {
  try {
    const { applicationId } = await req.json();
    if (!applicationId) {
      return NextResponse.json({ success: false, error: 'applicationId is required' }, { status: 400 });
    }

    const appDoc = await db.collection('applications').doc(applicationId).get();
    const application: any = appDoc.exists ? { id: appDoc.id, ...appDoc.data() } : null;
    if (!application || !application.bikeId) {
      return NextResponse.json({ success: false, error: 'No active rental for this application' }, { status: 400 });
    }

    const now = new Date();

    // Emulate a transaction using a batch (no cross-collection atomicity guarantees beyond batch)
    const batch = db.batch();
    const startDate = application.assignedAt ?? application.createdAt;
    const histRef = db.collection('rentalHistory').doc();
    batch.set(histRef, {
      applicationId: application.id,
      userId: application.userId,
      bikeId: application.bikeId,
      startDate,
      endDate: now,
      createdAt: new Date(),
    });
    const appRef = db.collection('applications').doc(application.id);
    batch.update(appRef, { bikeId: null, status: 'completed' });
    const bikeRef = db.collection('bikes').doc(application.bikeId);
    batch.update(bikeRef, { status: 'available' });
    await batch.commit();

    await db.collection('activityLogs').add({
      type: 'End Rental',
      adminName: 'Admin',
      adminEmail: 'admin@example.com',
      description: `Ended rental for application ${application.id} and bike ${application.bikeId}`,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}


