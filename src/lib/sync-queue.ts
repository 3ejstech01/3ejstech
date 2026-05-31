import { sheets } from './sheets';
import { localDb } from './local-db';
import { useSyncQueueStore, type SheetName, type OpType, type QueuedOperation } from '@/stores/syncQueueStore';

let opCounter = 0;

function generateOpId(): string {
  return `op-${Date.now()}-${++opCounter}`;
}

function getSyncQueueStore() {
  return useSyncQueueStore.getState();
}

export async function enqueueOp(
  type: OpType,
  sheet: SheetName,
  keyValue: string,
  data: Record<string, unknown>,
  updatedAt?: string
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
  };

  await localDb.put('syncQueue', op);
  const store = getSyncQueueStore();
  store.loadQueue();
}

export async function saveRecordSnapshot(
  sheet: SheetName,
  recordId: string,
  updatedAt: string
): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  const snapshot = {
    id: `${sheet}-${recordId}`,
    sheet,
    recordId,
    updatedAt,
    loadedAt: Date.now(),
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
  const store = getSyncQueueStore();
  const queue = store.getQueue().map(o => (o.id === op.id ? updated : o));
  store._setQueue(queue);
}

async function removeOp(opId: string): Promise<void> {
  await localDb.remove('syncQueue', opId);
  const store = getSyncQueueStore();
  store._setQueue(store.getQueue().filter(o => o.id !== opId));
}

export async function resolveConflict(
  opId: string,
  resolution: 'mine' | 'theirs'
): Promise<void> {
  const store = getSyncQueueStore();
  const op = store.getQueue().find(o => o.id === opId);
  if (!op) return;

  if (resolution === 'mine') {
    await updateOpStatus(op, { status: 'pending', conflictData: undefined });
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

  const pending = store.getQueue().filter(op => op.status === 'pending');
  if (pending.length === 0) return { success: 0, failed: 0, conflicts: 0 };

  await store.loadQueue();
  const currentQueue = store.getQueue();

  let success = 0;
  let failed = 0;
  let conflicts = 0;
  let firstConflictDetected = false;
  let corsDetected = false;

  for (const op of currentQueue) {
    if (op.status !== 'pending') continue;

    await updateOpStatus(op, { status: 'syncing' });

    try {
      if (op.type === 'create') {
        const result = await sheets.appendRow(op.sheet, op.data as Record<string, unknown>);
        if (result.success) {
          await removeOp(op.id);
          success++;
        } else if (result.isCorsError) {
          store.setHasCorsError(true);
          corsDetected = true;
          await updateOpStatus(op, { status: 'pending', retryCount: op.retryCount + 1 });
        } else {
          await updateOpStatus(op, { status: 'pending', retryCount: op.retryCount + 1 });
          failed++;
        }
      } else if (op.type === 'update') {
        const current = await fetchSheetsRow(op.sheet, op.keyColumn, op.keyValue);

        if (current && op.updatedAt && current.updatedAt && current.updatedAt !== op.updatedAt) {
          await updateOpStatus(op, { status: 'conflict', conflictData: current });
          store.setHasConflicts(true);
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
            success++;
          } else if (result.isCorsError) {
            store.setHasCorsError(true);
            corsDetected = true;
            await updateOpStatus(op, { status: 'pending', retryCount: op.retryCount + 1 });
          } else {
            await updateOpStatus(op, { status: 'pending', retryCount: op.retryCount + 1 });
            failed++;
          }
        }
      } else if (op.type === 'delete') {
        const result = await sheets.deleteRow(op.sheet, op.keyColumn, op.keyValue);
        if (result.success) {
          await removeOp(op.id);
          success++;
        } else if (result.isCorsError) {
          store.setHasCorsError(true);
          corsDetected = true;
          await updateOpStatus(op, { status: 'pending', retryCount: op.retryCount + 1 });
        } else {
          await updateOpStatus(op, { status: 'pending', retryCount: op.retryCount + 1 });
          failed++;
        }
      }
    } catch (e) {
      console.warn('[SyncQueue] Flush error for op', op.id, e);
      if (op.retryCount >= 2) {
        await updateOpStatus(op, { status: 'conflict' });
        store.setHasConflicts(true);
        if (!firstConflictDetected) {
          store.setShowConflictModal(true);
          firstConflictDetected = true;
        }
        conflicts++;
      } else {
        await updateOpStatus(op, { status: 'pending', retryCount: op.retryCount + 1 });
        failed++;
      }
    }
  }

  await store.loadQueue();

  if (success > 0) {
    store.addNotification(`${success} change${success > 1 ? 's' : ''} saved`, 'success');
  }

  if (corsDetected) {
    store.addNotification('Sheets sync blocked by CORS. Data saved locally.', 'warning');
  }

  return { success, failed, conflicts };
}