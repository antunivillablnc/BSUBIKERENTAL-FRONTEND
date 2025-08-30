import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    const appsSnap = await db.collection('applications').orderBy('createdAt', 'desc').get();
    const applications = await Promise.all(appsSnap.docs.map(async d => {
      const app: any = { id: d.id, ...d.data() };
      if (app.bikeId) {
        const bikeDoc = await db.collection('bikes').doc(app.bikeId).get();
        app.bike = bikeDoc.exists ? { id: bikeDoc.id, ...bikeDoc.data() } : null;
      } else {
        app.bike = null;
      }
      return app;
    }));
    return NextResponse.json({ success: true, applications });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 

export async function POST(req: Request) {
  try {
    const { applicationId, status } = await req.json();
    const allowedStatuses = ['approved', 'rejected', 'pending'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status.' }, { status: 400 });
    }
    const appDoc = await db.collection('applications').doc(applicationId).get();
    if (!appDoc.exists) {
      return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    }
    const application: any = { id: appDoc.id, ...appDoc.data() };
    if ((application.status || '').toLowerCase() === 'completed' || (application.status || '').toLowerCase() === 'assigned') {
      return NextResponse.json({ success: false, error: 'Cannot change status of assigned or completed applications.' }, { status: 400 });
    }

    await db.collection('applications').doc(applicationId).update({ status });

    await db.collection('activityLogs').add({
      type: 'Update Application Status',
      adminName: 'Admin',
      adminEmail: 'admin@example.com',
      description: `Set application ${applicationId} status to ${status}`,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}