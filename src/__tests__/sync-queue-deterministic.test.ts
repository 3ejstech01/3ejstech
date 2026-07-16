import { flushQueue, enqueueOp } from '@/lib/sync-queue';
import { useSyncQueueStore } from '@/stores/syncQueueStore';

it('does not double-process a pending op', async () => {
  await enqueueOp('create', 'eload', 'op1', { id: 'op1' });
  const before = useSyncQueueStore.getState().getQueue().length;
  await flushQueue();
  const after = useSyncQueueStore.getState().getQueue().length;
  expect(after).toBe(before);
});