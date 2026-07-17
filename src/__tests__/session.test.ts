import { signSession, verifySession } from '@/lib/session';

describe('session', () => {
  const originalSecret = process.env.SESSION_SECRET;
  beforeAll(() => { process.env.SESSION_SECRET = 'test-secret-1234567890'; });
  afterAll(() => { process.env.SESSION_SECRET = originalSecret; });

  it('signs and verifies a payload', () => {
    const token = signSession({ sub: 'u1', username: 'alice', role: 'admin' }, 60_000, 1000);
    const verified = verifySession(token, 2000);
    expect(verified).toEqual({
      sub: 'u1', username: 'alice', role: 'admin', iat: 1000, exp: 61_000,
    });
  });

  it('returns null for an invalid signature', () => {
    const token = signSession({ sub: 'u1', username: 'alice', role: 'admin' }, 60_000, 1000);
    const tampered = token.slice(0, -2) + 'AA';
    expect(verifySession(tampered, 2000)).toBeNull();
  });

  it('returns null for an expired token', () => {
    const token = signSession({ sub: 'u1', username: 'alice', role: 'admin' }, 1000, 1000);
    expect(verifySession(token, 3000)).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(verifySession(undefined)).toBeNull();
    expect(verifySession('')).toBeNull();
    expect(verifySession('not-a-token')).toBeNull();
  });
});
