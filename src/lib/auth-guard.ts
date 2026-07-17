import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, signSession } from './session';
import { _resetRateLimits, checkRateLimit } from './rate-limit';
import { UserRole } from './types';

export const SESSION_COOKIE = '3ejs_session';

export function setSessionCookie(response: NextResponse, payload: Parameters<typeof signSession>[0]) {
  const token = signSession(payload);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}

export interface AuthFailure {
  response: NextResponse;
}

export function requireRole(req: NextRequest, allowed: readonly string[]): { session: NonNullable<ReturnType<typeof verifySession>> } | AuthFailure {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const isAdmin = session.role === UserRole.ADMIN;
  if (!isAdmin && !allowed.includes(session.role)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}

export { _resetRateLimits };
export { checkRateLimit };
