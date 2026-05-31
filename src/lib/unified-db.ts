import { sheets } from './sheets';
import { localDb } from './local-db';
import { hashPasswordIfNeeded } from './auth-utils';
import { enqueueOp, saveRecordSnapshot, getRecordSnapshot } from './sync-queue';
import type { SheetName } from '@/stores/syncQueueStore';

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
  status?: string;
  gcashHandler?: string; gcashReference?: string; timeLoaded?: string;
  amount?: number; markup?: number; incentive?: number; retailer?: number;
  dealer?: number; remarks?: string; createdAt?: string; updatedAt?: string;
}

export interface UserRow {
  id: string; username: string; password: string; role: string; createdAt?: string; updatedAt?: string;
}

// ── Installations ──────────────────────────────────────

export async function getAllInstallations(): Promise<InstallationRow[]> {
  if (typeof window !== 'undefined' && window.indexedDB) {
    const localData = await localDb.getAll<InstallationRow>('installations');
    if (localData.length > 0) {
      return localData;
    }
  }

  try {
    const data = await sheets.getAll<InstallationRow>('installations');
    if (data.length > 0) {
      if (typeof window !== 'undefined' && window.indexedDB) {
        await localDb.putBatch('installations', data);
      }
      return data;
    }
  } catch (e) {
    console.warn('[DB] Sheets fetch failed:', e);
  }
  return [];
}

function formatLoadExpire(dateInstalled: string): string {
  const d = new Date(dateInstalled);
  d.setDate(d.getDate() + 90);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const y = d.getFullYear();
  return `${m}/${day}/${y}`;
}

export async function createInstallation(data: Partial<InstallationRow>): Promise<InstallationRow> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('createInstallation requires IndexedDB - call from client only');
  }

  const now = new Date().toISOString();
  const id = data.id || `INST-${Date.now()}`;

  let loadExpire = data.loadExpire;
  if (data.dateInstalled && !loadExpire) {
    loadExpire = formatLoadExpire(data.dateInstalled);
  }

  const row: InstallationRow = {
    ...data,
    id,
    loadExpire,
    status: 'completed',
    createdAt: now,
    updatedAt: now,
  } as InstallationRow;

  await localDb.put('installations', row);
  await enqueueOp('create', 'installations', row.id, row as unknown as Record<string, unknown>);

  return row;
}

export async function updateInstallation(id: string, data: Partial<InstallationRow>): Promise<InstallationRow | undefined> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('updateInstallation requires IndexedDB - call from client only');
  }

  let existing: InstallationRow | undefined;
  if (typeof window !== 'undefined' && window.indexedDB) {
    try { existing = await localDb.getById<InstallationRow>('installations', id); } catch (e) { /* ignore */ }
  }

  if (!existing) {
    const all = await getAllInstallations();
    existing = all.find(i => i.id === id);
  }

  if (!existing) return undefined;

  if (existing.updatedAt) {
    await saveRecordSnapshot('installations', id, existing.updatedAt);
  }

  let loadExpire = data.loadExpire;
  if (data.dateInstalled && !loadExpire && data.dateInstalled !== existing.dateInstalled) {
    loadExpire = formatLoadExpire(data.dateInstalled);
  }

  const updated = { ...existing, ...data, loadExpire: loadExpire || existing.loadExpire, updatedAt: new Date().toISOString() };

  await localDb.put('installations', updated);
  await enqueueOp('update', 'installations', id, updated as unknown as Record<string, unknown>, existing.updatedAt);

  return updated;
}

export async function deleteInstallation(id: string): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('deleteInstallation requires IndexedDB - call from client only');
  }

  await localDb.remove('installations', id);
  await enqueueOp('delete', 'installations', id, {});
  return true;
}

// ── E-Load ─────────────────────────────────────────────

