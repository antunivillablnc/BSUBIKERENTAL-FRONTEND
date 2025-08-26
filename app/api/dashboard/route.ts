import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');
    if (!email && !userId) {
      return NextResponse.json({ success: false, error: 'Email or userId is required.' }, { status: 400 });
    }
    const where: any = userId ? { userId } : { email };
    const applications = await prisma.bikeRentalApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { bike: true },
    });
    return NextResponse.json({ success: true, applications });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 