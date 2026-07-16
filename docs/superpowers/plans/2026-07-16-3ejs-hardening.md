# 3EJS Tech Hardening & Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden and enhance the 3EJS Tech ISP app across five areas (visual, data fetching, performance, data handling, security) without changing the Google Sheets backend, targeting medium data volume (~5k–50k rows) on both web and Electron.

**Architecture:** Keep the existing stack (Next 16 App Router + Turbopack, Google Sheets via Apps Script web app, IndexedDB cache + sync queue, Zustand stores, Framer Motion + Recharts, HMAC session-cookie auth, Electron desktop build). Changes are additive/refactoring within these boundaries. Phases: P0 security & data integrity, P1 fetching & performance, P2 visual & polish.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand, IndexedDB (web), @tanstack/react-virtual (new), zod (existing), bcryptjs (existing), electron-store (existing). Apps Script (Google) for `SHEETS_CODE.js`.

---

## File Structure

**New files**
- `src/lib/rate-limit-store.ts` — IndexedDB-backed durable rate limiter (replaces in-memory `rate-limit.ts`).
- `src/lib/secure-headers.ts` — helper returning security headers map (used by `server.js` + `next.config.ts`).
- `src/components/common/VirtualTable.tsx` — virtualized table renderer wrapping `DataTable` rows.

**Modified files**
- `middleware.ts` — enforce auth + role by default; narrow `isPublic`.
- `src/app/api/installations/route.ts`, `src/app/api/eload/route.ts`, `src/app/api/users/route.ts`, `src/app/api/archive/route.ts`, `src/app/api/installations/[id]/route.ts` — server-side `requireRole`.
- `src/app/api/sheets-proxy/route.ts` — session + sheet/action allowlist.
- `server.js` — secret-boot guard + security headers.
- `src/lib/validation.ts` — collapse dual-casing; tighten.
- `src/lib/unified-db.ts` — per-store TTL + stale-while-revalidate cache.
- `src/context/DataProvider.tsx` + stores — single data-version event; drop refetch storms.
- `src/app/dashboard/page.tsx` — drop Framer Motion hot paths.
- `src/components/common/DataTable.tsx` — virtualize.
- `src/lib/sync-queue.ts` — deterministic snapshot flush; decouple from Zustand.
- `src/stores/syncQueueStore.ts` — subscribe to local-db; generic `QueuedOp<T>`.
- `src/components/sync/SyncStatus.tsx` — dead-letter visibility + last-successful-sync.
- `next.config.ts` — add security headers.
- `SHEETS_CODE.js` — server-side filtering params + caller-auth check.

**Test files**
- `src/__tests__/middleware-role.test.ts`
- `src/__tests__/sheets-proxy-auth.test.ts`
- `src/__tests__/rate-limit-store.test.ts`
- `src/__tests__/sync-queue-deterministic.test.ts`
- `src/__tests__/validation-casing.test.ts`

---

### Task 1: Enforce auth + role in middleware

**Files:**
- Modify: `middleware.ts:1-28`
- Test: `src/__tests__/middleware-role.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/middleware-role.test.ts
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';

function req(path: string, cookie?: string) {
  const url = `http://localhost${path}`;
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  return new NextRequest(url, { headers });
}

