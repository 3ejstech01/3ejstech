# Google Sheets Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase with Google Sheets as the primary data backend, remove all Supabase code, and implement no-password login.

**Architecture:** A new `sheets.ts` client talks to the existing Apps Script Web App (4 sheets: installations, eload, users, historicaldata). All CRUD goes through `sheets.ts` → falls back to IndexedDB. Supabase code is deleted. Login becomes username-only lookup.

**Tech Stack:** Next.js 16, TypeScript, Google Apps Script (existing SHEETS_CODE.js), IndexedDB, Zustand

---

### Task 1: Create Google Sheets client (`src/lib/sheets.ts`)

**Files:**
- Create: `src/lib/sheets.ts`
- Reference: `SHEETS_CODE.js` (for API contract)

- [ ] **Step 1: Create the sheets client**

Write `src/lib/sheets.ts`:

```typescript
const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || '';

export interface SheetsResponse<T> {
  data: T[] | null;
  error: string | null;
}

async function sheetsFetch<T>(
  sheet: string,
  options: {
    action?: 'append' | 'update' | 'delete' | 'filter';
    row?: Record<string, unknown>;
    keyColumn?: string;
    keyValue?: string;
  } = {}
): Promise<SheetsResponse<T>> {
  if (!WEBAPP_URL) {
    return { data: null, error: 'Google Sheets Web App URL not configured' };
  }

  try {
    // GET: read all rows from a sheet
    if (!options.action) {
      const url = `${WEBAPP_URL}?sheet=${encodeURIComponent(sheet)}`;
      const res = await fetch(url);
      if (!res.ok) {
        return { data: null, error: `HTTP ${res.status}: ${res.statusText}` };
      }
      const json = await res.json();
      if (json.error) {
        return { data: null, error: json.error };
      }
      return { data: Array.isArray(json) ? json : [], error: null };
    }

    // POST: append, update, delete, filter
    const payload: Record<string, unknown> = {
      sheet,
      action: options.action,
    };
    if (options.row) payload.row = options.row;
    if (options.keyColumn) payload.keyColumn = options.keyColumn;
    if (options.keyValue) payload.keyValue = options.keyValue;

    const res = await fetch(WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { data: null, error: `HTTP ${res.status}: ${res.statusText}` };
    }

    const json = await res.json();
    if (json.error) {
      return { data: null, error: json.error };
    }

    // For filter action, return the matching rows
    if (options.action === 'filter') {
      return { data: Array.isArray(json) ? json : [], error: null };
    }

    return { data: [json], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

async function getAll<T>(sheet: string): Promise<T[]> {
  const { data, error } = await sheetsFetch<T>(sheet);
  if (error) {
    console.error(`[Sheets] Error fetching ${sheet}:`, error);
    return [];
  }
  return data || [];
}

async function appendRow(sheet: string, row: Record<string, unknown>): Promise<boolean> {
  const { error } = await sheetsFetch(sheet, { action: 'append', row });
  if (error) {
    console.error(`[Sheets] Error appending to ${sheet}:`, error);
    return false;
  }
  return true;
}

async function updateRow(sheet: string, keyColumn: string, keyValue: string, row: Record<string, unknown>): Promise<boolean> {
  const { error } = await sheetsFetch(sheet, { action: 'update', keyColumn, keyValue, row });
  if (error) {
    console.error(`[Sheets] Error updating ${sheet}:`, error);
    return false;
  }
  return true;
}

async function deleteRow(sheet: string, keyColumn: string, keyValue: string): Promise<boolean> {
  const { error } = await sheetsFetch(sheet, { action: 'delete', keyColumn, keyValue });
  if (error) {
    console.error(`[Sheets] Error deleting from ${sheet}:`, error);
    return false;
  }
  return true;
}

async function filterRows<T>(sheet: string, keyColumn: string, keyValue: string): Promise<T[]> {
  const { data, error } = await sheetsFetch<T>(sheet, { action: 'filter', keyColumn, keyValue });
  if (error) {
    console.error(`[Sheets] Error filtering ${sheet}:`, error);
    return [];
  }
  return data || [];
}

export const sheets = {
  getAll,
  appendRow,
  updateRow,
  deleteRow,
  filterRows,
  fetch: sheetsFetch,
};
```

### Task 2: Rewrite `unified-db.ts` to use sheets client

