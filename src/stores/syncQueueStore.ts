import { create } from 'zustand';

export type SheetName = 'installations' | 'eload' | 'users' | 'historicaldata';

export type OpType = 'create' | 'update' | 'delete';
export type OpStatus = 'pending' | 'syncing' | 'conflict' | 'resolved';

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
  hasConflicts: boolean;
  hasCorsError: boolean;
  notifications: SyncNotification[];
  showConflictModal: boolean;
  conflictOpId: string | null;

  loadQueue: () => Promise<void>;
  _setQueue: (queue: QueuedOperation[]) => void;
  addNotification: (message: string, type: SyncNotification['type']) => void;
  removeNotification: (id: string) => void;
  setHasConflicts: (v: boolean) => void;
  setHasCorsError: (v: boolean) => void;
  setShowConflictModal: (show: boolean, opId?: string | null) => void;
  getQueue: () => QueuedOperation[];
  getPendingCount: () => number;
}

export const useSyncQueueStore = create<SyncQueueState>((set, get) => ({
  queue: [],
  isFlushing: false,
  lastFlushAt: null,
  hasConflicts: false,
  hasCorsError: false,
  notifications: [],
  showConflictModal: false,
  conflictOpId: null,

  loadQueue: async () => {
    if (typeof window === 'undefined' || !window.indexedDB) return;
    try {
      const { localDb } = await import('@/lib/local-db');
      const items = await localDb.getAll<QueuedOperation>('syncQueue');
      set({ queue: items.filter(op => op.status !== 'resolved') });
      const hasConflicts = items.some(op => op.status === 'conflict');
      set({ hasConflicts });
    } catch (e) {
      console.warn('[SyncQueue] Failed to load queue:', e);
    }
  },

  _setQueue: (queue) => set({ queue }),

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

  getQueue: () => get().queue,

  getPendingCount: () => get().queue.filter(op => op.status === 'pending' || op.status === 'syncing').length,
}));