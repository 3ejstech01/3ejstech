'use client';

import React, { useEffect, useRef } from 'react';
import { syncFromRemote } from '@/lib/unified-db';
import { useAuth } from '@/hooks/useAuth';

const SYNC_SESSION_KEY = 'db_synced_session';

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (user?.id) {
      sessionStorage.setItem(SYNC_SESSION_KEY, user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    async function syncOnChange() {
      if (syncingRef.current) return;

      syncingRef.current = true;
      try {
        console.log('[SyncProvider] Records changed, syncing...');
        await syncFromRemote();
        console.log('[SyncProvider] Sync complete');
        window.dispatchEvent(new CustomEvent('db-synced'));
      } catch (err) {
        console.error('[SyncProvider] Sync failed:', err);
      } finally {
        syncingRef.current = false;
      }
    }

    document.addEventListener('records-updated', syncOnChange);

    return () => {
      document.removeEventListener('records-updated', syncOnChange);
    };
  }, [user?.id]);

  return <>{children}</>;
}