**Files:**
- Modify: `src/lib/unified-db.ts` (full rewrite — strip all Supabase references, use sheets client)
- Keep: `src/lib/local-db.ts` (unchanged)
- Keep: `src/lib/auth-utils.ts` (but no longer used for login — may still be used for user creation)

- [ ] **Step 1: Rewrite unified-db.ts**

Replace entire file content:

```typescript
import { sheets } from './sheets';
import { localDb } from './local-db';
import { hashPasswordIfNeeded } from './auth-utils';

export interface InstallationRow {
  id: string; no?: string; dateInstalled?: string; agentName?: string;
  joNumber?: string; accountNumber?: string; subscriberName?: string;
  contactNumber1?: string; contactNumber2?: string; address?: string;
  houseLatitude?: string; houseLongitude?: string; port?: string;
  assignedTechnician?: string; modemSerial?: string;
  reelNo?: string; reelStart?: string; reelEnd?: string;
  fiberOpticCable?: string; mechanicalConnector?: string; sClamp?: string;
  patchcordApsc?: string; houseBracket?: string; midspan?: string;
  cableClip?: string; ftthTerminalBox?: string; doubleSidedTape?: string;
  cableTieWrap?: string; status?: string; monthInstalled?: string;
  yearInstalled?: string; loadExpire?: string; createdAt?: string; updatedAt?: string;
  notifyStatus?: string; loadStatus?: string;
}

export interface ELoadRow {
  id: string; gcashHandler?: string; dateLoaded?: string; gcashReference?: string;
  timeLoaded?: string; amount?: number; accountNumber?: string;
  markup?: number; incentive?: number; retailer?: number; dealer?: number;
  remarks?: string; createdAt?: string; updatedAt?: string;
}

export interface HistoricalDataRow {
  id: string;
  dateInstalled?: string; joNumber?: string; accountNumber?: string;
  subscriberName?: string; address?: string; contactNumber1?: string;
  contactNumber2?: string; assignedTechnician?: string; modemSerial?: string;
  port?: string; napBoxLonglat?: string;
  fiberOpticCable?: string; mechanicalConnector?: string; sClamp?: string;
  patchcordApsc?: string; houseBracket?: string; midspan?: string;
  cableClip?: string; ftthTerminalBox?: string; doubleSidedTape?: string;
  cableTieWrap?: string;
  gcashHandler?: string; gcashReference?: string; timeLoaded?: string;
  amount?: number; markup?: number; incentive?: number; retailer?: number;
  dealer?: number; remarks?: string; createdAt?: string; updatedAt?: string;
}

export interface UserRow {
  id: string; username: string; password: string; role: string; createdAt?: string;
}

// ── Installations ──────────────────────────────────────

export async function getAllInstallations(): Promise<InstallationRow[]> {
  try {
    const data = await sheets.getAll<InstallationRow>('installations');
    if (data.length > 0) {
      if (typeof window !== 'undefined' && window.indexedDB) {
        await localDb.putBatch('installations', data);
      }
      return data;
    }
  } catch (e) {
    console.warn('[DB] Sheets fetch failed, trying IndexedDB:', e);
  }
  if (typeof window !== 'undefined' && window.indexedDB) {
    return localDb.getAll<InstallationRow>('installations');
  }
  return [];
}

export async function createInstallation(data: Partial<InstallationRow>): Promise<InstallationRow> {
  const now = new Date().toISOString();
  const id = data.id || `INST-${Date.now()}`;

  let loadExpire = data.loadExpire;
  if (data.dateInstalled && !loadExpire) {
    const d = new Date(data.dateInstalled);
    d.setDate(d.getDate() + 90);
    loadExpire = d.toISOString().split('T')[0];
  }

  const row: InstallationRow = {
    ...data,
    id,
    loadExpire,
    createdAt: now,
    updatedAt: now,
  } as InstallationRow;

  try {
    await sheets.appendRow('installations', row as unknown as Record<string, unknown>);
  } catch (e) {
    console.warn('[DB] Sheets write failed:', e);
  }

  if (typeof window !== 'undefined' && window.indexedDB) {
    try { await localDb.put('installations', row); } catch (e) { console.warn('[DB] IndexedDB write failed:', e); }
  }

  return row;
}

export async function updateInstallation(id: string, data: Partial<InstallationRow>): Promise<InstallationRow | undefined> {
  let existing: InstallationRow | undefined;
  if (typeof window !== 'undefined' && window.indexedDB) {
    try { existing = await localDb.getById<InstallationRow>('installations', id); } catch (e) { /* ignore */ }
  }

  if (!existing) {
    const all = await getAllInstallations();
    existing = all.find(i => i.id === id);
  }

  if (!existing) return undefined;

  let loadExpire = data.loadExpire;
  if (data.dateInstalled && !loadExpire && data.dateInstalled !== existing.dateInstalled) {
    const d = new Date(data.dateInstalled);
    d.setDate(d.getDate() + 90);
    loadExpire = d.toISOString().split('T')[0];
  }

  const updated = { ...existing, ...data, loadExpire: loadExpire || existing.loadExpire, updatedAt: new Date().toISOString() };

  try {
    await sheets.updateRow('installations', 'id', id, updated as unknown as Record<string, unknown>);
  } catch (e) {
    console.warn('[DB] Sheets update failed:', e);
  }

  if (typeof window !== 'undefined' && window.indexedDB) {
    try { await localDb.put('installations', updated); } catch (e) { console.warn('[DB] IndexedDB write failed:', e); }
  }

  return updated;
}

export async function deleteInstallation(id: string): Promise<boolean> {
  try {
    await sheets.deleteRow('installations', 'id', id);
  } catch (e) {
    console.warn('[DB] Sheets delete failed:', e);
  }
  if (typeof window !== 'undefined' && window.indexedDB) {
    try { await localDb.remove('installations', id); } catch (e) { /* ignore */ }
  }
  return true;
}

// ── E-Load ─────────────────────────────────────────────

export async function getAllEload(): Promise<ELoadRow[]> {
  try {
    const data = await sheets.getAll<ELoadRow>('eload');
    if (data.length > 0) {
      if (typeof window !== 'undefined' && window.indexedDB) {
        await localDb.putBatch('eload', data);
      }
      return data;
    }
  } catch (e) {
    console.warn('[DB] Sheets fetch failed, trying IndexedDB:', e);
  }
  if (typeof window !== 'undefined' && window.indexedDB) {
    return localDb.getAll<ELoadRow>('eload');
  }
  return [];
}

export async function createEload(data: Partial<ELoadRow>): Promise<ELoadRow> {
  const now = new Date().toISOString();
  const id = data.id || `EL-${Date.now()}`;
  const row: ELoadRow = { ...data, id, createdAt: now, updatedAt: now } as ELoadRow;

  try {
    await sheets.appendRow('eload', row as unknown as Record<string, unknown>);
  } catch (e) {
    console.warn('[DB] Sheets write failed:', e);
  }

  if (typeof window !== 'undefined' && window.indexedDB) {
    try { await localDb.put('eload', row); } catch (e) { console.warn('[DB] IndexedDB write failed:', e); }
  }

  return row;
}

export async function updateEload(id: string, data: Partial<ELoadRow>): Promise<ELoadRow | undefined> {
  const existing = await localDb.getById<ELoadRow>('eload', id);
  if (!existing) {
    const all = await getAllEload();
    const found = all.find(e => e.id === id);
    if (!found) return undefined;
  }
  const base = existing || { id } as ELoadRow;
  const updated = { ...base, ...data, updatedAt: new Date().toISOString() };

  try {
    await sheets.updateRow('eload', 'id', id, updated as unknown as Record<string, unknown>);
  } catch (e) {
    console.warn('[DB] Sheets update failed:', e);
  }

  if (typeof window !== 'undefined' && window.indexedDB) {
    try { await localDb.put('eload', updated); } catch (e) { console.warn('[DB] IndexedDB write failed:', e); }
  }

  return updated;
}

export async function deleteEload(id: string): Promise<boolean> {
  try {
    await sheets.deleteRow('eload', 'id', id);
  } catch (e) {
    console.warn('[DB] Sheets delete failed:', e);
  }
  if (typeof window !== 'undefined' && window.indexedDB) {
    try { await localDb.remove('eload', id); } catch (e) { /* ignore */ }
  }
  return true;
}

// ── Users ──────────────────────────────────────────────

export async function getAllUsers(): Promise<UserRow[]> {
  try {
    const data = await sheets.getAll<UserRow>('users');
    if (data.length > 0) {
      if (typeof window !== 'undefined' && window.indexedDB) {
        await localDb.putBatch('users', data);
      }
      return data;
    }
  } catch (e) {
    console.warn('[DB] Sheets fetch failed, trying IndexedDB:', e);
  }
  if (typeof window !== 'undefined' && window.indexedDB) {
    return localDb.getAll<UserRow>('users');
  }
  return [];
}

export async function createUser(data: { username: string; password: string; role: string }): Promise<UserRow> {
  const now = new Date().toISOString();
  const hashedPassword = await hashPasswordIfNeeded(data.password);
  const row: UserRow = {
    id: data.username,
    username: data.username,
    password: hashedPassword,
    role: data.role,
    createdAt: now,
  };

  try {
    await sheets.appendRow('users', row as unknown as Record<string, unknown>);
  } catch (e) {
    console.warn('[DB] Sheets write failed:', e);
  }

  await localDb.put('users', row);
  return row;
}

export async function updateUser(id: string, data: { username?: string; password?: string; role?: string }): Promise<UserRow | null> {
  const users = await getAllUsers();
  const existing = users.find(u => u.id === id);
  if (!existing) return null;

  const updates: Partial<UserRow> = { ...existing };
  if (data.username !== undefined) updates.username = data.username;
  if (data.password !== undefined) updates.password = await hashPasswordIfNeeded(data.password);
  if (data.role !== undefined) updates.role = data.role;
  const updated = updates as UserRow;

  try {
    await sheets.updateRow('users', 'id', id, updated as unknown as Record<string, unknown>);
  } catch (e) {
    console.warn('[DB] Sheets update failed:', e);
  }

  await localDb.put('users', updated);
  return updated;
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await sheets.deleteRow('users', 'id', id);
  } catch (e) {
    console.warn('[DB] Sheets delete failed:', e);
  }
  await localDb.remove('users', id);
  return true;
}

export async function authenticateUser(username: string): Promise<UserRow | null> {
  const users = await getAllUsers();
  const user = users.find(u => u.username?.toLowerCase() === username.toLowerCase());
  return user || null;
}

// ── Historical Data ────────────────────────────────────

export async function getAllHistoricalData(): Promise<HistoricalDataRow[]> {
  try {
    const data = await sheets.getAll<HistoricalDataRow>('historicaldata');
    if (data.length > 0) {
      if (typeof window !== 'undefined' && window.indexedDB) {
        await localDb.putBatch('historicaldata', data);
      }
      return data;
    }
  } catch (e) {
    console.warn('[DB] Sheets fetch failed:', e);
  }
  return [];
}

// ── Sync ───────────────────────────────────────────────

export async function syncFromRemote(): Promise<void> {
  try {
    const [installations, eload, users, historicaldata] = await Promise.all([
      getAllInstallations(), getAllEload(), getAllUsers(), getAllHistoricalData(),
    ]);

    await Promise.all([
      localDb.putBatch('installations', installations),
      localDb.putBatch('eload', eload),
      localDb.putBatch('users', users),
      localDb.putBatch('historicaldata', historicaldata),
    ]);

    console.log('[Sync] Complete — installations:', installations.length, '| eload:', eload.length, '| users:', users.length, '| historicaldata:', historicaldata.length);
  } catch (err) {
    console.error('[Sync] Failed:', err);
  }
}

// ── Auto-Load & Archive ────────────────────────────────

export async function checkAndUpdateInstallationForLoad(accountNumber: string, _createdAt: string): Promise<void> {
  try {
    const installations = await getAllInstallations();
    const installation = installations.find(inst => inst.accountNumber === accountNumber);
    if (installation && installation.loadStatus !== 'Account Loaded') {
      const updates: Partial<InstallationRow> = { loadStatus: 'Account Loaded' };
      if (installation.notifyStatus === 'Not Yet Notified') {
        updates.notifyStatus = 'Not Needed';
      }
      await updateInstallation(installation.id, updates);
    }
  } catch (error) {
    console.error('[Auto-Load] Failed:', error);
  }
}

export async function archivePreviousYears(currentYear: number): Promise<number> {
  try {
    const installations = await getAllInstallations();
    const toArchive = installations.filter(inst => {
      const year = parseInt(String(inst.yearInstalled || ''));
      return !isNaN(year) && year < currentYear;
    });

    if (toArchive.length === 0) return 0;

    const historicalRecords: HistoricalDataRow[] = toArchive.map(inst => ({
      id: inst.id, dateInstalled: inst.dateInstalled, joNumber: inst.joNumber,
      accountNumber: inst.accountNumber, subscriberName: inst.subscriberName,
      address: inst.address, contactNumber1: inst.contactNumber1,
      contactNumber2: inst.contactNumber2, assignedTechnician: inst.assignedTechnician,
      modemSerial: inst.modemSerial, port: inst.port, napBoxLonglat: '',
      fiberOpticCable: inst.fiberOpticCable, mechanicalConnector: inst.mechanicalConnector,
      sClamp: inst.sClamp, patchcordApsc: inst.patchcordApsc, houseBracket: inst.houseBracket,
      midspan: inst.midspan, cableClip: inst.cableClip, ftthTerminalBox: inst.ftthTerminalBox,
      doubleSidedTape: inst.doubleSidedTape, cableTieWrap: inst.cableTieWrap,
      gcashHandler: '', gcashReference: '', timeLoaded: '', amount: 0, markup: 0,
      incentive: 0, retailer: 0, dealer: 0, remarks: '', createdAt: inst.createdAt, updatedAt: inst.updatedAt,
    }));

    for (const record of historicalRecords) {
      try { await sheets.appendRow('historicaldata', record as unknown as Record<string, unknown>); } catch (e) { console.warn('[Archive] Sheets append failed:', e); }
      try { await sheets.deleteRow('installations', 'id', record.id); } catch (e) { console.warn('[Archive] Sheets delete failed:', e); }
    }

    if (typeof window !== 'undefined' && window.indexedDB) {
      await localDb.putBatch('historicaldata', historicalRecords);
      for (const record of historicalRecords) {
        await localDb.remove('installations', record.id);
      }
    }

    return toArchive.length;
  } catch (error) {
    console.error('[Archive] Failed:', error);
    throw error;
  }
}

export { localDb };
```

