import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Completed rental events
    const rentals = await (prisma as any).rentalHistory.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        bike: { select: { id: true, name: true } },
        application: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    const mappedRentals = rentals.map((r: any) => ({
      ...r,
      type: 'rental',
      status: 'Completed',
    }));

    // Rejected application events
    const rejections = await prisma.bikeRentalApplication.findMany({
      where: { status: 'rejected' },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const mappedRejections = rejections.map((a: any) => ({
      id: `rej-${a.id}`,
      startDate: null,
      endDate: null,
      createdAt: a.createdAt,
      user: a.user,
      bike: null,
      application: { id: a.id, firstName: a.firstName, lastName: a.lastName, email: a.email },
      type: 'rejected',
      status: 'Rejected',
    }));

    // Approved and currently rented (assigned/active) applications
    const inProgressApps = await prisma.bikeRentalApplication.findMany({
      where: { status: { in: ['approved', 'assigned', 'active'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        bike: { select: { id: true, name: true } },
      },
    });

    const mappedInProgress = inProgressApps.map((a: any) => ({
      id: `app-${a.id}-${a.status}`,
      startDate: a.assignedAt || null,
      endDate: null,
      createdAt: a.assignedAt || a.createdAt,
      user: a.user,
      bike: a.bike,
      application: { id: a.id, firstName: a.firstName, lastName: a.lastName, email: a.email },
      type: 'rental',
      status: a.bike ? 'Rented' : 'Approved',
    }));

    const history = [...mappedRentals, ...mappedInProgress, ...mappedRejections]
      .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());

    return NextResponse.json({ success: true, history });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}


