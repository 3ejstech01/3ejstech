# Offline Sync & Conflict Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable offline-first data editing with automatic sync when back online, multi-user conflict detection, checksum-based integrity verification, and a modern animated sync pipeline visualization.

**Architecture:** All writes go to IndexedDB first, then queue as sync operations. On reconnect, operations flush to Google Sheets in timestamp order. Conflicts are detected via `updatedAt` comparison and surfaced in a side-by-side conflict screen. Checksums on every record detect silent corruption.

**Tech Stack:** No new packages. All features use existing IndexedDB (`local-db.ts`), existing sync queue (`sync-queue.ts`), existing bcryptjs, existing Zustand stores, CSS animations.

---

## File Structure

| New File | Responsibility |
|----------|---------------|
| `src/components/sync/SyncAnimationModal.tsx` | Full-screen animated sync pipeline modal, shown during flushQueue() |
| `src/components/common/OfflineBanner.tsx` | Dismissible offline notification panel shown after login when offline |
| `src/lib/checksum.ts` | SHA-256 checksum utility for record integrity |
| `src/hooks/useOnlineStatus.ts` | React hook wrapping `navigator.onLine` + online/offline events |
| `src/__tests__/checksum.test.ts` | Tests for checksum computation and verification |

| Modified File | Change |
|-------------|--------|
| `src/lib/sync-queue.ts` | Add `_lastModifiedBy` to QueuedOperation, checksum on push, conflict screen integration |
| `src/lib/unified-db.ts` | Compute/store checksums and `_lastModifiedBy` on every write |
| `src/lib/local-db.ts` | Add `STORES` entry for `credentials` (hashed user passwords for offline login) |
| `src/context/AuthContext.tsx` | Try IndexedDB first for login when offline; fall back to server if online |
| `src/app/login/page.tsx` | Show "offline mode" indicator; handle offline login |
| `src/context/DataProvider.tsx` | Listen for `online` event to trigger `flushQueue()`; show `OfflineBanner` when offline |
| `src/components/sync/SyncStatus.tsx` | Offline badge, conflict attribution labels |
| `src/components/sync/SyncConflictModal.tsx` | Side-by-side comparison, Keep Mine / Keep Theirs / Retry Later |
| `src/components/sync/SyncQueueStore.ts` | Expose `_lastModifiedBy` on queue ops; `syncingOps` state for animation |
| `SHEETS_CODE.js` | On every write, set `__lastModifiedBy`, `__updatedAt`, `__checksum` columns |

---

## Task 1: Checksum utility + useOnlineStatus hook

**Files:**
- Create: `src/lib/checksum.ts`
- Create: `src/hooks/useOnlineStatus.ts`
- Test: `src/__tests__/checksum.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/__tests__/checksum.test.ts
import { computeChecksum, verifyChecksum } from '@/lib/checksum';

it('computes a stable hash from an object', () => {
  const data = { name: 'Juan', role: 'admin', updatedAt: '2026-07-17' };
  const hash = computeChecksum(data);
  expect(typeof hash).toBe('string');
  expect(hash.length).toBe(16); // 16-char hex
});

it('returns same hash for same data regardless of key order', () => {
  const a = { name: 'Juan', role: 'admin' };
  const b = { role: 'admin', name: 'Juan' };
  expect(computeChecksum(a)).toBe(computeChecksum(b));
});

it('returns different hash for different data', () => {
  const a = { name: 'Juan' };
  const b = { name: 'Mario' };
  expect(computeChecksum(a)).not.toBe(computeChecksum(b));
});

it('verifies checksum matches', () => {
  const data = { name: 'Juan' };
  const hash = computeChecksum(data);
  expect(verifyChecksum(data, hash)).toBe(true);
  expect(verifyChecksum({ name: 'Mario' }, hash)).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/checksum.test.ts --no-coverage`
Expected: FAIL — `computeChecksum` not defined

