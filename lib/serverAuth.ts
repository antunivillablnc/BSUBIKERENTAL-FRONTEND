import { cookies } from 'next/headers';
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

export function getAuthUser(): JwtUserPayload | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth')?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, getJwtSecret()) as JwtUserPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function requireRole(allowedRoles: string[] = []): JwtUserPayload {
  const user = getAuthUser();
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


