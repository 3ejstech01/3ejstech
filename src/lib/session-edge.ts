// Edge-compatible HMAC-SHA256 session verification.
//
// Middleware runs in the Edge Runtime, which cannot use Node's `crypto` or
// `Buffer`. This module mirrors the exact token format produced by
// signSession() in ./session (base64url(payload).base64url(hmac)) using only
// Web Crypto + standard browser globals, so it is safe to import from
// middleware.ts. It is intentionally async (Web Crypto sign is async).

const DEV_SECRET = 'dev-only-insecure-secret-do-not-use-in-prod';

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET (or NEXTAUTH_SECRET) must be set in production');
    }
    return DEV_SECRET;
  }
  return secret;
}

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToText(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export interface SessionPayload {
  sub: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

export async function verifySessionEdge(
  token: string | undefined | null,
  now: number = Date.now()
): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(getSecret()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBytes = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
    );
    if (bytesToBase64url(sigBytes) !== sig) return null;

    const payload = JSON.parse(base64urlToText(body)) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
    if (!payload.sub || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}
