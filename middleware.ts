import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isAuthenticated(request: NextRequest): boolean {
  const auth = request.cookies.get('auth')?.value;
  return auth === '1';
}

function getUserRole(request: NextRequest): string | undefined {
  const role = request.cookies.get('role')?.value;
  return role ? String(role) : undefined;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const loggedIn = isAuthenticated(request);
  const role = getUserRole(request);

  // Protect all admin routes
  if (pathname.startsWith('/admin')) {
    if (!loggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    if (role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/home';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Protect authenticated app sections
  const protectedPrefixes = ['/home', '/dashboard', '/my-bike', '/reserve', '/staff'];
  const isProtected = protectedPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (isProtected && !loggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/home',
    '/dashboard',
    '/my-bike',
    '/reserve/:path*',
    '/staff',
  ],
};