export async function getAllEload(): Promise<ELoadRow[]> {
  if (typeof window !== 'undefined' && window.indexedDB) {
    const localData = await localDb.getAll<ELoadRow>('eload');
    if (localData.length > 0) {
      return localData;
    }
  }

  try {
    const data = await sheets.getAll<ELoadRow>('eload');
    if (data.length > 0) {
      if (typeof window !== 'undefined' && window.indexedDB) {
        await localDb.putBatch('eload', data);
      }
      return data;
    }
  } catch (e) {
    console.warn('[DB] Sheets fetch failed:', e);
  }
  return [];
}

export async function createEload(data: Partial<ELoadRow>): Promise<ELoadRow> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('createEload requires IndexedDB - call from client only');
  }

  const now = new Date().toISOString();
  const id = data.id || `EL-${Date.now()}`;
  const row: ELoadRow = { ...data, id, createdAt: now, updatedAt: now } as ELoadRow;

  await localDb.put('eload', row);
  await enqueueOp('create', 'eload', row.id, row as unknown as Record<string, unknown>);

  return row;
}

export async function updateEload(id: string, data: Partial<ELoadRow>): Promise<ELoadRow | undefined> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('updateEload requires IndexedDB - call from client only');
  }

  const all = await getAllEload();
  const existing = all.find(e => e.id === id);
  if (!existing) return undefined;

  if (existing.updatedAt) {
    await saveRecordSnapshot('eload', id, existing.updatedAt);
  }

  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };

  await localDb.put('eload', updated);
  await enqueueOp('update', 'eload', id, updated as unknown as Record<string, unknown>, existing.updatedAt);

  return updated;
}

export async function deleteEload(id: string): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('deleteEload requires IndexedDB - call from client only');
  }

  await localDb.remove('eload', id);
  await enqueueOp('delete', 'eload', id, {});
  return true;
}

// ── Users ──────────────────────────────────────────────

export async function getAllUsers(): Promise<UserRow[]> {
  if (typeof window !== 'undefined' && window.indexedDB) {
    const localData = await localDb.getAll<UserRow>('users');
    if (localData.length > 0) {
      return localData;
    }
  }

  try {
    const data = await sheets.getAll<UserRow>('users');
    if (data.length > 0) {
      if (typeof window !== 'undefined' && window.indexedDB) {
        await localDb.putBatch('users', data);
      }
      return data;
    }
  } catch (e) {
    console.warn('[DB] Sheets fetch failed:', e);
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
    updatedAt: now,
  };

  await localDb.put('users', row);
  await enqueueOp('create', 'users', row.id, row as unknown as Record<string, unknown>);
  return row;
}

export async function updateUser(id: string, data: { username?: string; password?: string; role?: string }): Promise<UserRow | null> {
  const users = await getAllUsers();
  const existing = users.find(u => u.id === id);
  if (!existing) return null;

  if (existing.updatedAt) {
    await saveRecordSnapshot('users', id, existing.updatedAt);
  }

  const updates: Partial<UserRow> = { ...existing };
  if (data.username !== undefined) updates.username = data.username;
  if (data.password !== undefined) updates.password = await hashPasswordIfNeeded(data.password);
  if (data.role !== undefined) updates.role = data.role;
  updates.updatedAt = new Date().toISOString();
  const updated = updates as UserRow;

  await localDb.put('users', updated);
  await enqueueOp('update', 'users', id, updated as unknown as Record<string, unknown>, existing.updatedAt);
  return updated;
}

export async function deleteUser(id: string): Promise<boolean> {
  await localDb.remove('users', id);
  await enqueueOp('delete', 'users', id, {});
  return true;
}

export async function authenticateUser(username: string): Promise<UserRow | null> {
  const users = await getAllUsers();
  const user = users.find(u => u.username?.toLowerCase() === username.toLowerCase());
  return user || null;
}

// ── Historical Data ────────────────────────────────────

export async function getAllHistoricalData(): Promise<HistoricalDataRow[]> {
  if (typeof window !== 'undefined' && window.indexedDB) {
    const localData = await localDb.getAll<HistoricalDataRow>('historicaldata');
    if (localData.length > 0) {
      return localData;
    }
  }

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
      try {
        await sheets.appendRow('historicaldata', record as unknown as Record<string, unknown>);
      } catch (e) { console.warn('[Archive] Sheets append failed:', e); }
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