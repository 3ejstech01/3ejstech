'use client';
import { useState, useEffect } from 'react';
import { useSyncQueueStore } from '@/stores/syncQueueStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { queue, lastSyncAt } = useSyncQueueStore();
  const [dismissed, setDismissed] = useState(false);

  const pending = queue.filter(op => op.status === 'pending' || op.status === 'syncing');

  if (isOnline || dismissed || pending.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 mb-4 animate-[slideDown_0.3s_ease-out]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-lg">📡</span>
          <div>
            <p className="text-sm font-semibold text-amber-300">Offline Mode</p>
            <p className="text-xs text-amber-400/70">
              Last synced: {lastSyncAt ? timeAgo(lastSyncAt) : 'never'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400/50 hover:text-amber-300 text-sm"
        >
          ✕
        </button>
      </div>

      <p className="text-xs text-amber-300 mt-2 mb-3">
        {pending.length} change{pending.length > 1 ? 's' : ''} saved locally, waiting to sync:
      </p>

      <div className="space-y-1 max-h-24 overflow-y-auto">
        {pending.slice(0, 10).map(op => (
          <div key={op.id} className="flex items-center gap-2 text-xs text-amber-200/70">
            <span className="w-1.5 h-1.5 bg-amber-400/50 rounded-full" />
            <span className="font-medium">{op._lastModifiedBy || 'Unknown'}</span>
            <span>—</span>
            <span className="capitalize">{op.type}</span>
            <span>—</span>
            <span className="truncate max-w-[120px]">{op.keyValue}</span>
            <span className="ml-auto text-amber-300/50">{timeAgo(op.timestamp)}</span>
          </div>
        ))}
        {pending.length > 10 && (
          <p className="text-xs text-amber-300/50">...and {pending.length - 10} more</p>
        )}
      </div>

      <p className="text-xs text-amber-200/60 mt-3">
        Changes will sync automatically when you&apos;re back online.
      </p>
    </div>
  );
}