- [ ] **Step 3: Implement checksum.ts**

```ts
// src/lib/checksum.ts
import { createHash } from 'crypto';

export function computeChecksum(data: Record<string, unknown>): string {
  const stable = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(stable).digest('hex').slice(0, 16);
}

export function verifyChecksum(data: Record<string, unknown>, checksum: string): boolean {
  return computeChecksum(data) === checksum;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/checksum.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Implement useOnlineStatus hook**

```ts
// src/hooks/useOnlineStatus.ts
'use client';
import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/checksum.ts src/hooks/useOnlineStatus.ts src/__tests__/checksum.test.ts
git commit -m "feat(offline): checksum utility + useOnlineStatus hook"
```

---

## Task 2: Add `_lastModifiedBy` to sync queue operations

**Files:**
- Modify: `src/stores/syncQueueStore.ts`
- Modify: `src/lib/sync-queue.ts`

- [ ] **Step 1: Update QueuedOperation type to include `_lastModifiedBy`**

Read `src/stores/syncQueueStore.ts` first. Find the `QueuedOperation` interface and add:

```ts
_lastModifiedBy?: string;
```

Also in `syncQueueStore`, add a new state slice for tracking ops being animated:

```ts
syncingOps: SyncingOp[]; // for animation

setSyncingOps: (ops: SyncingOp[]) => void;
updateSyncingOp: (id: string, status: SyncingOp['status']) => void;
```

Where `SyncingOp` is:

```ts
interface SyncingOp {
  id: string;
  who: string;       // _lastModifiedBy
  type: 'create' | 'update' | 'delete';
  sheet: string;
  keyValue: string;
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
}
```

- [ ] **Step 2: Update `enqueueOp` to accept and store `_lastModifiedBy`**

In `src/lib/sync-queue.ts`, update `enqueueOp` signature:

```ts
export async function enqueueOp(
  type: OpType,
  sheet: SheetName,
  keyValue: string,
  data: Record<string, unknown>,
  updatedAt?: string,
  lastModifiedBy?: string  // NEW
): Promise<void>
```

Store it in the op object:

```ts
const op: QueuedOperation = {
  // ... existing fields ...
  _lastModifiedBy: lastModifiedBy || 'unknown',
};
```

- [ ] **Step 3: Pass `_lastModifiedBy` from all call sites**

Find all places that call `enqueueOp` — primarily `unified-db.ts` `create`/`update`/`delete` functions. Add the current username from `AuthContext`:

```ts
// In unified-db.ts, update createInstallation, updateInstallation, deleteInstallation
// Import useAuth at top-level store access is tricky — pass via context instead:
// Alternative: store current user in a module-level variable when they log in
// Add to AuthContext login: window.__currentUser = username;
// Then read it here:
const currentUser = typeof window !== 'undefined' ? (window as any).__currentUser : 'unknown';
```

Or simpler: thread the username through the call chain. The write functions in `unified-db.ts` that call `enqueueOp` should also accept `lastModifiedBy` from their callers. Check `src/app/api/installations/route.ts` — it already has the `request` object; add `UserRole` import and get username from session.

For now, update `enqueueOp` and the call sites pass `lastModifiedBy`. If no session available, default to `'unknown'`.

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/stores/syncQueueStore.ts src/lib/sync-queue.ts
git commit -m "feat(offline): add _lastModifiedBy to sync queue ops"
```

---

## Task 3: Add checksums to record writes + track `_lastModifiedBy`

**Files:**
- Modify: `src/lib/unified-db.ts`
- Modify: `src/lib/local-db.ts`

- [ ] **Step 1: Read current unified-db.ts record creation functions**

Focus on `createInstallation`, `updateInstallation`, `createEload`, `updateEload`, `createUser`, `updateUser`. These are the write paths that should compute and store checksums + `_lastModifiedBy`.

- [ ] **Step 2: Add checksum computation before enqueueOp**