### Task 3: Rewrite API routes to use unified-db (remove supabase.ts dependency)

**Files:**
- Modify: `src/app/api/users/route.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Delete: `src/lib/supabase.ts`
- Modify: `.env.example`

- [ ] **Step 1: Rewrite `/api/users/route.ts`**

Replace imports and implementation to use `unified-db.ts` instead of `supabase.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, updateUser, deleteUser } from '@/lib/unified-db';
import { hashPasswordIfNeeded } from '@/lib/auth-utils';

export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json(users.map(u => ({
      id: u.id || u.username,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
    })));
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.username || !data.role) {
      return NextResponse.json({ error: 'Username and role are required' }, { status: 400 });
    }
    if (data.username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    const user = await createUser({
      username: data.username,
      password: data.password || 'default',
      role: data.role,
    });

    return NextResponse.json({ id: user.id, username: user.username, role: user.role, createdAt: user.createdAt }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const updated = await updateUser(id, {
      username: data.username,
      password: data.password,
      role: data.role,
    });

    if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ id, username: updated.username, role: updated.role });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Rewrite `/api/auth/login/route.ts`**

No password check — just look up username:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/unified-db';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const users = await getAllUsers();
    const user = users.find(u => u.username?.toLowerCase() === username.toLowerCase());

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id || user.username,
        username: user.username,
        name: user.username,
        email: `${user.username}@3jes.local`,
        role: user.role || 'view_only',
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.createdAt || new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Delete `src/lib/supabase.ts`**

