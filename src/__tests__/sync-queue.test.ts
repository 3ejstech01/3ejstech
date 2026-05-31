Object.defineProperty(global, 'window', {
  value: {
    indexedDB: { open: jest.fn() },
  },
  writable: true,
});

import { enqueueOp, saveRecordSnapshot, getRecordSnapshot, resolveConflict, flushQueue } from '@/lib/sync-queue';
import { localDb } from '@/lib/local-db';
import { sheets } from '@/lib/sheets';
import { useSyncQueueStore } from '@/stores/syncQueueStore';

let mockQueue: any[] = [];

jest.mock('@/lib/local-db');
jest.mock('@/lib/sheets');

jest.mock('@/stores/syncQueueStore', () => ({
  useSyncQueueStore: {
    getState: () => ({
      queue: mockQueue,
      isFlushing: false,
      hasConflicts: false,
      showConflictModal: false,
      notifications: [],
      loadQueue: jest.fn(),
      _setQueue: (q: any[]) => { mockQueue = q; },
      addNotification: jest.fn(),
      setHasConflicts: jest.fn(),
      setShowConflictModal: jest.fn(),
      getQueue: () => mockQueue,
      getPendingCount: () => mockQueue.filter((op: any) => op.status === 'pending' || op.status === 'syncing').length,
    }),
  },
}));

