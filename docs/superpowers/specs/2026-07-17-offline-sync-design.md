# Offline Sync & Conflict Resolution Design

## Status
Approved for implementation. User confirmed direction 2026-07-17.

## Context

3EJS Tech ISP management app is used by multiple technicians on separate devices, all sharing a Google Sheets backend. Users need to work fully offline (no internet), with changes syncing automatically when back online. When concurrent offline changes conflict, any user can resolve the conflict.

---

## 1. Offline Login

### How it works

Credentials (username + bcrypt-hashed password) are stored in IndexedDB when the user first logs in online. On subsequent offline logins:

1. User enters username + password on the login screen
2. App checks IndexedDB `users` store for matching username
3. Verifies password hash against stored hash using `verifyPassword()`
4. If match → session created locally (same JWT cookie mechanism, signed with existing `SESSION_SECRET`)
5. If no match → show "Cannot verify credentials offline. Connect to internet to log in."

```ts
// In AuthContext / login flow
const user = await localDb.getById('users', username);
if (!user) throw new Error('User not found offline');
const valid = await verifyPassword(password, user.passwordHash);
if (!valid) throw new Error('Invalid credentials');
// Create local session cookie...
```

### Session persistence
- JWT session cookie stored in `localStorage` (same as now, just without a backend verification on each request since we're offline)
- Middleware skips auth checks when offline detected

### Offline detection
```ts
const isOnline = navigator.onLine;
window.addEventListener('online', () => { /* trigger sync */ });
window.addEventListener('offline', () => { /* show offline badge */ });
```

---

## 2. Local-First Data Architecture

### All writes go to IndexedDB first

Every create/update/delete in the app writes to IndexedDB immediately, then enqueues a sync operation:

```
User action → Write to IndexedDB → Enqueue sync operation → Show success UI
                                    ↓
                            (if online) flush queue to Sheets
                            (if offline) queue waits
```

This is already partially implemented via `sync-queue.ts` + `local-db.ts`. We enhance it.

### Data integrity verification (checksum)

Each record gets a checksum on write:

```ts
import { createHash } from 'crypto';

function checksum(data: Record<string, unknown>): string {
  const stable = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(stable).digest('hex').slice(0, 16);
}

// Stored on each record in IndexedDB:
{ id, ...data, _checksum: 'a1b2c3d4e5f6', _lastModifiedBy: 'username', _updatedAt: 'ISO date' }
```

On sync, checksum validates Sheets hasn't silently changed between read and write (CORS/network corruption protection).

---

## 3. Sync Queue

### Queue structure (already in `syncQueue` IndexedDB store)

Each queued operation (QueuedOperation) stores:
- `id` — unique op ID
- `type` — 'create' | 'update' | 'delete'
- `sheet` — 'installations' | 'eload' | etc.
- `keyColumn` — 'id' (or accountNumber for eload)
- `keyValue` — the record ID
- `data` — the changed fields
- `timestamp` — when the change was made locally
- `_lastModifiedBy` — username of the person who made the change ← NEW
- `status` — 'pending' | 'syncing' | 'conflict' | 'dead-letter' | 'resolved'
- `conflictData` — the remote version if conflict detected ← already exists
- `retryCount` — number of retry attempts

### Sheet columns needed (Sheets side)

Add columns to each Google Sheet:
- `__lastModifiedBy` — username who last modified this row
- `__updatedAt` — ISO timestamp of last change
- `__checksum` — hash of current row state (for integrity)

### Flush order

Operations flush in **timestamp order** (oldest first). This prevents newer changes from overwriting older ones in the queue.

### Offline-to-online transition

```ts
window.addEventListener('online', async () => {
  // Small delay to let connection stabilize
  await new Promise(r => setTimeout(r, 2000));
  await flushQueue();
});
```

---

## 4. Conflict Detection & Resolution

### When is a conflict detected?

During `flushQueue`, before applying an `update` operation:

1. Fetch the current row from Google Sheets (by `keyColumn` + `keyValue`)
2. Compare `_updatedAt` in Sheets vs `op.updatedAt` (the timestamp of when the local change was made)
3. If remote `_updatedAt` is **newer** than the local change's `op.timestamp` → **CONFLICT**
4. Also compare `_checksum` — if Sheets row checksum differs from expected, corruption detected

### Conflict screen (`SyncConflictModal.tsx`)

Shows side-by-side comparison:

```
┌─────────────────────────────────────────────────�─────┐
│  ⚠️ Conflict Detected                              │
│  Subscriber: Juan dela Cruz (Account #A-001)       │
│                                                  │   │
│  YOUR VERSION          │  SHEETS VERSION          │   │
│  Modified by: You      │  Modified by: Mario      │   │
│  Jul 17 10:30 AM       │  Jul 17 10:35 AM          │   │
│                                                  │   │
│  Status: Active        │  Status: Inactive         │   │
│  Address: 123 Main St  │  Address: 123 Main St     │   │
│                                                  │   │
│  [Keep Mine]  [Keep Theirs]  [Retry Later]        │
└─────────────────────────────────────────────────┘
```

- "Your Version" uses `op.data` + `op._lastModifiedBy`
- "Sheets Version" uses `op.conflictData` + `conflictData._lastModifiedBy`
- Only fields that differ are highlighted
- Any user (regardless of who caused the conflict) can pick

### Conflict resolution actions

| Action | Behavior |
|--------|----------|
| **Keep Mine** | Push local version to Sheets, overwrite remote. Queue cleared for this op. |
| **Keep Theirs** | Discard local change. Queue cleared. Show toast "Change discarded — Mario's version kept". |
| **Retry Later** | Re-queue for later sync. Sets `nextRetryAt` to 5 minutes from now. |

After resolution, `lastSuccessfulSync` is updated to prevent repeated re-raising.

### Conflict de-duplication (from Task 16 — already implemented)

When "Keep Mine" is chosen, store `remoteRow._updatedAt` in `recordSnapshots`. Subsequent syncs compare against this snapshot — if Sheets still has the same `_updatedAt`, no new conflict is raised.

---

## 5. User Identity & Attribution

### Adding users (online only)

Since users must be created while online (credentials stored in Sheets), the flow is:
1. Admin creates user via app UI → writes to Sheets `users` table
2. When offline user comes online, `syncFromRemote()` pulls latest users and stores in IndexedDB
3. Offline user can now log in locally

### User roles

All users are admins (per user request). `UserRole` enum still exists but is not enforced for permissions — it's used for attribution only (`_lastModifiedBy`).

### Tracking who changed what

Every write operation records the current username:

```ts
// When enqueueing an op
await enqueueOp('update', 'installations', id, changes, latestUpdatedAt);
// Changes come from the current user's session (AuthContext.user.username)
```

---

## 6. Data Integrity Verification

### On sync (pushing to Sheets)

Before sending data, recompute checksum of the local record and compare with what Sheets had when we last fetched it. If mismatch → data was corrupted mid-flight or modified by another process → raise conflict with `isIntegrityError` flag.

### On sync (pulling from Sheets)

After fetching from Sheets, compute checksum of received row. If it doesn't match `_checksum` in Sheets → Google Sheets internal corruption or network error → treat as integrity error, show alert, don't overwrite local data.

### Integrity error handling

```ts
if (result.isIntegrityError) {
  store.addNotification('Data integrity check failed. Changes saved locally.', 'error');
  await updateOpStatus(op, { status: 'dead-letter', lastError: 'Integrity check failed' });
}
```

---

## 7. Notifications & Feedback

### Offline notification after login (new)

When a user logs in and `navigator.onLine === false`, show a dismissible banner/information panel on the dashboard:

```
┌────────────────────────────────────────────────────────────────┐
│ 📡 Offline Mode                                                │
│ Last synced: Jul 17, 10:30 AM                                 │
│                                                                │
│ 10 changes saved locally, waiting to sync:                     │
│  • Mario Santos — Installation — Account #A-001 (2 min ago)  │
│  • Juan Cruz — E-Load — Account #A-003 (5 min ago)            │
│  • ...                                                         │
│                                                                │
│ Changes will sync automatically when you're back online.       │
│                                              [Dismiss] [Sync] │
└────────────────────────────────────────────────────────────────┘
```

- "Last synced" = `lastSyncAt` from `recordSnapshots` (already exists from Task 17)
- "10 changes" = count of `syncQueue` ops where `status === 'pending'`
- Each pending op shown with: `username` (from `_lastModifiedBy`), `sheet`, `keyValue` (shortened), time ago since `timestamp`
- "Sync" button only enabled when back online — clicking triggers `flushQueue()`
- Banner auto-dismisses after user navigates to a different page
- If online, show normal sync status badge (existing `SyncStatus` component)

### Sync animation (new — "Sync Pipeline" modal)

When back online and `flushQueue()` runs, show a full-screen overlay modal with a modern animated sync visualization:

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                    ⟳  Syncing 10 changes...                   │
│                                                                │
│   ┌──────────────────────────────────────────────────────┐    │
│   │                                                      │    │
│   │  [📱] ───────────────○────────────────────> [☁️]    │    │
│   │   Mario           Syncing              Google       │    │
│   │  Santos           Installation          Sheets       │    │
│   │                                                      │    │
│   │              ✓ Synced  ✓ Synced  ○ Pending          │    │
│   │                                                      │    │
│   └──────────────────────────────────────────────────────┘    │
│                                                                │
│   Syncing: Mario Santos — Installation #A-001                 │
│   ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  4 of 10           │
│                                                                │
│                                             [Cancel] [Done]   │
└────────────────────────────────────────────────────────────────┘
```

**Animation breakdown:**

1. **Entry**: Modal slides up from bottom with a spring animation (`scale(0.95) → scale(1)`, `opacity: 0 → 1`, 300ms)
2. **Pipeline visualization**:
   - Left side: device icon representing the local change (animates with a subtle "sending" pulse)
   - Center: flowing dashed line with animated dash-offset (moves toward cloud) — shows data in transit
   - Right side: cloud icon that "pulses" when receiving data
3. **Progress items**: Each queued op shows as a card that animates:
   - Pending: card slides in from left, sits at start of pipeline with a subtle bounce
   - Syncing: card moves along the pipeline path (CSS transition `translateX`, 600ms ease-in-out)
   - Synced: card gets a green checkmark overlay, fades slightly, moves to "done" section
   - Failed/Conflict: card turns amber/red, stops, shows error icon
4. **Progress bar**: Bottom of modal — animated fill from left to right (`width` transition, proportional to `success / total`)
5. **Text feedback**: "Syncing: [Name] — [Type] #[ID]" updates live as each op is processed
6. **Exit**: On completion, modal shows a checkmark animation, then slides down after 1.5s. Conflicts show a brief "X conflict(s) need your attention" before auto-dismiss.

**Implementation details:**

```tsx
// SyncAnimationModal.tsx — rendered during flushQueue()
interface SyncingOp {
  id: string;
  who: string;          // _lastModifiedBy
  type: 'create' | 'update' | 'delete';
  sheet: string;
  keyValue: string;
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
}

// Pipeline animation uses CSS keyframes + transforms:
// - .sync-pipeline-line: animated dash-offset for flowing effect
// - .sync-card: transitions on translateX for moving along path
// - .sync-pulse: keyframe animation on device/cloud icons
```

**Conflict state during animation:**

If an op hits conflict while the animation is running:
1. Card freezes at its current position
2. Turns amber with a shake animation (2-3 small horizontal oscillations)
3. Conflict badge appears on card
4. Modal stays open — user must resolve conflict before the animation can complete
5. After resolution, card either resumes (retry) or is replaced by a "discarded" state and removed

**Cancel behavior:**

Clicking "Cancel" during sync:
- In-progress op completes its network request
- Remaining queued ops are left in `'pending'` status
- Modal dismisses, sync status badge updates to "X pending" (cancelled)
- User can manually trigger sync again later

### Sync status indicators

Expand `SyncStatus.tsx` to show:
- Offline badge: "Offline — changes saved locally" (yellow)
- Syncing: "Syncing X changes..." (spinning) — triggers the animation modal
- Success: "X changes synced" (green, 3s auto-dismiss)
- Conflict: "X conflict(s) — tap to resolve" (amber, requires action)
- Dead-letter: "X changes failed — tap for details" (red)
- Conflict resolved by other user: "Mario resolved a conflict affecting your data" (info)

### Dead-letter surfacing

Already in Task 16 — shows failed ops in conflict modal with Retry/Discard per op.

---

## 8. Tech Stack Additions

No new packages. All features use existing IndexedDB + existing sync queue + bcryptjs already in the project.

New columns in Google Sheets (requires manual setup or Apps Script update):
- `__lastModifiedBy` (text)
- `__updatedAt` (datetime)
- `__checksum` (text, 16-char hex)

---

## 9. Testing Strategy

- Test offline login: deny access when no local user match
- Test queue persistence: kill app mid-sync, restart, verify queue intact
- Test conflict detection: mock Sheets returning newer `_updatedAt`
- Test conflict resolution: "Keep Mine" overwrites Sheets; "Keep Theirs" discards local
- Test checksum mismatch: simulate network corruption mid-push
- Test multi-device sync: two offline changes to same record, sync sequentially

---

## Files to Modify

| File | Change |
|------|--------|
| `src/context/AuthContext.tsx` | Offline credential check via IndexedDB |
| `src/lib/sync-queue.ts` | Add `_lastModifiedBy` to ops, checksum verification, conflict screen data |
| `src/components/sync/SyncConflictModal.tsx` | Side-by-side comparison, 3 resolution actions |
| `src/lib/local-db.ts` | Store user credentials (hashed) for offline login |
| `src/app/login/page.tsx` | Show "offline mode" message when can't reach server |
| `src/lib/unified-db.ts` | Compute/store checksums on records, track `_lastModifiedBy` |
| `SHEETS_CODE.js` | Add `__lastModifiedBy`, `__updatedAt`, `__checksum` columns on writes |
| `src/context/DataProvider.tsx` | Trigger `flushQueue` on `online` event, show offline notification |
| `src/components/sync/SyncStatus.tsx` | Offline badge, conflict attribution labels |
| `src/components/sync/SyncAnimationModal.tsx` | NEW — animated sync pipeline visualization |
| `src/components/common/OfflineBanner.tsx` | NEW — offline notification panel after login |
| `next.config.ts` / `src/lib/secure-headers.ts` | No changes needed |

---

## Self-Review

- **Placeholder scan**: No TBD/TODO — all features fully specified.
- **Internal consistency**: Checksum flow consistent across write/read/verify steps. Conflict resolution actions clearly defined. Offline login uses existing bcrypt infrastructure.
- **Scope**: Focused on offline-first + multi-user conflict resolution. Does not include real-time collaboration, WebSocket, or background sync services.
- **Ambiguity check**: "Anyone can resolve conflict" is explicit — any online user can pick. Attribution labels in conflict screen show `_lastModifiedBy` for both versions.