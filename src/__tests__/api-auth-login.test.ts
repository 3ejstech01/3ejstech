jest.mock('@/lib/auth-server', () => ({
  authenticateCredentials: jest.fn(),
  toPublicUser: (user: any) => ({ id: user.id, username: user.username, role: user.role }),
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true, resetMs: 0 }),
}));

jest.mock('@/lib/auth-guard', () => ({
  setSessionCookie: (response: Response) => response,
}));

import { POST } from '@/app/api/auth/login/route';

describe('POST /api/auth/login', () => {
  it('allows login without password (password-less site)', async () => {
    const { authenticateCredentials } = require('@/lib/auth-server');
    authenticateCredentials.mockResolvedValueOnce(null);

    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin' }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toMatch(/invalid/i);
  });

  it('requires username', async () => {
    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ password: 'secret' }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(400);
  });
});
