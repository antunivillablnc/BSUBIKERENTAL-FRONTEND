import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const applications = await prisma.bikeRentalApplication.findMany({
      orderBy: { createdAt: 'desc' },
      include: { bike: true },
    });
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

    const application = await prisma.bikeRentalApplication.findUnique({ where: { id: applicationId } });
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    }

    if (application.status === 'completed' || application.status === 'assigned') {
      return NextResponse.json({ success: false, error: 'Cannot change status of assigned or completed applications.' }, { status: 400 });
    }

    await prisma.bikeRentalApplication.update({
      where: { id: applicationId },
      data: { status },
    });

    await prisma.activityLog.create({
      data: {
        type: 'Update Application Status',
        adminName: 'Admin',
        adminEmail: 'admin@example.com',
        description: `Set application ${applicationId} status to ${status}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}