import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const activities = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json([], { status: 500 });
  }
} 