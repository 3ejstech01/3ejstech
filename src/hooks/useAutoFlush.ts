import { useEffect, useRef } from 'react';
import { flushQueue } from '@/lib/sync-queue';
import { useSyncQueueStore } from '@/stores/syncQueueStore';

const FLUSH_INTERVAL = 30000;
const CORS_PAUSE_DURATION = 5 * 60 * 1000;

export function useAutoFlush() {
  const flushingRef = useRef(false);
  const corsPauseRef = useRef(false);
  const { loadQueue, getPendingCount, hasCorsError } = useSyncQueueStore();

  useEffect(() => {
    loadQueue();

    const interval = setInterval(async () => {
      if (flushingRef.current) return;
      if (corsPauseRef.current) return;
      
      const pending = getPendingCount();
      if (pending === 0) return;

      flushingRef.current = true;
      try {
        await flushQueue();
      } finally {
        flushingRef.current = false;
      }
      
      if (useSyncQueueStore.getState().hasCorsError) {
        corsPauseRef.current = true;
        setTimeout(() => {
          corsPauseRef.current = false;
        }, CORS_PAUSE_DURATION);
      }
    }, FLUSH_INTERVAL);

    return () => clearInterval(interval);
  }, [loadQueue, getPendingCount, hasCorsError]);
}