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

// ── Snake-case to camelCase mapper ──────────────────────

const INSTALLATION_SNAKE_MAP: Record<string, string> = {
  id: 'id', no: 'no', dateinstalled: 'dateInstalled', agentname: 'agentName',
  jonumber: 'joNumber', accountnumber: 'accountNumber', subsname: 'subscriberName',
  contact1: 'contactNumber1', contact2: 'contactNumber2', address: 'address',
  houselatitude: 'houseLatitude', houselongitude: 'houseLongitude', port: 'port',
  technician: 'assignedTechnician', modemserial: 'modemSerial',
  reelnum: 'reelNo', reelstart: 'reelStart', reelend: 'reelEnd',
  fiberopticcable: 'fiberOpticCable', mechconnector: 'mechanicalConnector',
  sclam: 'sClamp', patchcordapcsc: 'patchcordApsc', housebracket: 'houseBracket',
  midspan: 'midspan', cableclip: 'cableClip', ftthterminalbox: 'ftthTerminalBox',
  doublesidedtape: 'doubleSidedTape', cabletiewrap: 'cableTieWrap',
  status: 'status', monthinstalled: 'monthInstalled', yearinstalled: 'yearInstalled',
  loadexpire: 'loadExpire', notifstatus: 'notifyStatus', loadstatus: 'loadStatus',
  createdat: 'createdAt', updatedat: 'updatedAt',
};

const ELOAD_SNAKE_MAP: Record<string, string> = {
  id: 'id', gcashhandler: 'gcashHandler', dateloaded: 'dateLoaded',
  gcashreference: 'gcashReference', timeloaded: 'timeLoaded', amount: 'amount',
  accountnumber: 'accountNumber', markup: 'markup', incentive: 'incentive',
  retailer: 'retailer', dealer: 'dealer', remarks: 'remarks',
  createdat: 'createdAt', updatedat: 'updatedAt',
};

const USER_SNAKE_MAP: Record<string, string> = {
  id: 'id', username: 'username', password: 'password', role: 'role', createdat: 'createdAt',
};

const HISTORICAL_SNAKE_MAP: Record<string, string> = {
  id: 'id', dateinstalled: 'dateInstalled', jonumber: 'joNumber',
  accountnumber: 'accountNumber', subsname: 'subscriberName',
  address: 'address', contact1: 'contactNumber1', contact2: 'contactNumber2',
  technician: 'assignedTechnician', modemserial: 'modemSerial', port: 'port',
  napboxlonglat: 'napBoxLonglat',
  fiberopticcable: 'fiberOpticCable', mechconnector: 'mechanicalConnector',
  sclamp: 'sClamp', patchcordapsc: 'patchcordApsc', housebracket: 'houseBracket',
  midspan: 'midspan', cableclip: 'cableClip', ftthterminalbox: 'ftthTerminalBox',
  doublesidedtape: 'doubleSidedTape', cabletiewrap: 'cableTieWrap',
  gcashhandler: 'gcashHandler', gcashreference: 'gcashReference',
  timeloaded: 'timeLoaded', amount: 'amount', markup: 'markup',
  incentive: 'incentive', retailer: 'retailer', dealer: 'dealer',
  remarks: 'remarks', createdat: 'createdAt', updatedat: 'updatedAt',
};

function mapSnakeToCamel(row: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [snake, val] of Object.entries(row)) {
    const camel = mapping[snake.toLowerCase()];
    if (camel) {
      result[camel] = val;
    } else {
      result[snake] = val;
    }
  }
  return result;
}

function mapCamelToSnake(row: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
  const reverseMap: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(mapping)) {
    reverseMap[camel] = snake;
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    const snake = reverseMap[key];
    result[snake || key] = val;
  }
  return result;
}

// ── Installations ──────────────────────────────────────

export async function getAllInstallations(): Promise<InstallationRow[]> {
  try {
    const data = await sheets.getAll<Record<string, unknown>>('installations');
    if (data.length > 0) {
      const mapped = data.map(row => mapSnakeToCamel(row, INSTALLATION_SNAKE_MAP) as unknown as InstallationRow);
      if (typeof window !== 'undefined' && window.indexedDB) {
        await localDb.putBatch('installations', mapped);
      }
      return mapped;
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
    const snakeRow = mapCamelToSnake(row as unknown as Record<string, unknown>, INSTALLATION_SNAKE_MAP);
    await sheets.appendRow('installations', snakeRow);
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
    const snakeRow = mapCamelToSnake(updated as unknown as Record<string, unknown>, INSTALLATION_SNAKE_MAP);
    await sheets.updateRow('installations', 'id', id, snakeRow);
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
    const data = await sheets.getAll<Record<string, unknown>>('eload');
    if (data.length > 0) {
      const mapped = data.map(row => mapSnakeToCamel(row, ELOAD_SNAKE_MAP) as unknown as ELoadRow);
      if (typeof window !== 'undefined' && window.indexedDB) {
        await localDb.putBatch('eload', mapped);
      }
      return mapped;
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
    const snakeRow = mapCamelToSnake(row as unknown as Record<string, unknown>, ELOAD_SNAKE_MAP);
    await sheets.appendRow('eload', snakeRow);
  } catch (e) {
    console.warn('[DB] Sheets write failed:', e);
  }

  if (typeof window !== 'undefined' && window.indexedDB) {
    try { await localDb.put('eload', row); } catch (e) { console.warn('[DB] IndexedDB write failed:', e); }
  }

  return row;
}

export async function updateEload(id: string, data: Partial<ELoadRow>): Promise<ELoadRow | undefined> {
  const all = await getAllEload();
  const existing = all.find(e => e.id === id);
  if (!existing) return undefined;

  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };

  try {
    const snakeRow = mapCamelToSnake(updated as unknown as Record<string, unknown>, ELOAD_SNAKE_MAP);
    await sheets.updateRow('eload', 'id', id, snakeRow);
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
    const data = await sheets.getAll<Record<string, unknown>>('users');
    if (data.length > 0) {
      const mapped = data.map(row => mapSnakeToCamel(row, USER_SNAKE_MAP) as unknown as UserRow);
      if (typeof window !== 'undefined' && window.indexedDB) {
        await localDb.putBatch('users', mapped);
      }
      return mapped;
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
    const snakeRow = mapCamelToSnake(row as unknown as Record<string, unknown>, USER_SNAKE_MAP);
    await sheets.appendRow('users', snakeRow);
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
    const snakeRow = mapCamelToSnake(updated as unknown as Record<string, unknown>, USER_SNAKE_MAP);
    await sheets.updateRow('users', 'id', id, snakeRow);
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
    const data = await sheets.getAll<Record<string, unknown>>('historicaldata');
    if (data.length > 0) {
      const mapped = data.map(row => mapSnakeToCamel(row, HISTORICAL_SNAKE_MAP) as unknown as HistoricalDataRow);
      if (typeof window !== 'undefined' && window.indexedDB) {
        await localDb.putBatch('historicaldata', mapped);
      }
      return mapped;
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
        const snakeRow = mapCamelToSnake(record as unknown as Record<string, unknown>, HISTORICAL_SNAKE_MAP);
        await sheets.appendRow('historicaldata', snakeRow);
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