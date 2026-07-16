# 3EJS Tech — Hardening & Enhancement Design (2026-07-16)

## 1. Context & Constraints

**Stack (as-is):** Next.js 16 App Router + Turbopack; Google Sheets (Apps Script web app) as the source of truth; IndexedDB cache (`src/lib/local-db.ts`) + sync queue (`src/lib/sync-queue.ts`); Zustand stores per entity; Framer Motion + Recharts on the dashboard; HMAC session-cookie auth (`src/lib/session.ts`, `src/lib/session-edge.ts`); Electron desktop build (`electron/main.js`, `server.js`).

**Constraints (confirmed with user):**
- **Google Sheets is a FIXED backend** — no SQL/Postgres/Supabase migration. All recommendations stay inside the Sheets + Apps Script model.
- **Record volume is MEDIUM** (~5k–50k rows total across installations + eload + historical + users). The current "fetch all → IndexedDB cache" pattern still works, but needs server-side filtering, smarter cache invalidation, and virtualized tables as guardrails.
- **Targets:** both the web app and the Electron desktop build (shared code).

**Approach:** "Hardening pass" — keep the architecture exactly as-is; deliver all five requested areas as one prioritized, low-risk improvement set. (Alternatives considered and rejected: a proxy/API layer — too much new infra for a "Sheets fixed" project; UI/perf-only — leaves real security gaps unaddressed.)

## 2. Architecture & Data Flow (preserved)

```
Client store (Zustand)
   └─> unified-db (public API)
          ├─> local-db (IndexedDB): reads served from cache first
          └─> sheets (fetch to Apps Script web app): source of truth
   Writes:
     store -> local-db.put  +  sync-queue.enqueueOp
          └─> flushQueue() -> sheets.appendRow / updateRow / deleteRow
```

- **Auth:** HMAC session cookie; `middleware.ts` guards `/api/*` but only exempts `/api/auth/login` (and logout) as public. Client `LayoutWrapper` is the UX guard.
- **Known gaps (see §7):** API routes do not enforce role server-side; `/api/sheets-proxy` is an open relay; rate limit is in-memory per process.

## 3. Visual Enhancements

**Current state:** Dark-first CSS-variable theme already in place (`src/lib/themes.ts`, `ThemeCustomizer`, VS Code presets). Dashboard uses heavy Framer Motion `whileHover` scale + blurred gradient glow on every card, and renders `LineChart` + `Brush` eagerly. Tables are clean but non-virtualized (`DataTable` renders all rows).

1. **Calm the motion.** Replace per-card `motion.div` hover/scale wrappers and blurred gradient layers on the dashboard with pure CSS (`transition` + `hover:` utilities). Keep a single subtle entrance fade. Rationale: Framer Motion is the heaviest client JS after Recharts; removing it from hot paths cuts bundle and repaint cost.
2. **Token-aware charts.** `RechartsLazy` already dynamic-imports Recharts (good) and passes `var(--color-*)` tokens (good). Harden: disable `Brush` by default (it forces a second full data pass); honor `prefers-reduced-motion` to skip chart animation work.
3. **Densify tables.** Add row virtualization (e.g., `@tanstack/react-virtual`) to `DataTable` so 5k–50k rows don't all mount. Tighten padding; keep the existing sticky headers.
4. **Consistent states.** Wire the existing `EmptyState`, `SkeletonRows`, and `ErrorState` components uniformly across all list pages instead of the current ad-hoc inline messages.

## 4. Data Records Fetching