In each create/update function, before calling `enqueueOp`, compute the checksum of the record:

```ts
import { computeChecksum } from './checksum';

// In updateInstallation, before enqueueOp:
const recordForChecksum = { ...data, updatedAt: new Date().toISOString() };
const checksum = computeChecksum(recordForChecksum);
const recordWithMeta = { ...data, _checksum: checksum, _lastModifiedBy: currentUser };
```

The actual Google Sheets write will handle `_checksum` and `_lastModifiedBy` — on the local side, store them in IndexedDB too for verification.

In `localDb.putBatch`, records already go to IndexedDB. Add the `_checksum` and `_lastModifiedBy` fields to the record before storing.

- [ ] **Step 3: Update local-db.ts STORES if needed**

The `STORES` array already includes `'installations'`, `'eload'`, `'users'`, etc. No change needed — IndexedDB stores any fields.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/unified-db.ts src/lib/local-db.ts
git commit -m "feat(offline): compute checksums on record writes, track _lastModifiedBy"
```

---

## Task 4: Offline login via IndexedDB credentials

**Files:**
- Modify: `src/lib/local-db.ts`
- Modify: `src/context/AuthContext.tsx`
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Add hashed credentials store to local-db.ts**

Add a `credentials` store to `STORES`:

```ts
const STORES = ['installations', 'eload', 'modems', 'users', 'historicaldata', 'syncQueue', 'recordSnapshots', 'credentials'] as const;
```

- [ ] **Step 2: Update AuthContext login flow for offline**

Read current `AuthContext.tsx`. Modify the `login` function:

```ts
const login = async (username: string) => {
  setIsLoading(true);
  try {
    // Try online login first if connected
    if (navigator.onLine) {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username }),
      });
      if (response.ok) {
        const data = await response.json();
        // ... existing success path ...
        // Also cache credentials locally for offline login
        const user = await localDb.getById('users', username);
        if (user) {
          await localDb.put('credentials', { id: username, passwordHash: user.password });
        }
        return;
      }
    }

    // Fallback to offline login via IndexedDB
    const cred = await localDb.getById('credentials', username);
    if (!cred) throw new Error('Cannot verify credentials offline. Connect to internet to log in.');

    // Password check not needed for username-only login — just verify user exists locally
    const user = await localDb.getById('users', username);
    if (!user) throw new Error('User not found offline');

    // Create local session
    setUser(user);
  } catch (error) {
    throw error;
  } finally {
    setIsLoading(false);
  }
};
```

- [ ] **Step 3: Cache credentials on successful online login**

When `login` succeeds online, store the password hash locally for offline use:

```ts
// After successful online login, in the success branch:
const allUsers = await localDb.getAll('users');
const userRecord = allUsers.find((u: any) => u.username === username);
if (userRecord?.password) {
  await localDb.put('credentials', { id: username, passwordHash: userRecord.password });
}
```

Note: `userRecord.password` in IndexedDB is the bcrypt hash stored from the `users` sheet.

- [ ] **Step 4: Update login page for offline mode**

Read `src/app/login/page.tsx`. Show an indicator when offline:

```tsx
// After getAllUsers() in the login page, add an online status indicator:
const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

{!isOnline && (
  <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
    <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
    Offline mode — log in with cached credentials
  </p>
)}
```

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`

- [ ] **Step 6: Commit**

```bash
git add src/lib/local-db.ts src/context/AuthContext.tsx src/app/login/page.tsx
git commit -m "feat(offline): offline login via IndexedDB credentials"
```

---

## Task 5: Online/offline trigger + OfflineBanner component

**Files:**
- Create: `src/components/common/OfflineBanner.tsx`
- Modify: `src/context/DataProvider.tsx`

- [ ] **Step 1: Create OfflineBanner.tsx**

