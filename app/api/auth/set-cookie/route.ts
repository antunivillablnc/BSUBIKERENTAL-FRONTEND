import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { role } = await request.json();
    if (!role) return NextResponse.json({ error: 'Missing role' }, { status: 400 });

    const res = NextResponse.json({ ok: true });
    res.cookies.set('auth', '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    res.cookies.set('role', String(role), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'Failed to set cookie' }, { status: 500 });
  }
}


