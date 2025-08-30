import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    const snap = await db.collection('activityLogs').orderBy('createdAt', 'desc').get();
    const activities = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json([], { status: 500 });
  }
} 