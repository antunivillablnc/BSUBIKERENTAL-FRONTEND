import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (base) {
      try {
        await fetch(`${base.replace(/\/$/, '')}/auth/logout`, { method: 'POST', credentials: 'include' });
      } catch {}
    }
  } catch {}
  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth', '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set('role', '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}


