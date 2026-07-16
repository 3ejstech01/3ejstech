import { create } from 'zustand';

export type SheetName = 'installations' | 'eload' | 'users' | 'historicaldata';

export type OpType = 'create' | 'update' | 'delete';
export type OpStatus = 'pending' | 'syncing' | 'conflict' | 'resolved' | 'dead-letter';

export interface QueuedOperation {
  id: string;
  type: OpType;
  sheet: SheetName;
  keyColumn: string;
  keyValue: string;
  data: Record<string, unknown>;
  timestamp: number;
  updatedAt?: string;
  status: OpStatus;
  conflictData?: Record<string, unknown>;
  retryCount: number;
  lastError?: string;
  nextRetryAt?: number;
}

export interface SyncNotification {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'conflict';
  timestamp: number;
}

interface SyncQueueState {
  queue: QueuedOperation[];
  isFlushing: boolean;
  lastFlushAt: number | null;
  lastSyncAt: number | null;
  hasConflicts: boolean;
  hasCorsError: boolean;
  notifications: SyncNotification[];
  showConflictModal: boolean;
  conflictOpId: string | null;
  deadLetterCount: number;
  lastError: string | null;

  loadQueue: () => Promise<void>;
  loadSyncMeta: () => Promise<void>;
  _setQueue: (queue: QueuedOperation[]) => void;
  addNotification: (message: string, type: SyncNotification['type']) => void;
  removeNotification: (id: string) => void;
  setHasConflicts: (v: boolean) => void;
  setHasCorsError: (v: boolean) => void;
  setShowConflictModal: (show: boolean, opId?: string | null) => void;
  setLastError: (error: string | null) => void;
  getQueue: () => QueuedOperation[];
  getPendingCount: () => number;
  getDeadLetterCount: () => number;
}

export const useSyncQueueStore = create<SyncQueueState>((set, get) => ({
  queue: [],
  isFlushing: false,
  lastFlushAt: null,
  lastSyncAt: null,
  hasConflicts: false,
  hasCorsError: false,
  notifications: [],
  showConflictModal: false,
  conflictOpId: null,
  deadLetterCount: 0,
  lastError: null,

  loadQueue: async () => {
    if (typeof window === 'undefined' || !window.indexedDB) return;
    try {
      const { localDb } = await import('@/lib/local-db');
      const items = await localDb.getAll<QueuedOperation>('syncQueue');
      set({ queue: items.filter(op => op.status !== 'resolved') });
      const hasConflicts = items.some(op => op.status === 'conflict');
      const deadLetterCount = items.filter(op => op.status === 'dead-letter').length;
      set({ hasConflicts, deadLetterCount });
    } catch (e) {
      console.warn('[SyncQueue] Failed to load queue:', e);
    }
  },

  loadSyncMeta: async () => {
    if (typeof window === 'undefined' || !window.indexedDB) return;
    try {
      const { localDb } = await import('@/lib/local-db');
      const stored = await localDb.getById<{ value: number }>('recordSnapshots', 'lastSuccessfulSync');
      if (stored?.value) {
        set({ lastSyncAt: stored.value });
      }
    } catch (e) {
      console.warn('[SyncQueue] Failed to load sync meta:', e);
    }
  },

  _setQueue: (queue) => set({ queue, deadLetterCount: queue.filter(op => op.status === 'dead-letter').length }),

  addNotification: (message, type) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set(state => ({
      notifications: [...state.notifications, { id, message, type, timestamp: Date.now() }],
    }));
    setTimeout(() => get().removeNotification(id), 4000);
  },

  removeNotification: (id) => {
    set(state => ({ notifications: state.notifications.filter(n => n.id !== id) }));
  },

  setHasConflicts: (v) => set({ hasConflicts: v }),
  setHasCorsError: (v) => set({ hasCorsError: v }),
  setShowConflictModal: (show, opId = null) => set({ showConflictModal: show, conflictOpId: opId ?? null }),
  setLastError: (error) => set({ lastError: error }),

  getQueue: () => get().queue,
  getPendingCount: () => get().queue.filter(op => op.status === 'pending' || op.status === 'syncing').length,
  getDeadLetterCount: () => get().queue.filter(op => op.status === 'dead-letter').length,
}));
