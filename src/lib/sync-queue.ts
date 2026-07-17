import { sheets } from './sheets';
import { localDb } from './local-db';
import { useSyncQueueStore, type SheetName, type OpType, type QueuedOperation, type SyncingOp } from '@/stores/syncQueueStore';

let opCounter = 0;

let _currentUser = 'system';
export function setCurrentSyncUser(user: string) { _currentUser = user; }
export function getCurrentSyncUser(): string { return _currentUser; }
export function clearCurrentSyncUser(): void { _currentUser = 'system'; }

const MAX_RETRY_COUNT = 3;

function generateOpId(): string {
  return `op-${Date.now()}-${++opCounter}`;
}

function getRetryDelayMs(retryCount: number): number {
  return Math.min(60_000, 1000 * 2 ** retryCount);
}

function getSyncQueueStore() {
  return useSyncQueueStore.getState();
}

export async function enqueueOp(
  type: OpType,
  sheet: SheetName,
  keyValue: string,
  data: Record<string, unknown>,
  updatedAt?: string,
  lastModifiedBy?: string
): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;

  const op: QueuedOperation = {
    id: generateOpId(),
    type,
    sheet,
    keyColumn: 'id',
    keyValue,
    data,
    timestamp: Date.now(),
    updatedAt,
    status: 'pending',
    retryCount: 0,
    _lastModifiedBy: lastModifiedBy || _currentUser,
  };

  await localDb.put('syncQueue', op);
  const store = getSyncQueueStore();
  store.loadQueue();
}

export async function saveRecordSnapshot(
  sheet: SheetName,
  recordId: string,
  updatedAt: string,
  metadata?: { resolution?: string }
): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  const snapshot = {
    id: `${sheet}-${recordId}`,
    sheet,
    recordId,
    updatedAt,
    loadedAt: Date.now(),
    ...metadata,
  };
  await localDb.put('recordSnapshots', snapshot);
}

export async function getRecordSnapshot(
  sheet: SheetName,
  recordId: string
): Promise<string | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  try {
    const snapshot = await localDb.getById<{ updatedAt: string }>('recordSnapshots', `${sheet}-${recordId}`);
    return snapshot?.updatedAt ?? null;
  } catch {
    return null;
  }
}

async function fetchSheetsRow(
  sheet: SheetName,
  keyColumn: string,
  keyValue: string
): Promise<Record<string, unknown> | null> {
  return sheets.getByKey<Record<string, unknown>>(sheet, keyColumn, keyValue);
}

async function updateOpStatus(
  op: QueuedOperation,
  updates: Partial<QueuedOperation>
): Promise<void> {
  const updated = { ...op, ...updates };
  await localDb.put('syncQueue', updated);
}

async function removeOp(opId: string): Promise<void> {
  await localDb.remove('syncQueue', opId);
}

export async function resolveConflict(
  opId: string,
  resolution: 'mine' | 'theirs' | 'retry'
): Promise<void> {
  const store = getSyncQueueStore();
  const op = store.getQueue().find(o => o.id === opId);
  if (!op) return;

  if (resolution === 'mine') {
    await updateOpStatus(op, { status: 'pending', conflictData: undefined });
    const remoteRow = op.conflictData;
    if (remoteRow && typeof remoteRow === 'object') {
      await saveRecordSnapshot(op.sheet, op.keyValue, String((remoteRow as Record<string, unknown>).updatedAt ?? ''), { resolution: 'mine' });
    }
  } else if (resolution === 'retry') {
    await updateOpStatus(op, {
      status: 'pending',
      retryCount: 0,
      nextRetryAt: Date.now(),
      lastError: undefined,
    });
  } else {
    await removeOp(opId);
  }

  const remainingConflicts = store.getQueue().filter(o => o.status === 'conflict').length;
  store.setHasConflicts(remainingConflicts > 0);
  store.setShowConflictModal(false);
}

export interface FlushResult {
  success: number;
  failed: number;
  conflicts: number;
}

