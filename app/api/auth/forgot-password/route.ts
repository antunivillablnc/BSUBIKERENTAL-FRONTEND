import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim();
    if (!email) return NextResponse.json({ message: 'Email is required' }, { status: 400 });

    const backendBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
    if (!backendBase) {
      return NextResponse.json({ error: 'Backend base URL not configured' }, { status: 500 });
    }
    const resp = await fetch(`${backendBase}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to process request' }, { status: 500 });
  }
}