**Current state:** Every list page calls `getAllX()` → `unified-db` → `sheets.getAll(sheet)` which does a full `fetch(`${WEBAPP_URL}?sheet=...)` returning **all rows**; server-side API routes (`/api/installations`, etc.) also return everything. Client caches the full set in IndexedDB and re-fetches on every `records-updated` / `db-synced` event. The Apps Script has no filtering/pagination — `filterRows` still pulls the whole sheet and filters client-side.

1. **Server-side filtering in the Apps Script.** Add `?sheet=&filterColumn=&filterValue=&limit=&offset=` support so the Web App returns subsets. This is the single biggest fetch win at medium volume.
2. **Cache with validation, not blind refetch.** In `unified-db`, add a per-store `lastFetched` TTL (e.g., 60s) + stale-while-revalidate: serve IndexedDB immediately, refresh in background only when stale. Today `fetchSubscribers()` etc. always hit the network on mount and on every sync event.
3. **Stop refetch storms.** The dashboard and list pages all listen to `records-updated`/`db-synced` and re-pull everything. Coalesce: a single shared "data version" event + per-store `hasData` guard so a write flushes the queue and bumps one version, and stores re-read from IndexedDB (local) rather than re-hitting Sheets.
4. **`sheets-proxy` relay.** `/api/sheets-proxy` already exists as a server-side relay; keep it as the only server-side relay (see §7) but pass the same filtering params so proxied calls stay cheap.

## 5. Website Performance

**Current state:** Turbopack dev/build; Recharts lazy-loaded (good); Framer Motion used per-card on the dashboard (heavy); tables render all rows (no virtualization); every list + dashboard store re-fetches full Sheets on mount and on sync events; `images.unoptimized: true` (fine for Sheets-hosted logos).

1. **Drop Framer Motion from hot paths.** Replace dashboard `motion.div` hover/scale with CSS `transition`/`hover:` (ties to §3.1). Removes the largest non-essential client bundle after Recharts and cuts layout/paint cost on a data-dense page.
2. **Virtualize tables.** `@tanstack/react-virtual` in `DataTable` so 5k–50k rows don't all mount (ties to §3.3). Pair with the existing sticky header.
3. **Memoize derived data.** Dashboard already uses `useMemo` for graph/clawback — extend: stabilize Zustand selectors so a single field change doesn't re-run all `useMemo`s; avoid `new Date().getFullYear()` inside render where it forces recompute.
4. **SWR-style caching for reads.** Back the stores' `fetchX()` with the TTL + SWR pattern from §4.2/§4.3 so navigation between tabs reuses IndexedDB instead of re-pulling Sheets.
5. **Trim the client bundle.** `optimizePackageImports` already covers framer-motion/recharts/zustand/lucide — keep it. Confirm `recharts` is the only heavy dep and that `RechartsLazy` is its sole entry. Add `prefers-reduced-motion` to skip chart animation.
6. **Static asset caching.** Ensure `next.config` sets long-lived `Cache-Control` for `/_next/static` (Turbopack does this by default in build), and that the Electron/prod server (`server.js`) sends `Cache-Control: immutable` for hashed assets.

## 6. Data Handling

**Current state:** `unified-db` is the public API; `local-db` (IndexedDB) caches reads and buffers writes via `sync-queue` (`enqueueOp` → `flushQueue`). Flush does append/update/delete against the Apps Script, with `MAX_RETRY_COUNT=3`, exponential backoff, CORS detection, and conflict detection (compares `updatedAt`). `updateOpStatus` mutates the Zustand store directly from the lib (tight coupling), and `flushQueue` re-reads `getQueue()` mid-loop.

1. **Type the queue end-to-end.** `enqueueOp` takes `data: Record<string, unknown>` and casts at the store boundary. Introduce a `QueuedOp<T>` generic so the row shape is checked once, not re-cast in `eloadStore`/`subscribersStore`/etc.
2. **Decouple store from queue.** `sync-queue` calling `useSyncQueueStore.getState()._setQueue(...)` mid-flush is fragile. Move queue persistence to `local-db` (it already owns `syncQueue`/`recordSnapshots` stores) and have the store *subscribe* to it, so flush logic never touches React/Zustand internals.
3. **Make flush deterministic.** Snapshot the pending ops once at the start of `flushQueue` (today it re-reads `store.getQueue()` and can double-process). Process the snapshot; write results back in one batch.
4. **Conflict UX hardening.** Conflict detection only fires on `update` and only when `updatedAt` differs — good. Add: (a) a "last remote `updatedAt`" cache so conflicts aren't re-raised after "mine"; (b) dead-letter surfacing in the UI (today `setHasConflicts(true)` + modal — make the dead-letter list visible/exportable).
5. **Resilient writes.** Keep CORS-detection → local-only, but also persist a `lastSuccessfulSync` timestamp and expose it in `SyncStatus` so the user sees "saved locally, N pending" vs "synced".
6. **Schema/validation at the edge.** `validation.ts` is solid but `InstallationSchema` allows both `camel` and `snake` keys (double-defined) — collapse to one casing post-mapper so the schema is the single contract, not a duplication of `toCamelCaseInstallation` in the route.

## 7. Security Measures

**Current state:** Auth = HMAC-signed session cookie (`session.ts`/`session-edge.ts`); `middleware.ts` guards `/api/*` but only checks `isPublic` for `/api/auth/login` — **all other `/api/*` routes are NOT role-enforced server-side** (they rely on the client `LayoutWrapper` guard). `/api/sheets-proxy` is an **open relay** that forwards any sheet + payload to the Apps Script using `NEXT_PUBLIC_WEBAPP_URL` (a public env var) with no auth check. Rate limit is in-memory per-process (`rate-limit.ts`) — useless across Electron instances / restarts. `SESSION_SECRET` is required in prod but the Electron build had no secret (caused the login 500; now fixed via per-install secret in `electron/main.js` + `.env.production`). Validation exists (`zod`) but only on `installations` + `eload`; `users`/archive routes are unvalidated.

1. **Enforce auth + RBAC server-side.** Move role checks into each API route (or a shared `requireRole` guard — `auth-guard.ts` already has it, currently unused). `middleware` should reject unauthenticated `/api/*` by default and only mark login/logout as public. Client guard stays as UX only.
2. **Lock down `sheets-proxy`.** It currently proxies arbitrary sheet reads/writes with no session check. Either delete it (client can call `sheets.ts` directly) or require an authenticated session + allowlist the permitted sheet names + actions. Never trust `NEXT_PUBLIC_*` for anything privileged.
3. **Secret management.** Keep the Electron per-install `SESSION_SECRET` (already added in `electron/main.js`) and `SESSION_SECRET` in `.env.production` (already added). Add a startup check that refuses to boot in prod without it.
4. **Durable rate limiting + lockout.** Replace the in-memory `rate-limit` with a store-backed limiter (IndexedDB on client, or a small server store) so login lockout survives restarts and works across Electron instances. Keep the 5/60s login rule.
5. **Validate every write route.** Apply `validation.ts` schemas to `users` (already has `UserSchema`), `archive`, and the `[id]` update/delete routes. Reject unknown/extra fields (currently `InstallationSchema` accepts both casings — collapse per §6.6).
6. **Harden headers.** Add a `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy` in `server.js` (prod) and via Next headers for web. Lock CORS on the Apps Script to known origins only.
7. **Least-privilege data flow.** The Apps Script is the real backend — ensure it validates the session/secret too, and that `append`/`update`/`delete` require an authorized caller, not just "knows the URL."

## 8. Testing & Quality

- Extend Jest: validation schemas applied to all routes; `sync-queue` determinism (snapshot, no double-process); rate-limit durability across reload; middleware role enforcement; `sheets-proxy` auth/allowlist.
- `npm run typecheck` and `npm run lint` must stay at 0 errors; `npm run test` green.
- Add a small integration check that the dashboard renders with a mid-size fixture (e.g., 10k rows) without mounting all rows (virtualization).

## 9. Rollout / Sequencing (prioritized)

- **P0 — Security & data integrity:** §7.1 server-side auth/RBAC enforcement, §7.2 lock `sheets-proxy`, §7.5 validate all write routes, §7.3 secret startup check, §6.6 collapse schema casing.
- **P1 — Fetching & performance:** §4.1 server-side filtering in Apps Script, §4.2/§4.3 SWR cache + TTL + stop refetch storms, §5.1 drop Framer Motion from hot paths, §5.2 virtualize tables, §6.3 deterministic flush.
- **P2 — Visual & polish:** §3.1 CSS hover, §3.2 token-aware charts + reduced-motion, §3.4 uniform empty/loading/error states, §6.4 conflict/dead-letter UX, §6.5 resilient sync status.

## 10. Out of Scope

- Replacing Google Sheets with a real database (explicitly declined).
- Removing Electron or switching frameworks.
- Any change to the Apps Script business logic beyond the filtering params in §4.1 and the auth check in §7.7.

---
**Next steps:** Spec written and committed. After user review, invoke `writing-plans` to produce the detailed, phase-ordered implementation plan (P0 → P1 → P2).
