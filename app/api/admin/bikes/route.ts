import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

// Firestore implementation

export async function GET() {
  try {
    const bikeSnap = await db.collection('bikes').get();
    const bikes = await Promise.all(bikeSnap.docs.map(async d => {
      const bike: any = { id: d.id, ...d.data() };
      const appsSnap = await db.collection('applications').where('bikeId', '==', bike.id).get();
      const apps = appsSnap.docs.map(a => ({ id: a.id, ...a.data() }));
      apps.sort((a: any, b: any) => {
        const ad = (a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0)) as Date;
        const bd = (b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0)) as Date;
        return bd.getTime() - ad.getTime();
      });
      bike.applications = apps;
      return bike;
    }));
    bikes.sort((a: any, b: any) => {
      const ad = (a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0)) as Date;
      const bd = (b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0)) as Date;
      return bd.getTime() - ad.getTime();
    });
    
    return NextResponse.json({ success: true, bikes });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      return NextResponse.json({ success: false, error: 'Plate number is required.' }, { status: 400 });
    }
    const status = data.status === 'rented' ? 'rented' : 'available';
    // Prevent duplicate plate numbers
    const dupSnap = await db.collection('bikes').where('name', '==', data.name.trim()).limit(1).get();
    if (!dupSnap.empty) {
      return NextResponse.json({ success: false, error: 'A bike with this plate number already exists.' }, { status: 400 });
    }
    const bikeRef = await db.collection('bikes').add({
      name: data.name.trim(),
      status,
      createdAt: new Date(),
    });
    const bike = { id: bikeRef.id, name: data.name.trim(), status };
    // Log activity (replace with real admin info in the future)
    await db.collection('activityLogs').add({
      type: 'Add Bike',
      adminName: 'Admin',
      adminEmail: 'admin@example.com',
      description: `Added bike ${bike.name} to inventory`,
      createdAt: new Date(),
    });
    return NextResponse.json({ success: true, bike });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Bike id and status are required.' }, { status: 400 });
    }
    // If setting to available, finalize any active rentals and write to history
    if (status === 'available') {
      const activeAppsSnap = await db.collection('applications').where('bikeId', '==', id).get();
      const activeApps = activeAppsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      if (activeApps.length > 0) {
        const now = new Date();
        for (const app of activeApps) {
          if (app.bikeId) {
            await db.collection('rentalHistory').add({
              applicationId: app.id,
              userId: app.userId,
              bikeId: app.bikeId,
              startDate: app.assignedAt ?? app.createdAt,
              endDate: now,
              createdAt: new Date(),
            });
          }
        }
        const batch = db.batch();
        activeAppsSnap.docs.forEach(doc => {
          batch.update(doc.ref, { bikeId: null, status: 'completed' });
        });
        await batch.commit();
      }
    }
    await db.collection('bikes').doc(id).update({ status });
    const bikeDoc = await db.collection('bikes').doc(id).get();
    const bike = { id, ...bikeDoc.data() };
    // Log activity (replace with real admin info in the future)
    await db.collection('activityLogs').add({
      type: 'Update Bike Status',
      adminName: 'Admin',
      adminEmail: 'admin@example.com',
      description: `Updated bike ID ${id} status to ${status}`,
      createdAt: new Date(),
    });
    return NextResponse.json({ success: true, bike });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Bike id is required.' }, { status: 400 });
    }
    // Delete the bike
    await db.collection('bikes').doc(id).delete();
    // Log activity (replace with real admin info in the future)
    await db.collection('activityLogs').add({
      type: 'Delete Bike',
      adminName: 'Admin',
      adminEmail: 'admin@example.com',
      description: `Deleted bike ID ${id} from inventory`,
      createdAt: new Date(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 