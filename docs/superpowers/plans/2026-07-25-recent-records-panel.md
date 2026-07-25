# Recent Records Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a slide-out panel from the right side that auto-opens when a new record is successfully saved, showing the last 5 records with Subscriber Name, Account Number, Date Installed, and sync status indicators. Auto-dismisses after 5 seconds.

**Architecture:** A new `RecentRecordsPanel` React component slides in from the right viewport edge, triggered by a custom DOM event dispatched from the sync queue after a successful flush. The panel fetches data from IndexedDB via `getAllInstallations()` and renders each record with a progress indicator for sync status.

**Tech Stack:** React, TypeScript, Tailwind CSS, Zustand, lucide-react icons, IndexedDB

---

### Task 1: Add `record-saved` event dispatch to sync queue

**Files:**
- Modify: `src/lib/sync-queue.ts:295-298`

- [ ] **Step 1: Add `record-saved` event dispatch after successful sync**

In `src/lib/sync-queue.ts`, inside the `if (success > 0)` block (around line 295), add:

```typescript
window.dispatchEvent(new CustomEvent('record-saved', { detail: { count: success } }));
```

Right after `store.addNotification(...)` line.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/sync-queue.ts
git commit -m "feat: dispatch record-saved event after successful sync flush"
```

---

### Task 2: Create `RecentRecordsPanel` component

**Files:**
- Create: `src/components/recent-records/RecentRecordsPanel.tsx`

- [ ] **Step 1: Create directory**

Run: `mkdir -p src/components/recent-records`

- [ ] **Step 2: Create `RecentRecordsPanel.tsx`**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { getAllInstallations } from '@/lib/unified-db';
import type { InstallationRow } from '@/lib/types';

function formatSyncStatus(row: InstallationRow): { label: string; color: string } {
  const synced = row.updatedAt && row._lastModifiedBy === 'sheets';
  const localOnly = row.updatedAt && !synced;
  if (synced) return { label: 'Synced', color: 'bg-green-500' };
  if (localOnly) return { label: 'Local', color: 'bg-amber-500' };
  return { label: 'Pending', color: 'bg-gray-400' };
}

export default function RecentRecordsPanel() {
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const fetchRecords = useCallback(async () => {
    try {
      const data = await getAllInstallations();
      const recent = data
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      setRecords(recent);
      setVisible(true);
      setPaused(false);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 5000);
    } catch {
      setVisible(false);
    }
  }, []);

  const dismissPanel = useCallback(() => {
    setVisible(false);
    if (timer) clearTimeout(timer);
  }, [timer]);

  const resetTimer = useCallback(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(dismissPanel, 5000);
  }, [timer, dismissPanel]);

  useEffect(() => {
    const handler = () => {
      fetchRecords();
      resetTimer();
    };
    window.addEventListener('record-saved', handler);
    return () => {
      window.removeEventListener('record-saved', handler);
      if (timer) clearTimeout(timer);
    };
  }, [fetchRecords, resetTimer]);

  if (!visible) return null;

  return (
    <div className="fixed right-0 top-16 z-50 w-96 max-w-[90vw] bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-out animate-slide-in" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} role="dialog" aria-modal="false" aria-label="Recent records panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Records</h3>
        <button onClick={() => setVisible(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close recent records panel">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {records.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No recent records</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {records.map((row) => {
              const sync = formatSyncStatus(row);
              return (
                <li key={row.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{row.subscriberName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{row.accountNumber}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{row.dateInstalled ? new Date(row.dateInstalled).toLocaleDateString() : ''}</p>
                    </div>
                    <div className="ml-3 flex items-center gap-1.5">
                      <span className={`inline-block w-2 h-2 rounded-full ${sync.color}`} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{sync.label}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/recent-records/RecentRecordsPanel.tsx
git commit -m "feat: add RecentRecordsPanel slide-out component"
```

---

### Task 3: Wire panel into the app layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Read current layout.tsx**

Read `src/app/layout.tsx` to find the sync provider wrapper location.

- [ ] **Step 2: Import and place RecentRecordsPanel**

Add import: `import RecentRecordsPanel from '@/components/recent-records/RecentRecordsPanel';`

Place `<RecentRecordsPanel />` inside `<SyncProvider>` wrapper, after `{children}`:

```tsx
<SyncProvider>
  <ClientRipple />
  <DataLoader />
  {children}
  <RecentRecordsPanel />
</SyncProvider>
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: wire RecentRecordsPanel into app layout"
```

---

### Task 4: Add animation keyframe for slide-in

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add `slide-in` animation**

Add to `src/app/globals.css`:

```css
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in-right 300ms ease-out;
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add slide-in-right animation for recent records panel"
```

---

### Task 5: Verify build passes

**Files:** No source changes.

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: PASS with no errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS (0 errors)

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: verify build passes with recent records panel"
```