describe('sync-queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueue = [];
    (localDb.put as jest.Mock).mockResolvedValue(undefined);
    (localDb.getById as jest.Mock).mockResolvedValue(undefined);
    (localDb.remove as jest.Mock).mockResolvedValue(undefined);
    (localDb.getAll as jest.Mock).mockResolvedValue([]);
    (sheets.appendRow as jest.Mock).mockResolvedValue({ success: true });
    (sheets.updateRow as jest.Mock).mockResolvedValue({ success: true });
    (sheets.deleteRow as jest.Mock).mockResolvedValue({ success: true });
    (sheets.getByKey as jest.Mock).mockResolvedValue(null);
  });

  describe('enqueueOp', () => {
    it('should add create operation to sync queue', async () => {
      await enqueueOp('create', 'installations', 'INST-123', { id: 'INST-123', name: 'Test' });

      expect(localDb.put).toHaveBeenCalledWith('syncQueue', expect.objectContaining({
        type: 'create',
        sheet: 'installations',
        keyColumn: 'id',
        keyValue: 'INST-123',
        data: { id: 'INST-123', name: 'Test' },
        status: 'pending',
        retryCount: 0,
      }));
    });

    it('should add update operation with updatedAt snapshot', async () => {
      await enqueueOp('update', 'eload', 'EL-456', { id: 'EL-456', amount: 700 }, '2024-01-15T10:00:00.000Z');

      expect(localDb.put).toHaveBeenCalledWith('syncQueue', expect.objectContaining({
        type: 'update',
        sheet: 'eload',
        keyValue: 'EL-456',
        updatedAt: '2024-01-15T10:00:00.000Z',
        status: 'pending',
      }));
    });

    it('should add delete operation with correct structure', async () => {
      await enqueueOp('delete', 'users', 'eden', {});

      expect(localDb.put).toHaveBeenCalledWith('syncQueue', expect.objectContaining({
        type: 'delete',
        sheet: 'users',
        keyValue: 'eden',
        status: 'pending',
      }));
    });
  });

  describe('saveRecordSnapshot and getRecordSnapshot', () => {
    it('should save snapshot with correct key format', async () => {
      await saveRecordSnapshot('installations', 'INST-123', '2024-01-15T10:00:00.000Z');

      expect(localDb.put).toHaveBeenCalledWith('recordSnapshots', expect.objectContaining({
        id: 'installations-INST-123',
        sheet: 'installations',
        recordId: 'INST-123',
        updatedAt: '2024-01-15T10:00:00.000Z',
      }));
    });

    it('should retrieve snapshot by sheet and recordId', async () => {
      (localDb.getById as jest.Mock).mockResolvedValue({ updatedAt: '2024-01-15T10:00:00.000Z' });

      const result = await getRecordSnapshot('installations', 'INST-123');

      expect(localDb.getById).toHaveBeenCalledWith('recordSnapshots', 'installations-INST-123');
      expect(result).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should return null when snapshot not found', async () => {
      (localDb.getById as jest.Mock).mockResolvedValue(undefined);

      const result = await getRecordSnapshot('installations', 'NOTFOUND');

      expect(result).toBeNull();
    });
  });

  describe('flushQueue', () => {
    it('should flush pending create operations', async () => {
      const pendingOp = {
        id: 'op-1',
        type: 'create' as const,
        sheet: 'installations' as const,
        keyColumn: 'id',
        keyValue: 'INST-789',
        data: { id: 'INST-789', name: 'New Install' },
        timestamp: Date.now(),
        status: 'pending' as const,
        retryCount: 0,
      };
      mockQueue = [pendingOp];
      (localDb.getAll as jest.Mock).mockResolvedValue(mockQueue);

      const result = await flushQueue();

      expect(sheets.appendRow).toHaveBeenCalledWith('installations', { id: 'INST-789', name: 'New Install' });
      expect(localDb.remove).toHaveBeenCalledWith('syncQueue', 'op-1');
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should remove from queue on successful create', async () => {
      const op = {
        id: 'op-create-1',
        type: 'create' as const,
        sheet: 'eload' as const,
        keyColumn: 'id',
        keyValue: 'EL-001',
        data: { id: 'EL-001', amount: 700 },
        timestamp: Date.now(),
        status: 'pending' as const,
        retryCount: 0,
      };
      mockQueue = [op];
      (localDb.getAll as jest.Mock).mockResolvedValue(mockQueue);

      await flushQueue();

      expect(localDb.remove).toHaveBeenCalledWith('syncQueue', 'op-create-1');
      expect(sheets.appendRow).toHaveBeenCalledWith('eload', { id: 'EL-001', amount: 700 });
    });

    it('should detect conflict when updatedAt differs', async () => {
      const op = {
        id: 'op-update-1',
        type: 'update' as const,
        sheet: 'installations' as const,
        keyColumn: 'id',
        keyValue: 'INST-123',
        data: { id: 'INST-123', status: 'completed' },
        timestamp: Date.now(),
        updatedAt: '2024-01-01T10:00:00.000Z',
        status: 'pending' as const,
        retryCount: 0,
      };
      mockQueue = [op];
      (localDb.getAll as jest.Mock).mockResolvedValue(mockQueue);
      (sheets.getByKey as jest.Mock).mockResolvedValue({ id: 'INST-123', updatedAt: '2024-01-02T10:00:00.000Z' });

      const result = await flushQueue();

      expect(sheets.updateRow).not.toHaveBeenCalled();
      expect(localDb.put).toHaveBeenCalledWith('syncQueue', expect.objectContaining({
        id: 'op-update-1',
        status: 'conflict',
        conflictData: { id: 'INST-123', updatedAt: '2024-01-02T10:00:00.000Z' },
      }));
      expect(result.conflicts).toBe(1);
    });

    it('should update row when updatedAt matches', async () => {
      const op = {
        id: 'op-update-2',
        type: 'update' as const,
        sheet: 'eload' as const,
        keyColumn: 'id',
        keyValue: 'EL-456',
        data: { id: 'EL-456', amount: 300 },
        timestamp: Date.now(),
        updatedAt: '2024-01-15T10:00:00.000Z',
        status: 'pending' as const,
        retryCount: 0,
      };
      mockQueue = [op];
      (localDb.getAll as jest.Mock).mockResolvedValue(mockQueue);
      (sheets.getByKey as jest.Mock).mockResolvedValue({ id: 'EL-456', updatedAt: '2024-01-15T10:00:00.000Z' });

      const result = await flushQueue();

      expect(sheets.updateRow).toHaveBeenCalledWith('eload', 'id', 'EL-456', { id: 'EL-456', amount: 300 });
      expect(localDb.remove).toHaveBeenCalledWith('syncQueue', 'op-update-2');
      expect(result.success).toBe(1);
    });

    it('should handle delete operations', async () => {
      const op = {
        id: 'op-delete-1',
        type: 'delete' as const,
        sheet: 'installations' as const,
        keyColumn: 'id',
        keyValue: 'INST-TODELETE',
        data: {},
        timestamp: Date.now(),
        status: 'pending' as const,
        retryCount: 0,
      };
      mockQueue = [op];
      (localDb.getAll as jest.Mock).mockResolvedValue(mockQueue);

      const result = await flushQueue();

      expect(sheets.deleteRow).toHaveBeenCalledWith('installations', 'id', 'INST-TODELETE');
      expect(localDb.remove).toHaveBeenCalledWith('syncQueue', 'op-delete-1');
      expect(result.success).toBe(1);
    });

    it('should increment retry count on failure', async () => {
      const op = {
        id: 'op-retry-1',
        type: 'create' as const,
        sheet: 'installations' as const,
        keyColumn: 'id',
        keyValue: 'INST-FAIL',
        data: { id: 'INST-FAIL' },
        timestamp: Date.now(),
        status: 'pending' as const,
        retryCount: 0,
      };
      mockQueue = [op];
      (localDb.getAll as jest.Mock).mockResolvedValue(mockQueue);
      (sheets.appendRow as jest.Mock).mockResolvedValue(false);

      const result = await flushQueue();

      expect(localDb.put).toHaveBeenCalledWith('syncQueue', expect.objectContaining({
        id: 'op-retry-1',
        status: 'pending',
        retryCount: 1,
      }));
      expect(result.failed).toBe(1);
    });
  });

  describe('resolveConflict', () => {
    it('should mark resolved pending when resolution is mine', async () => {
      const op = {
        id: 'op-conflict-1',
        type: 'update' as const,
        sheet: 'installations' as const,
        keyColumn: 'id',
        keyValue: 'INST-123',
        data: { id: 'INST-123', name: 'Mine' },
        timestamp: Date.now(),
        status: 'conflict' as const,
        conflictData: { id: 'INST-123', name: 'Theirs' },
        retryCount: 0,
      };
      mockQueue = [op];
      (localDb.getAll as jest.Mock).mockResolvedValue(mockQueue);

      await resolveConflict('op-conflict-1', 'mine');

      expect(localDb.put).toHaveBeenCalledWith('syncQueue', expect.objectContaining({
        id: 'op-conflict-1',
        status: 'pending',
        conflictData: undefined,
      }));
    });

    it('should remove operation when resolution is theirs', async () => {
      const op = {
        id: 'op-conflict-2',
        type: 'update' as const,
        sheet: 'eload' as const,
        keyColumn: 'id',
        keyValue: 'EL-999',
        data: { id: 'EL-999', name: 'Mine' },
        timestamp: Date.now(),
        status: 'conflict' as const,
        conflictData: { id: 'EL-999', name: 'Theirs' },
        retryCount: 0,
      };
      mockQueue = [op];
      (localDb.getAll as jest.Mock).mockResolvedValue(mockQueue);

      await resolveConflict('op-conflict-2', 'theirs');

      expect(localDb.remove).toHaveBeenCalledWith('syncQueue', 'op-conflict-2');
    });
  });
});