```tsx
'use client';
import { useState, useEffect } from 'react';
import { useSyncQueueStore } from '@/stores/syncQueueStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatRelativeTime } from './utils'; // reuse existing from SyncStatus.tsx

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function OfflineBanner({ onSync }: { onSync: () => void }) {
  const isOnline = useOnlineStatus();
  const { queue, lastSyncAt } = useSyncQueueStore();
  const [dismissed, setDismissed] = useState(false);
  const [pageKey, setPageKey] = useState(0);

  const pending = queue.filter(op => op.status === 'pending' || op.status === 'syncing');

  // Auto-dismiss when navigating (simple: increment key on route change)
  useEffect(() => {
    if (dismissed) setDismissed(false);
  }, [pageKey]);

  if (isOnline || dismissed || pending.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 mb-4 animate-[slideDown_0.3s_ease-out]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-lg">📡</span>
          <div>
            <p className="text-sm font-semibold text-amber-300">Offline Mode</p>
            <p className="text-xs text-amber-400/70">
              Last synced: {lastSyncAt ? formatRelativeTime(lastSyncAt) : 'never'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400/50 hover:text-amber-300 text-sm"
        >
          ✕
        </button>
      </div>

      <p className="text-xs text-amber-300 mt-2 mb-3">
        {pending.length} change{pending.length > 1 ? 's' : ''} saved locally, waiting to sync:
      </p>

      <div className="space-y-1 max-h-24 overflow-y-auto">
        {pending.slice(0, 10).map(op => (
          <div key={op.id} className="flex items-center gap-2 text-xs text-amber-200/70">
            <span className="w-1.5 h-1.5 bg-amber-400/50 rounded-full" />
            <span className="font-medium">{op._lastModifiedBy || 'Unknown'}</span>
            <span>—</span>
            <span className="capitalize">{op.type}</span>
            <span>—</span>
            <span className="truncate max-w-[120px]">{op.keyValue}</span>
            <span className="ml-auto text-amber-300/50">{timeAgo(op.timestamp)}</span>
          </div>
        ))}
        {pending.length > 10 && (
          <p className="text-xs text-amber-300/50">...and {pending.length - 10} more</p>
        )}
      </div>

      <p className="text-xs text-amber-200/60 mt-3">
        Changes will sync automatically when you're back online.
      </p>
    </div>
  );
}
```

Add to `globals.css`:

