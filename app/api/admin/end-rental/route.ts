import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { applicationId } = await req.json();
    if (!applicationId) {
      return NextResponse.json({ success: false, error: 'applicationId is required' }, { status: 400 });
    }

    const application = await prisma.bikeRentalApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application || !application.bikeId) {
      return NextResponse.json({ success: false, error: 'No active rental for this application' }, { status: 400 });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      const startDate = (application as any).assignedAt ?? application.createdAt;
      await (tx as any).rentalHistory.create({
        data: {
          applicationId: application.id,
          userId: application.userId,
          bikeId: application.bikeId!,
          startDate,
          endDate: now,
        }
      });

      await tx.bikeRentalApplication.update({
        where: { id: application.id },
        data: { bikeId: null, status: 'completed' },
      });

      await tx.bike.update({
        where: { id: application.bikeId! },
        data: { status: 'available' },
      });

      await tx.activityLog.create({
        data: {
          type: 'End Rental',
          adminName: 'Admin',
          adminEmail: 'admin@example.com',
          description: `Ended rental for application ${application.id} and bike ${application.bikeId}`,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}


