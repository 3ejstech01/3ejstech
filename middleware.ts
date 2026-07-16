import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionEdge } from './src/lib/session-edge';
import { UserRole } from './src/lib/types';

const PUBLIC_API = ['/api/auth/login', '/api/auth/logout'];
function isPublic(pathname: string) {
  return PUBLIC_API.some(p => pathname === p || pathname.startsWith(p + '/'));
}

const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/api/installations': [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.VIEW_ONLY],
  '/api/eload': [UserRole.ADMIN, UserRole.E_LOAD],
  '/api/users': [UserRole.ADMIN],
  '/api/archive': [UserRole.ADMIN],
  '/api/sheets-proxy': [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.E_LOAD, UserRole.VIEW_ONLY],
  '/api/debug-sheets': [UserRole.ADMIN],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/api/')) return NextResponse.next();
  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get('3ejs_session')?.value;
  const session = await verifySessionEdge(token);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const matched = Object.entries(ROUTE_ROLES).find(
    ([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/')
  );
  const allowed = matched ? matched[1] : undefined;
  if (allowed && !allowed.includes(session.role as UserRole) && session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/api/:path*'] };
