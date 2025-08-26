import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { applicationId, bikeId } = await req.json();
    // Validate application is not completed and not already assigned
    const application = await prisma.bikeRentalApplication.findUnique({ where: { id: applicationId } });
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    }
    if (application.status === 'completed') {
      return NextResponse.json({ success: false, error: 'This application has already been completed and cannot be reused.' }, { status: 400 });
    }
    if (!['approved', 'assigned', 'active'].includes(application.status)) {
      return NextResponse.json({ success: false, error: 'Application must be approved before assigning a bike.' }, { status: 400 });
    }
    if (application.bikeId) {
      return NextResponse.json({ success: false, error: 'Application already has a bike assigned.' }, { status: 400 });
    }
    // Check if bike is available
    const bike = await prisma.bike.findUnique({ where: { id: bikeId } });
    if (!bike || bike.status !== 'available') {
      return NextResponse.json({ success: false, error: 'Bike is not available.' }, { status: 400 });
    }
    // Assign bike to application and mark bike as rented
    await prisma.bikeRentalApplication.update({
      where: { id: applicationId },
      data: { bikeId, status: 'assigned', assignedAt: new Date() },
    });
    await prisma.bike.update({
      where: { id: bikeId },
      data: { status: 'rented' },
    });
    // Log activity (replace with real admin info in the future)
    await prisma.activityLog.create({
      data: {
        type: 'Assign Bike',
        adminName: 'Admin',
        adminEmail: 'admin@example.com',
        description: `Assigned bike ID ${bikeId} to application ID ${applicationId}`,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 