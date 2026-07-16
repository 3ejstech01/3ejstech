import { NextResponse } from 'next/server';
import { authenticateCredentials, toPublicUser } from '@/lib/auth-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { setSessionCookie } from '@/lib/auth-guard';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const clientKey = (request.headers.get('x-forwarded-for') || username).toLowerCase();
    const limit = await checkRateLimit(`login:${clientKey}`, 5, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.resetMs / 1000)) } }
      );
    }

    const user = await authenticateCredentials(username, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const publicUser = toPublicUser(user);
    const response = NextResponse.json({ user: publicUser });
    return setSessionCookie(response, {
      sub: publicUser.id || publicUser.username,
      username: publicUser.username,
      role: publicUser.role,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