export async function flushQueue(): Promise<FlushResult> {
  const store = getSyncQueueStore();
  if (store.isFlushing) return { success: 0, failed: 0, conflicts: 0 };

  const now = Date.now();
  const queue = store.getQueue();
  const snapshot = queue.filter(op =>
    op.status === 'pending' && (!op.nextRetryAt || op.nextRetryAt <= now)
  );
  if (snapshot.length === 0) return { success: 0, failed: 0, conflicts: 0 };

  store.setShowAnimationModal(true);
  const syncingOpsInit: SyncingOp[] = snapshot.map(op => ({
    id: op.id,
    who: op._lastModifiedBy || 'Unknown',
    type: op.type,
    sheet: op.sheet,
    keyValue: op.keyValue,
    status: 'pending' as const,
  }));
  store.setSyncingOps(syncingOpsInit);

  let success = 0;
  let failed = 0;
  let conflicts = 0;
  let firstConflictDetected = false;
  let corsDetected = false;

  for (const op of snapshot) {
    if (op.status !== 'pending') continue;
    if (op.nextRetryAt && op.nextRetryAt > now) continue;

    store.updateSyncingOp(op.id, 'syncing');
    await updateOpStatus(op, { status: 'syncing' });

    try {
      if (op.type === 'create') {
        const result = await sheets.appendRow(op.sheet, op.data as Record<string, unknown>);
        if (result.success) {
          await removeOp(op.id);
          store.updateSyncingOp(op.id, 'synced');
          success++;
        } else if (result.isCorsError) {
          store.setHasCorsError(true);
          corsDetected = true;
          await scheduleRetry(op);
          store.updateSyncingOp(op.id, 'failed');
          failed++;
        } else {
          await scheduleRetry(op, 'Sync failed');
          store.updateSyncingOp(op.id, 'failed');
          failed++;
        }
      } else if (op.type === 'update') {
        const current = await fetchSheetsRow(op.sheet, op.keyColumn, op.keyValue);

        if (current && op.updatedAt && current.updatedAt && current.updatedAt !== op.updatedAt) {
          await updateOpStatus(op, { status: 'conflict', conflictData: current });
          store.setHasConflicts(true);
          store.updateSyncingOp(op.id, 'conflict');
          if (!firstConflictDetected) {
            store.setShowConflictModal(true);
            firstConflictDetected = true;
          }
          conflicts++;
        } else {
          const result = await sheets.updateRow(
            op.sheet,
            op.keyColumn,
            op.keyValue,
            op.data as Record<string, unknown>
          );
          if (result.success) {
            await removeOp(op.id);
            store.updateSyncingOp(op.id, 'synced');
            success++;
          } else if (result.isCorsError) {
            store.setHasCorsError(true);
            corsDetected = true;
            await scheduleRetry(op);
            store.updateSyncingOp(op.id, 'failed');
            failed++;
          } else {
            await scheduleRetry(op, 'Sync failed');
            store.updateSyncingOp(op.id, 'failed');
            failed++;
          }
        }
      } else if (op.type === 'delete') {
        const result = await sheets.deleteRow(op.sheet, op.keyColumn, op.keyValue);
        if (result.success) {
          await removeOp(op.id);
          store.updateSyncingOp(op.id, 'synced');
          success++;
        } else if (result.isCorsError) {
          store.setHasCorsError(true);
          corsDetected = true;
          await scheduleRetry(op);
          store.updateSyncingOp(op.id, 'failed');
          failed++;
        } else {
          await scheduleRetry(op, 'Sync failed');
          store.updateSyncingOp(op.id, 'failed');
          failed++;
        }
      }
    } catch (e) {
      console.warn('[SyncQueue] Flush error for op', op.id, e);
      await scheduleRetry(op, e instanceof Error ? e.message : 'Sync failed');
      store.updateSyncingOp(op.id, 'failed');
      failed++;
    }
  }

  await store.loadQueue();

  if (success > 0) {
    await localDb.put('recordSnapshots', { id: 'lastSuccessfulSync', value: Date.now() });
    store.addNotification(`${success} change${success > 1 ? 's' : ''} saved`, 'success');
  }

  if (corsDetected) {
    store.addNotification('Sheets sync blocked by CORS. Data saved locally.', 'warning');
  }

  if (conflicts > 0) {
    store.setShowConflictModal(true);
  }

  setTimeout(() => {
    store.setShowAnimationModal(false);
  }, 1500);

  return { success, failed, conflicts };
}

async function scheduleRetry(op: QueuedOperation, errorMessage?: string): Promise<void> {
  const store = getSyncQueueStore();
  const message = errorMessage || 'Sync failed';
  if (op.retryCount >= MAX_RETRY_COUNT) {
    await updateOpStatus(op, { status: 'dead-letter', lastError: message });
    store.setHasConflicts(true);
    store.setLastError(message);
    return;
  }
  const nextRetryAt = Date.now() + getRetryDelayMs(op.retryCount);
  await updateOpStatus(op, {
    status: 'pending',
    retryCount: op.retryCount + 1,
    lastError: message,
    nextRetryAt,
  });
}