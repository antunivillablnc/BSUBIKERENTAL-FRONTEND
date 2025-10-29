import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export type JwtUserPayload = {
  id: string;
  email: string;
  role: string;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

function extractBearerToken(req: NextRequest): string | undefined {
  const header = req.headers.get('authorization');
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  if ((scheme || '').toLowerCase() !== 'bearer' || !token) return undefined;
  return token;
}

export function getAuthUserFromRequest(req: NextRequest): JwtUserPayload | null {
  try {
    const token = req.cookies.get('auth')?.value || extractBearerToken(req);
    if (!token) return null;
    const decoded = jwt.verify(token, getJwtSecret()) as JwtUserPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function requireRole(req: NextRequest, allowedRoles: string[] = []): JwtUserPayload {
  const user = getAuthUserFromRequest(req);
  if (!user) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
  if (allowedRoles.length > 0) {
    const roleLower = String(user.role || '').toLowerCase();
    const allowed = new Set(allowedRoles.map(r => String(r).toLowerCase()));
    if (!allowed.has(roleLower)) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }
  }
  return user;
}


