import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');
    if (!email && !userId) {
      return NextResponse.json({ success: false, error: 'Email or userId is required.' }, { status: 400 });
    }
    const query = userId
      ? db.collection('applications').where('userId', '==', userId)
      : db.collection('applications').where('email', '==', email);
    const appsSnap = await query.orderBy('createdAt', 'desc').get();
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