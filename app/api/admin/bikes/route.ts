import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const bikes = await prisma.bike.findMany({
      include: {
        applications: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            srCode: true,
            email: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
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
    const existing = await prisma.bike.findFirst({ where: { name: data.name.trim() } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'A bike with this plate number already exists.' }, { status: 400 });
    }
    const bike = await prisma.bike.create({
      data: {
        name: data.name.trim(),
        status,
      },
    });
    // Log activity (replace with real admin info in the future)
    await prisma.activityLog.create({
      data: {
        type: 'Add Bike',
        adminName: 'Admin',
        adminEmail: 'admin@example.com',
        description: `Added bike ${bike.name} to inventory`,
      },
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
      const activeApps = await prisma.bikeRentalApplication.findMany({
        where: { bikeId: id },
        select: { id: true, userId: true, bikeId: true, createdAt: true, assignedAt: true },
      });
      if (activeApps.length > 0) {
        const now = new Date();
        for (const app of activeApps) {
          if (app.bikeId) {
            await prisma.rentalHistory.create({
              data: {
                applicationId: app.id,
                userId: app.userId,
                bikeId: app.bikeId,
                startDate: app.assignedAt ?? app.createdAt,
                endDate: now,
              }
            });
          }
        }
        await prisma.bikeRentalApplication.updateMany({
          where: { bikeId: id },
          data: { bikeId: null, status: 'completed' },
        });
      }
    }
    const bike = await prisma.bike.update({
      where: { id },
      data: { status },
    });
    // Log activity (replace with real admin info in the future)
    await prisma.activityLog.create({
      data: {
        type: 'Update Bike Status',
        adminName: 'Admin',
        adminEmail: 'admin@example.com',
        description: `Updated bike ID ${id} status to ${status}`,
      },
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
    await prisma.bike.delete({ where: { id } });
    // Log activity (replace with real admin info in the future)
    await prisma.activityLog.create({
      data: {
        type: 'Delete Bike',
        adminName: 'Admin',
        adminEmail: 'admin@example.com',
        description: `Deleted bike ID ${id} from inventory`,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 