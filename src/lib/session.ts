import { createHmac, timingSafeEqual } from 'crypto';

export interface SessionPayload {
  sub: string;        // user id
  username: string;
  role: string;
  iat: number;        // issued at (ms)
  exp: number;        // expires at (ms)
}

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 8; // 8h

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET (or NEXTAUTH_SECRET) must be set in production');
    }
    return 'dev-only-insecure-secret-do-not-use-in-prod';
  }
  return secret;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, 'base64url');
}

export function signSession(payload: Omit<SessionPayload, 'iat' | 'exp'>, ttlMs: number = DEFAULT_TTL_MS, now: number = Date.now()): string {
  const full: SessionPayload = { ...payload, iat: now, exp: now + ttlMs };
  const body = b64url(JSON.stringify(full));
  const sig = b64url(createHmac('sha256', getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined | null, now: number = Date.now()): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = b64url(createHmac('sha256', getSecret()).update(body).digest());
  const a = fromB64url(sig);
  const b = fromB64url(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromB64url(body).toString('utf8')) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
    if (!payload.sub || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}
