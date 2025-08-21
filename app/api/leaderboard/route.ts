import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/leaderboard?limit=10
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.max(1, Math.min(100, Number(limitParam) || 10));
    // Backfill: ensure every non-admin user has a leaderboard row
    const users = await prisma.user.findMany({
      where: { NOT: { role: { equals: 'admin', mode: 'insensitive' } } },
      select: { id: true, name: true, email: true },
    });
    const existing = await prisma.leaderboard.findMany({ select: { userId: true } });
    const existingSet = new Set(existing.map(e => e.userId || '')); 
    const toCreate = users.filter(u => !existingSet.has(u.id));
    if (toCreate.length > 0) {
      await prisma.leaderboard.createMany({
        data: toCreate.map(u => ({ userId: u.id, name: u.name || u.email, distanceKm: 0, co2SavedKg: 0 })),
        skipDuplicates: true,
      });
    }

    const entries = await prisma.leaderboard.findMany({
      orderBy: [
        { distanceKm: 'desc' },
        { co2SavedKg: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        distanceKm: true,
        co2SavedKg: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, entries });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/leaderboard
// { name: string, distanceKm: number, co2SavedKg: number, userId?: string }
export async function POST(req: Request) {
  try {
    const { name, distanceKm, co2SavedKg, userId } = await req.json();

    if (!name || typeof distanceKm !== 'number' || typeof co2SavedKg !== 'number') {
      return NextResponse.json(
        { success: false, error: 'name, distanceKm, and co2SavedKg are required.' },
        { status: 400 }
      );
    }

    const entry = await prisma.leaderboard.create({
      data: {
        name,
        distanceKm,
        co2SavedKg,
        userId: userId || null,
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/leaderboard
// { id: string, name?: string, distanceKm?: number, co2SavedKg?: number }
export async function PUT(req: Request) {
  try {
    const { id, name, distanceKm, co2SavedKg } = await req.json();
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required.' },
        { status: 400 }
      );
    }

    const data: any = {};
    if (typeof name === 'string') data.name = name;
    if (typeof distanceKm === 'number') data.distanceKm = distanceKm;
    if (typeof co2SavedKg === 'number') data.co2SavedKg = co2SavedKg;

    const entry = await prisma.leaderboard.update({
      where: { id },
      data,
    });
    return NextResponse.json({ success: true, entry });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}