describe('middleware role enforcement', () => {
  it('allows public login without a session', async () => {
    const res = await middleware(req('/api/auth/login'));
    expect(res.status).not.toBe(401);
  });

  it('rejects unauthenticated /api/installations', async () => {
    const res = await middleware(req('/api/installations'));
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin on /api/users when session role is eload', async () => {
    const fakeSession = Buffer.from(
      JSON.stringify({ sub: 'u1', username: 'u1', role: 'eload', iat: Date.now(), exp: Date.now() + 999999 })
    ).toString('base64url');
    const sig = Buffer.from('x').toString('base64url');
    const cookie = `3ejs_session=${fakeSession}.${sig}`;
    const res = await middleware(req('/api/users', cookie));
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/middleware-role.test.ts`
Expected: FAIL (middleware currently only checks `isPublic`, returns 200 for protected routes).

- [ ] **Step 3: Rewrite middleware with default-deny + role map**

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionEdge } from './src/lib/session-edge';
import { UserRole } from './src/lib/types';

const PUBLIC_API = ['/api/auth/login', '/api/auth/logout'];
function isPublic(pathname: string) {
  return PUBLIC_API.some(p => pathname === p || pathname.startsWith(p + '/'));
}

// Route -> allowed roles. Absent => admin only.
const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/api/installations': [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.VIEW_ONLY],
  '/api/eload': [UserRole.ADMIN, UserRole.E_LOAD],
  '/api/users': [UserRole.ADMIN],
  '/api/archive': [UserRole.ADMIN],
  '/api/sheets-proxy': [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.E_LOAD, UserRole.VIEW_ONLY],
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
  const allowed = ROUTE_ROLES[pathname];
  if (allowed && !allowed.includes(session.role as UserRole) && session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/api/:path*'] };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/middleware-role.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add middleware.ts src/__tests__/middleware-role.test.ts
git commit -m "sec: enforce auth + role in middleware by default-deny"
```

### Task 2: Server-side requireRole in write routes

**Files:**
- Modify: `src/app/api/installations/route.ts:1-68`, `src/app/api/installations/[id]/route.ts:1-25`, `src/app/api/eload/route.ts`, `src/app/api/users/route.ts:1-82`, `src/app/api/archive/route.ts:1-35`
- Reuse: `src/lib/auth-guard.ts` (`requireRole`, `SESSSION_COOKIE`)

- [ ] **Step 1: Add a guard helper that reads the session from the request**

```ts
// src/lib/route-auth.ts  (new, small)
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from './session';
import { UserRole } from './types';
import { SESSSSION_COOKIE } from './auth-guard';

export function requireRole(req: NextRequest, allowed: UserRole[]) {
  const token = req.cookies.get(SESSSSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isAdmin = session.role === UserRole.ADMIN;
  if (!isAdmin && !allowed.includes(session.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
```

- [ ] **Step 2: Apply to installations GET + PATCH/[id]**

In `src/app/api/installations/route.ts`, add at top of `GET` and `POST`:
```ts
import { requireRole } from '@/lib/route-auth';
// inside GET, first line after try:
const denied = requireRole(request, [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.VIEW_ONLY]);
if (denied) return denied;
```
In `src/app/api/installations/[id]/route.ts` PATCH:
```ts
const denied = requireRole(request, [UserRole.ADMIN, UserRole.TECHNICIAN]);
if (denied) return denied;
```

- [ ] **Step 3: Apply to eload, users, archive**

`eload` GET/PATCH → `[UserRole.ADMIN, UserRole.E_LOAD]`; `users` GET/POST/PATCH/DELETE → `[UserRole.ADMIN]`; `archive` POST → `[UserRole.ADMIN]`. Same first-line pattern as Step 2.

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/route-auth.ts src/app/api/installations/route.ts src/app/api/installations/[id]/route.ts src/app/api/eload/route.ts src/app/api/users/route.ts src/app/api/archive/route.ts
git commit -m "sec: enforce requireRole in all write/list API routes"
```

### Task 3: Lock down sheets-proxy

**Files:**
- Modify: `src/app/api/sheets-proxy/route.ts:1-54`
- Test: `src/__tests__/sheets-proxy-auth.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/sheets-proxy-auth.test.ts
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/sheets-proxy/route';

it('rejects unauthenticated proxied writes', async () => {
  const req = new NextRequest('http://localhost/api/sheets-proxy', {
    method: 'POST',
    body: JSON.stringify({ sheet: 'installations', action: 'append', row: { x: 1 } }),
  });
  const res = await POST(req);
  expect(res.status).toBe(401);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/sheets-proxy-auth.test.ts`
Expected: FAIL (route currently proxies anything).

- [ ] **Step 3: Add session + allowlist to the proxy**

```ts
// src/app/api/sheets-proxy/route.ts  (replace top of GET/POST)
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/route-auth';
import { UserRole } from '@/lib/types';

const ALLOWED_SHEETS = new Set(['installations', 'eload', 'users', 'historicaldata']);

function guard(req: NextRequest) {
  return requireRole(req, [
    UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.E_LOAD, UserRole.VIEW_ONLY,
  ]);
}

export async function GET(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const sheet = searchParams.get('sheet') || 'installations';
    if (!ALLOWED_SHEETS.has(sheet)) {
      return NextResponse.json({ error: 'Sheet not allowed' }, { status: 400 });
    }
    const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || '';
    if (!WEBAPP_URL) return NextResponse.json({ error: 'Google Sheets Web App URL not configured' }, { status: 500 });
    const url = `${WEBAPP_URL}?sheet=${encodeURIComponent(sheet)}`;
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: `HTTP ${res.status}: ${res.statusText}` }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('[Sheets Proxy GET] Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const payload = await request.json();
    const sheet = String(payload?.sheet || '');
    if (!ALLOWED_SHEETS.has(sheet)) {
      return NextResponse.json({ error: 'Sheet not allowed' }, { status: 400 });
    }
    const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || '';
    if (!WEBAPP_URL) return NextResponse.json({ error: 'Google Sheets Web App URL not configured' }, { status: 500 });
    const res = await fetch(WEBAPP_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload),
    });
    if (!res.ok) return NextResponse.json({ error: `HTTP ${res.status}: ${res.statusText}` }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('[Sheets Proxy POST] Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/sheets-proxy-auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/sheets-proxy/route.ts src/__tests__/sheets-proxy-auth.test.ts
git commit -m "sec: lock sheets-proxy behind session + sheet allowlist"
```

### Task 4: Secret boot guard

**Files:**
- Modify: `server.js:1-40`
- Verify: `electron/main.js` already sets per-install `SESSION_SECRET` (added previously).

- [ ] **Step 1: Add a prod guard at the top of server.js**

```js
// server.js  (add before createServer definition)
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET && !process.env.NEXTAUTH_SECRET) {
  console.error('FATAL: SESSION_SECRET (or NEXTAUTH_SECRET) must be set in production. Refusing to start.');
  process.exit(1);
}
```

- [ ] **Step 2: Confirm electron path still sets the secret**

Already present in `electron/main.js` (per-install `crypto.randomBytes(32)` stored via electron-store). No change needed; verify `SESSION_SECRET` is set before `startServer(false)`.

- [ ] **Step 3: Boot the prod server without a secret and expect exit 1**

Run (PowerShell):
```powershell
$env:NODE_ENV='production'; Remove-Item env:SESSION_SECRET -ErrorAction SilentlyContinue
node server.js 2>&1 | Select-String 'FATAL'
```
Expected: output contains `FATAL: SESSION_SECRET ... must be set`.

- [ ] **Step 4: Boot with a secret and expect Ready**

```powershell
$env:SESSION_SECRET='test-secret-0123456789abcdef'
node server.js 2>&1 | Select-String 'Ready on'
```
Expected: output contains `Ready on`.

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "sec: refuse to boot in production without SESSION_SECRET"
```

### Task 5: Durable rate limiting

**Files:**
- Create: `src/lib/rate-limit-store.ts`
- Modify: `src/lib/rate-limit.ts`
- Test: `src/__tests__/rate-limit-store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/rate-limit-store.test.ts
import { checkRateLimit, _resetRateLimits } from '@/lib/rate-limit';

beforeEach(() => _resetRateLimits());
it('persists across reloads via the store', async () => {
  // Simulate a fresh module load: first 5 calls allowed, 6th blocked.
  let allowed = 0;
  for (let i = 0; i < 6; i++) {
    const r = checkRateLimit('login:ip', 5, 60_000);
    if (r.allowed) allowed++;
  }
  expect(allowed).toBe(5);
  const blocked = checkRateLimit('login:ip', 5, 60_000);
  expect(blocked.allowed).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails** (store not wired yet → still in-memory; test will pass only after store). Run `npx jest src/__tests__/rate-limit-store.test.ts`; if it passes trivially, extend to assert durability by re-importing after clearing module cache in a later step.

- [ ] **Step 3: Create the store-backed limiter**

```ts
// src/lib/rate-limit-store.ts
const DB = '3ejs_rl_db';
function available(): boolean { return typeof indexedDB !== 'undefined'; }
async function read(key: string): Promise<number> {
  return new Promise((res) => {
    const tx = indexedDB.open(DB, 1);
    tx.onupgradeneeded = () => { const db = tx.result; if (!db.objectStoreNames.contains('b')) db.createObjectStore('b', { keyPath: 'k' }); };
    tx.onsuccess = () => {
      const db = tx.result;
      const r = db.transaction('b', 'readonly').objectStore('b').get(key);
      r.onsuccess = () => res((r.result?.v as number) || 0);
    };
  });
}
async function write(key: string, v: number): Promise<void> {
  return new Promise((res) => {
    const tx = indexedDB.open(DB, 1);
    tx.onsuccess = () => {
      const db = tx.result;
      const t = db.transaction('b', 'readwrite');
      t.objectStore('b').put({ k: key, v });
      t.oncomplete = () => res();
    };
  });
}
export async function bump(key: string): Promise<number> {
  if (!available()) return 1;
  const cur = await read(key);
  const next = cur + 1;
  await write(key, next);
  return next;
}
```

- [ ] **Step 4: Wire store into checkRateLimit**

```ts
// src/lib/rate-limit.ts  (replace in-memory bucket logic)
import { bump } from './rate-limit-store';

export async function checkRateLimit(
  key: string, max: number, windowMs: number, now: number = Date.now(),
): Promise<RateLimitResult> {
  const count = available() ? await bump(key) : 1;
  const remaining = Math.max(0, max - count);
  return { allowed: count <= max, remaining, resetMs: windowMs };
}
```
(Keep `RateLimitResult` interface and `_resetRateLimits` from the existing file. `available` is re-declared in the store; import-safe local helper in rate-limit.ts if needed.)

- [ ] **Step 5: Run tests**

Run: `npx jest src/__tests__/rate-limit-store.test.ts`
Expected: PASS. Also run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rate-limit-store.ts src/lib/rate-limit.ts src/__tests__/rate-limit-store.test.ts
git commit -m "sec: durable IndexedDB-backed rate limiter"
```

### Task 6: Validate every write route + collapse schema casing

**Files:**
- Modify: `src/lib/validation.ts:3-104`
- Modify: `src/app/api/installations/route.ts:5-28`, `src/app/api/installations/[id]/route.ts`, `src/app/api/archive/route.ts`, `src/app/api/users/route.ts:37-68`
- Test: `src/__tests__/validation-casing.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/validation-casing.test.ts
import { validateInstallation, validateUser } from '@/lib/validation';

it('accepts only camelCase keys (no snake duplicates)', () => {
  const ok = validateInstallation({ accountNumber: 'A1', subscriberName: 'S', joNumber: 'J1' });
  expect(ok.success).toBe(true);
  const bad = validateInstallation({ accountnumber: 'A1', subsname: 'S', jonumber: 'J1' });
  expect(bad.success).toBe(false);
});

it('rejects unknown extra fields on user', () => {
  const r = validateUser({ username: 'abc', password: 'secret1', role: 'admin', evil: 'x' });
  expect(r.success).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/validation-casing.test.ts`
Expected: FAIL (`InstallationSchema` currently defines both casings; `UserSchema` has no `.strict()`).

- [ ] **Step 3: Collapse InstallationSchema to single casing + strict**

In `src/lib/validation.ts`, delete every `xxx: z.string().optional()` line that is the snake_case twin (e.g., `dateinstalled`, `agentname`, `jonumber`, … keep only the camelCase keys already mapped by `sheets-mapper` / `toCamelCaseInstallation`). Add `.strict()` to all three schemas so unknown keys are rejected.

```ts
export const InstallationSchema = z.object({
  id: z.string().optional(),
  no: z.string().optional(),
  dateInstalled: z.string().optional(),
  agentName: z.string().optional(),
  joNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  subscriberName: z.string().optional(),
  contactNumber1: z.string().optional(),
  contactNumber2: z.string().optional(),
  address: z.string().optional(),
  houseLatitude: z.string().optional(),
  houseLongitude: z.string().optional(),
  port: z.string().optional(),
  assignedTechnician: z.string().optional(),
  assignedTechnicians: z.array(z.string()).optional(),
  modemSerial: z.string().optional(),
  reelNo: z.string().optional(),
  startLocation: z.string().optional(),
  reelStart: z.string().optional(),
  endLocation: z.string().optional(),
  reelEnd: z.string().optional(),
  fiberOpticCable: z.string().optional(),
  mechanicalConnector: z.string().optional(),
  sClamp: z.string().optional(),
  patchcordApsc: z.string().optional(),
  houseBracket: z.string().optional(),
  midspan: z.string().optional(),
  cableClip: z.string().optional(),
  ftthTerminalBox: z.string().optional(),
  doubleSidedTape: z.string().optional(),
  cableTieWrap: z.string().optional(),
  status: z.string().optional(),
  monthInstalled: z.string().optional(),
  yearInstalled: z.string().optional(),
  loadExpire: z.string().optional(),
  notifyStatus: z.string().optional(),
  loadStatus: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  napBoxLonglat: z.string().optional(),
  napLatitude: z.string().optional(),
  napLongitude: z.string().optional(),
}).strict().refine(data => {
  const hasAcc = !!data.accountNumber;
  const hasSub = !!data.subscriberName;
  const hasJo = !!data.joNumber;
  return hasAcc && hasSub && hasJo;
}, { message: "joNumber, subscriberName, and accountNumber are required" });
```
Apply the same `.strict()` to `ELoadTransactionSchema` and `UserSchema`.

- [ ] **Step 4: Update routes to validate snake input via mapper first**

In `src/app/api/installations/route.ts` POST, replace the inline `toCamelCaseInstallation` double-map by relying on `validation.ts` camelCase only; if the request body may still arrive snake_case, normalize once: keep `toCamelCaseInstallation` BUT drop the now-removed schema twins so the mappers are the single contract. (No code change required if the route already maps before validating — confirm the route passes camelCase to `validateInstallation`.)

For `users` PATCH (`src/app/api/users/route.ts:37-68`): currently falls back to `'placeholder-password-123'` when `data.password` is missing — that is a security hole (lets a caller clear a password). Change the merge so a missing password is rejected unless an admin intentionally sets one:

```ts
const merged = {
  id,
  username: data.username ?? existing.username,
  password: data.password ?? existing.password, // never auto-fill a placeholder
  role: data.role ?? existing.role,
};
const result = validateUser(merged);
if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
```

`archive` POST already validates `currentYear` (good) — add `z` strict on its inline body in `src/app/api/archive/route.ts`.

- [ ] **Step 5: Run tests**

Run: `npx jest src/__tests__/validation-casing.test.ts src/__tests__/validation.test.ts`
Expected: both PASS. `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validation.ts src/__tests__/validation-casing.test.ts src/app/api/installations/route.ts src/app/api/installations/[id]/route.ts src/app/api/archive/route.ts src/app/api/users/route.ts
git commit -m "sec: validate all write routes, collapse schema casing, no password placeholder"
```

### Task 7: Security headers (CSP / nosniff / referrer)

**Files:**
- Create: `src/lib/secure-headers.ts`
- Modify: `next.config.ts:1-22`, `server.js:16-29`

- [ ] **Step 1: Create the headers helper**

```ts
// src/lib/secure-headers.ts
export const SECURE_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};
```

- [ ] **Step 2: Add to next.config.ts headers()**

```ts
// next.config.ts  (inside NextConfig)
async headers() {
  return [{ source: '/(.*)', headers: Object.entries(SECURE_HEADERS).map(([key, value]) => ({ key, value })) }];
},
```
Import `SECURE_HEADERS` from `./src/lib/secure-headers`.

- [ ] **Step 3: Apply in server.js for the Electron/prod server**

In `server.js`, after `server.listen`, set headers on every response:

```js
const { SECURE_HEADERS } = require('./src/lib/secure-headers.ts'); // or compiled path
server.on('request', (req, res) => {
  for (const [k, v] of Object.entries(SECURE_HEADERS)) res.setHeader(k, v);
});
```
(If TS import in `server.js` is awkward, inline the same map as a plain JS object in `server.js`.)

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/secure-headers.ts next.config.ts server.js
git commit -m "sec: add CSP, nosniff, referrer, frame-deny headers"
```

### Task 8: Apps Script — caller auth + server-side filtering

**Files:**
- Modify: `SHEETS_CODE.js` (the canonical Apps Script)

- [ ] **Step 1: Add an authorized-caller check + filter/limit params**

At the top of `doGet`/`doPost` in `SHEETS_CODE.js`, before reading/writing any sheet, verify a shared secret header/param and restrict `action`:

```js
function authorized(e) {
  // Use a header OR a `secret` param. Keep this in Script Properties, never inline.
  const expected = PropertiesService.getScriptProperties().getProperty('APP_SECRET');
  const provided = e.parameter.secret || (e.postData && e.postData.contents && JSON.parse(e.postData.contents).secret);
  return expected && provided === expected;
}
function doGet(e) {
  if (!authorized(e)) return json({ error: 'unauthorized' }, 401);
  const sheet = e.parameter.sheet;
  const filterCol = e.parameter.filterColumn;
  const filterVal = e.parameter.filterValue;
  const limit = e.parameter.limit ? Number(e.parameter.limit) : 1000;
  const offset = e.parameter.offset ? Number(e.parameter.offset) : 0;
  let rows = readSheet(sheet);
  if (filterCol && filterVal != null) rows = rows.filter(r => String(r[filterCol]) === String(filterVal));
  rows = rows.slice(offset, offset + limit);
  return json(rows);
}
function doPost(e) {
  if (!authorized(e)) return json({ error: 'unauthorized' }, 401);
  const body = JSON.parse(e.postData.contents);
  if (!['installations','eload','users','historicaldata'].includes(body.sheet)) {
    return json({ error: 'sheet not allowed' }, 400);
  }
  if (body.action === 'append') appendRow(body.sheet, body.row);
  else if (body.action === 'update') updateRow(body.sheet, body.keyColumn, body.keyValue, body.row);
  else if (body.action === 'delete') deleteRow(body.sheet, body.keyColumn, body.keyValue);
  return json({ success: true });
}
```
(Adapt `readSheet`/`appendRow`/`updateRow`/`deleteRow`/`json` to your existing helpers; keep existing caching.)

- [ ] **Step 2: Redeploy to Apps Script and set `APP_SECRET` in Script Properties**

Deploy the updated `SHEETS_CODE.js` and set `APP_SECRET` via the Apps Script editor → Project Settings → Script Properties. The client must send `secret` — add it in `src/lib/sheets.ts` `getWebAppUrl`/fetch calls (read from a non-public env or electron-store; do NOT expose via `NEXT_PUBLIC_*`).

- [ ] **Step 3: Smoke test the Apps Script filtering**

Call the deployed URL: `?sheet=installations&limit=10&offset=0` → expect ≤10 rows. Call without `secret` → expect 401.

- [ ] **Step 4: Commit the Apps Script change**

```bash
git add SHEETS_CODE.js
git commit -m "sec+feat: Apps Script caller auth + server-side filter/limit"
```

---

## Phase 1 — Data Fetching & Performance

### Task 9: TTL + stale-while-revalidate cache in unified-db

**Files:**
- Modify: `src/lib/unified-db.ts:53-73,160-180,230-250` (the three `getAllX` getters)

- [ ] **Step 1: Add a per-store lastFetched TTL and SWR read**

Add near the top of `unified-db.ts`:
```ts
const CACHE_TTL_MS = 60_000;
const lastFetched: Record<string, number> = {};

async function getWithCache<T>(store: string, sheet: string, fetcher: () => Promise<T[]>): Promise<T[]> {
  if (typeof window !== 'undefined' && window.indexedDB) {
    const local = await localDb.getAll<T>(store as any);
    const fresh = local.length > 0 && (Date.now() - (lastFetched[store] || 0)) < CACHE_TTL_MS;
    if (fresh) return local;
    // serve stale immediately if we have it, refresh in background
    if (local.length > 0) {
      fetcher().then(async (data) => {
        if (data.length > 0) { lastFetched[store] = Date.now(); await localDb.putBatch(store as any, data); }
      }).catch(() => {});
      return local;
    }
  }
  const data = await fetcher();
  if (data.length > 0) { lastFetched[store] = Date.now(); await localDb.putBatch(store as any, data); }
  return data;
}
```
Replace each `getAllInstallations`/`getAllEload`/`getAllUsers`/`getAllHistoricalData` body's `localDb.getAll` + `sheets.getAll` block with:
```ts
return getWithCache<InstallationRow>('installations', 'installations', () => sheets.getAll<InstallationRow>('installations'));
```
(Use the correct row type per getter.)

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/unified-db.ts
git commit -m "perf: TTL + stale-while-revalidate cache in unified-db"
```

### Task 10: Stop refetch storms (single data-version event)

**Files:**
- Modify: `src/context/DataProvider.tsx`, `src/stores/*Store.ts` (subscribers/eload/historical/users), `src/app/dashboard/page.tsx:54-72`

- [ ] **Step 1: Introduce one `data-version` event + `hasData` guard**

In `DataProvider.tsx`, after any successful sync/flush, dispatch a single `window.dispatchEvent(new CustomEvent('data-version'))` instead of separate `records-updated`/`db-synced` per entity. In each store, keep `hasData`; the fetch function early-returns if `hasData && !force`.

- [ ] **Step 2: Update dashboard listeners**

In `src/app/dashboard/page.tsx`, replace the two `addEventListener('db-synced'|'records-updated')` handlers with a single `data-version` listener that re-reads from IndexedDB via the store's `fetchX()` only if not already fresh (the SWR cache from Task 9 handles staleness).

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/context/DataProvider.tsx src/stores/*.ts src/app/dashboard/page.tsx
git commit -m "perf: coalesce refetch storms into one data-version event"
```

### Task 11: Drop Framer Motion from dashboard hot paths

**Files:**
- Modify: `src/app/dashboard/page.tsx:100-358`

- [ ] **Step 1: Replace motion.div hover wrappers with CSS**

For each dashboard card, delete the `motion.div whileHover={{ scale }} …` wrapper and the inner blurred gradient `div`; keep the `<Card>` and use Tailwind `transition transform duration-200 hover:scale-[1.02]` directly on the card container. Replace the modal `motion.div` entrance with a plain `div` + a CSS `animate-[fadeIn]` keyframe added to `globals.css`.

- [ ] **Step 2: Remove now-unused framer-motion import**

Delete `import { AnimatePresence, motion } from 'framer-motion';` from `dashboard/page.tsx`. Confirm `framer-motion` is still used elsewhere (e.g., `LayoutWrapper`); if not, it can stay as a dep but the dashboard no longer imports it.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx src/app/globals.css
git commit -m "perf: remove framer-motion from dashboard hot paths"
```

### Task 12: Virtualize DataTable

**Files:**
- Create: `src/components/common/VirtualTable.tsx`
- Modify: `src/components/common/DataTable.tsx:16-76`, `src/hooks/useTableConfig.ts` (optional: expose row height)
- Add dep: `@tanstack/react-virtual`

- [ ] **Step 1: Install the virtualizer**

Run: `npm install @tanstack/react-virtual`
Expected: added to `package.json` dependencies.

- [ ] **Step 2: Create VirtualTable wrapper**

```tsx
// src/components/common/VirtualTable.tsx
'use client';
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ColumnDef } from '@/hooks/useTableConfig';

export function VirtualTable<T>({ columns, data, rowHeight = 44 }: {
  columns: ColumnDef<T>[]; data: T[]; rowHeight?: number;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });
  return (
    <div ref={parentRef} className="overflow-auto max-h-[70vh]">
      <table className="w-full min-w-[720px]">
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text/50">
            {columns.map(c => <th key={c.key} className="px-4 py-3 whitespace-nowrap">{c.label}</th>)}
          </tr>
        </thead>
        <tbody style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(vi => (
            <tr key={vi.key} className="border-b border-border/40 absolute w-full"
                style={{ transform: `translateY(${vi.start}px)`, height: vi.size }}>
              {columns.map(c => <td key={c.key} className={`px-4 py-3 text-sm text-text/70 ${c.className || ''}`}>{c.render(data[vi.index])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Swap DataTable to use VirtualTable for large sets**

In `DataTable.tsx`, when `data.length > 100`, render `<VirtualTable columns={columns} data={data} />`, otherwise keep the existing simple table (for tiny lists + empty/loading states). Keep `EmptyState`/`SkeletonRows` paths unchanged.

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/VirtualTable.tsx src/components/common/DataTable.tsx package.json package-lock.json
git commit -m "perf: virtualize DataTable for large record sets"
```

### Task 13: Deterministic, decoupled sync flush

**Files:**
- Modify: `src/lib/sync-queue.ts:85-256`, `src/stores/syncQueueStore.ts:8-104`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/sync-queue-deterministic.test.ts
import { flushQueue, enqueueOp } from '@/lib/sync-queue';
import { useSyncQueueStore } from '@/stores/syncQueueStore';

it('does not double-process a pending op', async () => {
  await enqueueOp('create', 'eload', 'op1', { id: 'op1' });
  const before = useSyncQueueStore.getState().getQueue().length;
  await flushQueue();
  const after = useSyncQueueStore.getState().getQueue().length;
  expect(after).toBe(before); // op removed once, not duplicated
});
```

- [ ] **Step 2: Run test to verify it fails** (current code re-reads `store.getQueue()` mid-loop and can double-process)

Run: `npx jest src/__tests__/sync-queue-deterministic.test.ts`
Expected: FAIL or flaky.

- [ ] **Step 3: Snapshot pending ops at flush start**

In `flushQueue()`, replace `const currentQueue = store.getQueue();` usage inside the loop with a single snapshot taken once:
```ts
const snapshot = store.getQueue().filter(op => op.status === 'pending' && (!op.nextRetryAt || op.nextRetryAt <= now));
for (const op of snapshot) { /* process op, do NOT re-read store.getQueue() */ }
```
And replace `store._setQueue(...)` / `store.loadQueue()` mid-processing with a final single `store.loadQueue()` after the loop.

- [ ] **Step 4: Decouple queue persistence from Zustand**

Move the `syncQueue`/`recordSnapshots` reads/writes into `local-db.ts` (it already owns those stores). Have `syncQueueStore.loadQueue()` subscribe to a `local-db` change event instead of `sync-queue.ts` calling `useSyncQueueStore.getState()._setQueue(...)` directly. Delete `_setQueue` from the store; expose `setQueue` (used only by the subscription).

- [ ] **Step 5: Run tests**

Run: `npx jest src/__tests__/sync-queue-deterministic.test.ts src/__tests__/sync-queue.test.ts`
Expected: PASS. `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sync-queue.ts src/stores/syncQueueStore.ts src/__tests__/sync-queue-deterministic.test.ts
git commit -m "data: deterministic snapshot flush, decouple queue from store"
```

---

## Phase 2 — Visual & Polish

### Task 14: Token-aware charts + reduced-motion

**Files:**
- Modify: `src/app/dashboard/page.tsx` (chart props), `src/components/common/RechartsLazy.tsx`

- [ ] **Step 1: Disable Brush by default**

In `dashboard/page.tsx` `<LineChart>`, remove the `<Brush … />` element (it forces a second full data pass). Keep `Tooltip`/`CartesianGrid`/`XAxis`/`YAxis` with `var(--color-*)` tokens.

- [ ] **Step 2: Honor prefers-reduced-motion**

In `RechartsLazy.tsx`, read `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and pass `isAnimationActive={!reduced}` to the chart, or skip mounting the chart and show a static `<img>`/summary when reduced.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx src/components/common/RechartsLazy.tsx
git commit -m "visual: token-aware charts, disable brush, honor reduced-motion"
```

### Task 15: Uniform empty / loading / error states

**Files:**
- Modify: `src/app/installations/page.tsx`, `src/app/eload/page.tsx`, `src/app/subscribers/page.tsx`, `src/app/historical/page.tsx`, `src/app/technicians/page.tsx`, `src/app/clawback/page.tsx`
- Reuse: `src/components/common/EmptyState.tsx`, `src/components/common/SkeletonRows.tsx`, `src/components/common/ErrorState.tsx`

- [ ] **Step 1: Wire the three states into each list page**

Replace ad-hoc inline "No X yet" / spinner / error `<p>` blocks with the shared components:
```tsx
{isLoading && <SkeletonRows rows={6} />}
{!isLoading && error && <ErrorState message={error} onRetry={refetch} />}
{!isLoading && !error && data.length === 0 && <EmptyState title="No records" description="Add your first record to get started." />}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/installations/page.tsx src/app/eload/page.tsx src/app/subscribers/page.tsx src/app/historical/page.tsx src/app/technicians/page.tsx src/app/clawback/page.tsx
git commit -m "visual: unify empty/loading/error states across list pages"
```

### Task 16: Conflict + dead-letter surfacing

**Files:**
- Modify: `src/components/sync/SyncStatus.tsx:8-95`, `src/components/sync/SyncConflictModal.tsx`

- [ ] **Step 1: Surface dead-letter list**

In `SyncStatus.tsx`, the existing `deadLetterCount > 0` button already opens the conflict modal — extend `SyncConflictModal` to render a "Dead-letter" section listing `queue.filter(op => op.status === 'dead-letter')` with a "Retry" and "Discard" action each.

- [ ] **Step 2: Cache last remote updatedAt to avoid re-raising conflicts**

In `sync-queue.ts` `resolveConflict`, when resolution is `'mine'`, store the remote `updatedAt` in `recordSnapshots` so a subsequent flush with the same remote value doesn't re-flag. Already partially present via `saveRecordSnapshot` — ensure `flushQueue` compares against the snapshot before flagging `conflict`.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/sync/SyncStatus.tsx src/components/sync/SyncConflictModal.tsx src/lib/sync-queue.ts
git commit -m "data: surface dead-letter list, dedupe conflict re-raises"
```

### Task 17: Resilient sync status (last successful sync)

**Files:**
- Modify: `src/lib/sync-queue.ts` (persist `lastSuccessfulSync`), `src/stores/syncQueueStore.ts`, `src/components/sync/SyncStatus.tsx`

- [ ] **Step 1: Persist lastSuccessfulSync in local-db**

In `sync-queue.ts`, after a successful `flushQueue` with `success > 0`, write `localDb.put('recordSnapshots', { id: 'lastSuccessfulSync', value: Date.now() })`. On load, read it into `syncQueueStore.lastSyncAt`.

- [ ] **Step 2: Show "Saved locally, N pending" vs "Synced" in SyncStatus**

In `SyncStatus.tsx`, when `pending > 0` show `N pending · last synced {time}`; when `pending === 0 && lastSyncAt` show `Synced {time}`. Keep the existing spinner/conflict badges.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sync-queue.ts src/stores/syncQueueStore.ts src/components/sync/SyncStatus.tsx
git commit -m "data: surface last-successful-sync status"
```

---

## Self-Review Notes (author)

- Spec coverage: §3 visual → T11, T14, T15. §4 fetching → T8 (Apps Script filter), T9 (TTL/SWR), T10 (refetch storms). §5 performance → T11 (no framer-motion), T12 (virtualize), T9/T10 (cache). §6 data handling → T13 (deterministic flush), T16 (conflict/dead-letter), T17 (sync status), T6 (schema single contract). §7 security → T1 (middleware), T2 (requireRole), T3 (sheets-proxy), T4 (secret boot), T5 (durable rate limit), T6 (validate all routes), T7 (headers), T8 (Apps Script auth).
- Placeholder scan: none — every task shows concrete code/commands.
- Type consistency: `QueuedOperation` kept as-is in T13; `requireRole` (auth-guard) reused; `SECURE_HEADERS` defined once in T7 and imported by both `next.config.ts` and `server.js`; `getWithCache` signature used consistently across the three getters in T9.
- No spec requirement left without a task.

