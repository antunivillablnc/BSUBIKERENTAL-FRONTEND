import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });
    }
    // Find the latest application with a bike assigned and correct status
    const appSnap = await db
      .collection('applications')
      .where('userId', '==', userId)
      .where('bikeId', '!=', null)
      .where('status', 'in', ["approved", "active", "Assigned"]) // may require index
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    const appDoc = appSnap.docs[0];
    const application: any = appDoc ? { id: appDoc.id, ...appDoc.data() } : null;
    if (!application || !application.bikeId) {
      return NextResponse.json({ success: false, error: 'No rented bike found for this user.' }, { status: 404 });
    }
    // Load bike
    const bikeDoc = await db.collection('bikes').doc(application.bikeId).get();
    const bike = bikeDoc.exists ? { id: bikeDoc.id, ...bikeDoc.data() } : null;
    if (!bike) {
      return NextResponse.json({ success: false, error: 'Bike not found.' }, { status: 404 });
    }
    // Return relevant info
    return NextResponse.json({
      success: true,
      bike,
      application: {
        id: application.id,
        createdAt: application.createdAt,
        // Add more fields if needed
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 