- [ ] **Step 4: Update `.env.example`**

```env
# Google Sheets Web App URL (from Apps Script deployment)
NEXT_PUBLIC_WEBAPP_URL=https://script.google.com/macros/s/YOUR_WEB_APP_ID/exec

# App Configuration
NEXT_PUBLIC_APP_NAME=3EJS Tech

# Data Source
DATA_SOURCE=sheets
```

### Task 4: Cleanup unused references

**Files:**
- Modify: `src/lib/database.ts`
- Check: `src/lib/axios.ts`
- Check: `src/lib/api.ts`

- [ ] **Step 1: Simplify `src/lib/database.ts`**

```typescript
export { syncFromRemote } from './unified-db';
export { default } from './unified-db';

export async function getEloadTransactionsByAccount(accountNumber: string) {
  const { getAllEload } = await import('./unified-db');
  const allTransactions = await getAllEload();
  return allTransactions.filter(t => t.accountNumber === accountNumber);
}
```

- [ ] **Step 2: Check if `src/lib/axios.ts` or `src/lib/api.ts` still have supabase references**

Use grep to verify no remaining references to supabase anywhere in the codebase.

### Task 5: Verify build compiles

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Run lint**

```bash
npx next lint
```

Fix any lint errors.

### Task 6: Final verification

- [ ] **Step 1: Grep for remaining supabase references**

```bash
rg -i "supabase" --include="*.ts" --include="*.tsx" --include="*.js" src/
```

Ensure zero remaining references in source code (node_modules and .next excluded).