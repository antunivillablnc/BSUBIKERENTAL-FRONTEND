import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || '').trim();
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    const doc = await db.collection('bikes').doc(id).get();
    if (!doc.exists) return NextResponse.json({ success: false, error: 'not found' }, { status: 404 });
    const data: any = { id: doc.id, ...doc.data() };
    const deviceId = data?.DEVICE_ID || data?.deviceId || null;
    return NextResponse.json({ success: true, bike: { id: doc.id, name: data?.name || null, deviceId } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'failed' }, { status: 500 });
  }
}


