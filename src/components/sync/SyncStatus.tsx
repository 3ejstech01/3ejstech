'use client';

import { useEffect, useState } from 'react';
import { useSyncQueueStore } from '@/stores/syncQueueStore';

type BadgeState = 'idle' | 'syncing' | 'pending' | 'conflict' | 'error';

export function SyncStatus() {
  const { queue, isFlushing, notifications, removeNotification, setShowConflictModal } = useSyncQueueStore();
  const [showSuccess, setShowSuccess] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  const pending = queue.filter(op => op.status === 'pending' || op.status === 'syncing').length;
  const conflictCount = queue.filter(op => op.status === 'conflict').length;

  const lastSuccess = notifications.find(n => n.type === 'success');
  const lastError = notifications.find(n => n.type === 'error');

  useEffect(() => {
    if (lastSuccess) {
      setShowSuccess(true);
      setFadingOut(false);
      const t = setTimeout(() => {
        setFadingOut(true);
        setTimeout(() => setShowSuccess(false), 500);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [lastSuccess?.id]);

  useEffect(() => {
    if (lastError) {
      removeNotification(lastError.id);
    }
  }, [lastError?.id]);

  let badgeState: BadgeState = 'idle';
  if (isFlushing || pending > 0) badgeState = 'syncing';
  else if (conflictCount > 0) badgeState = 'conflict';
  else if (showSuccess) badgeState = 'pending';

  if (badgeState === 'idle') return null;

  return (
    <div className="flex items-center gap-2">
      {badgeState === 'syncing' && (
        <span className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Syncing...
        </span>
      )}

      {badgeState === 'conflict' && (
        <button
          onClick={() => setShowConflictModal(true)}
          className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 animate-pulse cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {conflictCount} conflict{conflictCount > 1 ? 's' : ''}
        </button>
      )}

      {showSuccess && badgeState === 'pending' && (
        <span className={`flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 transition-opacity duration-500 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}>
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Saved
        </span>
      )}
    </div>
  );
}