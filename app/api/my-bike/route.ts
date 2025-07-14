import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });
    }
    // Find the latest application with a bike assigned and correct status
    const application = await prisma.bikeRentalApplication.findFirst({
      where: {
        userId,
        bikeId: { not: null },
        status: { in: ["approved", "active", "Assigned"] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        bike: {
          select: {
            id: true,
            name: true,
            plateNumber: true,
            amenities: true,
            latitude: true,
            longitude: true,
            status: true,
          }
        }
      },
    });
    if (!application || !application.bike) {
      return NextResponse.json({ success: false, error: 'No rented bike found for this user.' }, { status: 404 });
    }
    // Return relevant info
    const { bike } = application;
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