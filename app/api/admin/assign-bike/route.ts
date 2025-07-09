import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { applicationId, bikeId } = await req.json();
    // Check if bike is available
    const bike = await prisma.bike.findUnique({ where: { id: bikeId } });
    if (!bike || bike.status !== 'available') {
      return NextResponse.json({ success: false, error: 'Bike is not available.' }, { status: 400 });
    }
    // Assign bike to application and mark bike as rented
    await prisma.bikeRentalApplication.update({
      where: { id: applicationId },
      data: { bikeId },
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