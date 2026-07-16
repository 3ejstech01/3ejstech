jest.mock('next/server', () => {
  return {
    NextRequest: class MockNextRequest extends Request {
      get nextUrl() {
        return new URL(this.url);
      }
      get cookies() {
        const cookieHeader = this.headers.get('cookie') || '';
        const map: Record<string, string> = {};
        cookieHeader.split(';').forEach(c => {
          const [name, value] = c.trim().split('=');
          if (name && value) map[name] = value;
        });
        return { get: (name: string) => (map[name] ? { value: map[name] } : undefined) };
      }
    },
    NextResponse: {
      next: jest.fn(() => new Response(null, { status: 200 })),
      json: jest.fn((data: any, opts: any) =>
        new Response(JSON.stringify(data), {
          status: opts?.status || 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    },
  };
});

jest.mock('@/lib/session-edge', () => ({
  verifySessionEdge: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';
import { verifySessionEdge } from '@/lib/session-edge';

function req(path: string, cookie?: string) {
  const url = `http://localhost${path}`;
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  return new NextRequest(url, { headers });
}

describe('middleware role enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows public login without a session', async () => {
    (verifySessionEdge as jest.Mock).mockResolvedValue(null);
    const res = await middleware(req('/api/auth/login'));
    expect(res.status).not.toBe(401);
  });

  it('rejects unauthenticated /api/installations', async () => {
    (verifySessionEdge as jest.Mock).mockResolvedValue(null);
    const res = await middleware(req('/api/installations'));
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin on /api/users when session role is eload', async () => {
    (verifySessionEdge as jest.Mock).mockResolvedValue({
      sub: 'u1',
      username: 'u1',
      role: 'eload',
      iat: Date.now(),
      exp: Date.now() + 999999,
    });
    const cookie = `3ejs_session=valid.token.here`;
    const res = await middleware(req('/api/users', cookie));
    expect(res.status).toBe(403);
  });
});