```css
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Wire DataProvider to trigger flushQueue on reconnect**

Read `src/context/DataProvider.tsx`. Modify:

```ts
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { flushQueue } from '@/lib/sync-queue';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        await syncFromRemote();
        window.dispatchEvent(new CustomEvent('data-version'));
        setIsReady(true);
      } catch (err) {
        console.error('[DataProvider] Failed to load data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Trigger sync when coming back online
  useEffect(() => {
    if (wasOffline && isOnline) {
      // Small delay to let connection stabilize
      const t = setTimeout(() => {
        flushQueue();
      }, 2000);
      return () => clearTimeout(t);
    }
    if (!isOnline) setWasOffline(true);
  }, [isOnline]);
```

- [ ] **Step 3: Wire OfflineBanner into dashboard page**

Read `src/app/dashboard/page.tsx`. Import and add `OfflineBanner` near the top of the page content. Pass `onSync={flushQueue}`.

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add src/components/common/OfflineBanner.tsx src/context/DataProvider.tsx src/app/dashboard/page.tsx src/app/globals.css
git commit -m "feat(offline): offline banner + online reconnect trigger"
```

---

## Task 6: Side-by-side conflict resolution screen

**Files:**
- Modify: `src/components/sync/SyncConflictModal.tsx`
- Modify: `src/lib/sync-queue.ts`

- [ ] **Step 1: Read current SyncConflictModal.tsx**

Read `src/components/sync/SyncConflictModal.tsx` to understand its current state structure and render.

- [ ] **Step 2: Extend resolveConflict to pass both versions**

In `src/lib/sync-queue.ts`, update `resolveConflict` to store the full remote row on the op before marking conflict:

In `flushQueue`, when a conflict is detected:

```ts
await updateOpStatus(op, {
  status: 'conflict',
  conflictData: { ...current, _lastModifiedBy: current._lastModifiedBy }
});
```

The `conflictData` already stores the full row — ensure `_lastModifiedBy` is in there from Sheets.

- [ ] **Step 3: Rewrite SyncConflictModal with side-by-side comparison**

Replace the modal content with:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Conflict Detected                                          │
│  {sheet} — {keyValue}                                          │
│                                                                 │
│  ┌─────────────────────┐   ┌─────────────────────┐              │
│  │  YOUR VERSION       │   │  SHEETS VERSION      │              │
│  │  By: You            │   │  By: {conflictData.  │              │
│  │  When: {op.timestamp}│   │  _lastModifiedBy}   │              │
│  │                     │   │  When: {conflictData.│              │
│  │  {diffed fields}    │   │  __updatedAt}        │              │
│  │                     │   │                      │              │
│  │  [Keep Mine]        │   │  [Keep Theirs]       │              │
│  └─────────────────────┘   └─────────────────────┘              │
│                                                                 │
│                        [Retry Later]                             │
└─────────────────────────────────────────────────────────────────┘
```

For each field that differs between `op.data` and `op.conflictData`, highlight the different values. Only show differing fields (or show all fields with differences highlighted).

Implementation: iterate over all keys in both objects, find keys that differ, render those rows.

- [ ] **Step 4: Wire resolve actions**

The three buttons call functions already in `sync-queue.ts`:
- "Keep Mine" → `resolveConflict(op.id, 'mine')` — pushes local to Sheets
- "Keep Theirs" → `resolveConflict(op.id, 'theirs')` — discards local
- "Retry Later" → `resolveConflict(op.id, 'retry')` — re-queues

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`

- [ ] **Step 6: Commit**

```bash
git add src/components/sync/SyncConflictModal.tsx src/lib/sync-queue.ts
git commit -m "feat(offline): side-by-side conflict resolution screen"
```

---

## Task 7: Animated Sync Pipeline Modal

**Files:**
- Create: `src/components/sync/SyncAnimationModal.tsx`
- Modify: `src/stores/syncQueueStore.ts` (add `showAnimationModal`, `syncingOps` state)

- [ ] **Step 1: Add animation state to syncQueueStore**

```ts
showAnimationModal: boolean;
syncingOps: SyncingOp[];
setShowAnimationModal: (show: boolean) => void;
setSyncingOps: (ops: SyncingOp[]) => void;
updateSyncingOp: (id: string, status: SyncingOp['status']) => void;
```

- [ ] **Step 2: Create SyncAnimationModal.tsx**

The modal has:
1. Backdrop blur overlay (`fixed inset-0 bg-black/50 backdrop-blur-sm z-50`)
2. Centered card with the pipeline visualization
3. Animated pipeline line (CSS `stroke-dashoffset` animation)
4. Cards for each op that animate along the path
5. Progress bar at bottom
6. Live text showing current operation

Key animation details:
- Pipeline line: SVG with `stroke-dasharray="8 4"` and `animation: dash 1s linear infinite`
- Op cards: CSS `transform: translateX()` transitions — 600ms ease-in-out per step
- Entry: `scale(0.9) → scale(1)` + `opacity: 0 → 1` on the modal card
- Success checkmark: SVG circle draws itself with `stroke-dasharray` animation
- Conflict shake: `keyframe` with 3 quick horizontal oscillations

```tsx
// Simplified structure:
export function SyncAnimationModal() {
  const { syncingOps, showAnimationModal, updateSyncingOp } = useSyncQueueStore();

  if (!showAnimationModal) return null;

  const progress = syncingOps.filter(op => op.status === 'synced').length / syncingOps.length;
  const currentOp = syncingOps.find(op => op.status === 'syncing');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-slate-900/95 border border-white/10 rounded-2xl p-8 shadow-2xl animate-[modalEntry_0.3s_ease-out]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2 animate-pulse">⟳</div>
          <h3 className="text-xl font-bold text-white">
            Syncing {syncingOps.length} change{syncingOps.length > 1 ? 's' : ''}...
          </h3>
        </div>

        {/* Pipeline */}
        <div className="relative h-32 mb-4">
          {/* Animated dashed line */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 120">
            <line x1="50" y1="60" x2="350" y2="60"
              stroke="cyan-400" strokeWidth="2" strokeDasharray="8 4"
              className="animate-[dash_1s_linear_infinite]" />
          </svg>

          {/* Device icon (left) */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-3xl animate-pulse">📱</div>

          {/* Cloud icon (right) */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-3xl">☁️</div>

          {/* Syncing op card */}
          {currentOp && (
            <div className="absolute top-1/2 -translate-y-1/2 left-8 animate-[slideIn_0.3s_ease-out]">
              <div className="bg-cyan-500/20 border border-cyan-500/40 rounded-lg px-3 py-2 text-xs text-cyan-300">
                {currentOp.who} — {currentOp.type} {currentOp.sheet}
              </div>
            </div>
          )}
        </div>

        {/* Progress items */}
        <div className="space-y-2 mb-6 max-h-32 overflow-y-auto">
          {syncingOps.map(op => (
            <div key={op.id} className={`flex items-center gap-2 text-xs ${
              op.status === 'synced' ? 'text-green-400' :
              op.status === 'conflict' || op.status === 'failed' ? 'text-amber-400' :
              'text-white/50'
            }`}>
              <span>{op.status === 'synced' ? '✓' : op.status === 'conflict' ? '⚠️' : '○'}</span>
              <span>{op.who}</span>
              <span>—</span>
              <span className="capitalize">{op.type}</span>
              <span>—</span>
              <span className="truncate">{op.keyValue}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <p className="text-xs text-center text-white/40">
          {currentOp ? `Syncing: ${currentOp.who} — ${currentOp.sheet} #${currentOp.keyValue}` : 'All changes synced!'}
        </p>
      </div>
    </div>
  );
}
```

Add to `globals.css`:

```css
@keyframes dash {
  to { stroke-dashoffset: -12; }
}
@keyframes modalEntry {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes slideIn {
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
}
```

- [ ] **Step 3: Wire flushQueue to show animation**

Modify `flushQueue` in `sync-queue.ts` to:
1. On start: set `showAnimationModal: true` and populate `syncingOps` from the queue snapshot
2. On each op status change: call `updateSyncingOp(id, newStatus)` to animate
3. On complete: after 1.5s delay, set `showAnimationModal: false`

Wrap the modal in the app root layout or put it in `DataProvider`.

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add src/components/sync/SyncAnimationModal.tsx src/stores/syncQueueStore.ts src/app/globals.css
git commit -m "feat(offline): animated sync pipeline modal"
```

---

## Task 8: Integrate flushQueue with animation + online detection

**Files:**
- Modify: `src/lib/sync-queue.ts`
- Modify: `src/components/sync/SyncStatus.tsx`

- [ ] **Step 1: Update SyncStatus to trigger animation on sync**

Read `SyncStatus.tsx`. When `isFlushing` becomes true, the `SyncAnimationModal` should be shown (it's rendered at the app level, driven by `syncQueueStore.showAnimationModal`).

No changes to `SyncStatus.tsx` needed — the animation modal is driven by `showAnimationModal` store state, which `flushQueue` sets directly.

- [ ] **Step 2: Ensure flushQueue updates syncingOps state**

In `flushQueue`, for each op processed:

```ts
const store = getSyncQueueStore();

for (const op of snapshot) {
  if (op.status !== 'pending') continue;

  store.updateSyncingOp(op.id, 'syncing');  // triggers animation

  try {
    // ... process op ...
    if (result.success) {
      store.updateSyncingOp(op.id, 'synced');
    } else if (result.isConflict) {
      store.updateSyncingOp(op.id, 'conflict');
    } else {
      store.updateSyncingOp(op.id, 'failed');
    }
  }
}
```

On completion in `flushQueue`:

```ts
// At the end, before returning FlushResult:
if (conflicts > 0) {
  store.setShowConflictModal(true);  // show conflict modal after animation
}
// Animation auto-dismisses after success + 1.5s delay
setTimeout(() => {
  store.setShowAnimationModal(false);
}, 1500);
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/lib/sync-queue.ts
git commit -m "feat(offline): wire flushQueue to animation state"
```

---

## Task 9: Google Sheets — `__lastModifiedBy`, `__updatedAt`, `__checksum` columns

**Files:**
- Modify: `SHEETS_CODE.js`

This task requires user manual deployment. The code changes in Apps Script need to be deployed by the user in their Google Sheet.

- [ ] **Step 1: Update SHEETS_CODE.js**

Read the current `SHEETS_CODE.js`. Add to `doPost` and `doGet`:

For `doPost` writes (append/update/delete), before returning success, compute and store metadata:

```javascript
// At start of doPost, read APP_SECRET (from Task 8 implementation)
function authorized(e) { /* already implemented in prior task */ }

// In append row, prepend metadata columns:
// Build row with __lastModifiedBy, __updatedAt, __checksum at the start
const metaRow = [
  payload._lastModifiedBy || 'unknown',
  new Date().toISOString(),
  '', // __checksum — compute from the data being appended
  ...existingRowFields
];

// In updateRow, update __lastModifiedBy and __updatedAt columns:
// Find column indices for these headers and update them

// Helper to compute checksum:
function computeRowChecksum(row, headers) {
  const obj = {};
  headers.forEach((h, i) => { obj[h] = row[i]; });
  const stable = JSON.stringify(obj, Object.keys(obj).sort());
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256)
    .map(b => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2))
    .join('')
    .slice(0, 16);
}
```

For `doGet`, return `_lastModifiedBy`, `__updatedAt`, `__checksum` as part of each row JSON.

- [ ] **Step 2: User deploys Apps Script**

The updated `SHEETS_CODE.js` needs to be deployed in Google Apps Script. User must:
1. Open Google Sheet → Extensions → Apps Script
2. Replace code with updated `SHEETS_CODE.js`
3. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone
4. Copy new Web App URL to `.env.production` as `NEXT_PUBLIC_WEBAPP_URL`

- [ ] **Step 3: Add metadata columns to Sheets manually**

The user must add these 3 columns to each sheet (Installations, E-Load, Users, HistoricalData):
- Column A or first empty: `__lastModifiedBy` (header)
- Next column: `__updatedAt`
- Next column: `__checksum`

For existing rows, these can be left empty — the Apps Script will populate them on next write.

- [ ] **Step 4: Commit**

```bash
git add SHEETS_CODE.js
git commit -m "feat(offline): sheets metadata columns for sync attribution + integrity"
```

---

## Self-Review Checklist

- [ ] Spec coverage: All 8 sections from design spec mapped to tasks? (Section 1 → T4, Section 2 → T2/T3, Section 3 → T2/T8, Section 4 → T6, Section 5 → T4, Section 6 → T1, Section 7 → T5/T7)
- [ ] Placeholder scan: No TBD/TODO in task steps
- [ ] Type consistency: `QueuedOperation._lastModifiedBy` added in T2, used in T6/T7/T8 consistently
- [ ] All new components have test files: T1 has `checksum.test.ts`
- [ ] `flushQueue` wired to animation in T8 — both `showAnimationModal` and `updateSyncingOp` calls present
- [ ] `online` event listener in DataProvider (T5) triggers `flushQueue` after 2s delay

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-17-offline-sync-implementation.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session with checkpoint reviews after each.

Which approach?