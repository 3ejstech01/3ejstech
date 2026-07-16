'use client';

import { useSyncQueueStore } from '@/stores/syncQueueStore';
import { resolveConflict } from '@/lib/sync-queue';
import { useState } from 'react';

export function SyncConflictModal() {
  const { showConflictModal, setShowConflictModal, queue } = useSyncQueueStore();
  const [resolving, setResolving] = useState(false);

  if (!showConflictModal) return null;

  const conflictOp = queue.find(op => op.status === 'conflict' || op.status === 'dead-letter');
  if (!conflictOp) return null;

  const deadLetterOps = queue.filter(op => op.status === 'dead-letter');
  const currentOp = deadLetterOps.find(op => op.id === conflictOp.id) ?? conflictOp;
  const localData = currentOp.data;
  const theirData = currentOp.conflictData || {};

  const allKeys = Array.from(new Set([...Object.keys(localData), ...Object.keys(theirData)])).filter(
    k => !['id', 'createdAt', 'timestamp'].includes(k)
  );

  const differentFields = allKeys.filter(k => {
    const lv = String(localData[k] ?? '');
    const tv = String(theirData[k] ?? '');
    return lv !== tv;
  });

  const handleResolve = async (resolution: 'mine' | 'theirs' | 'retry', opId?: string) => {
    setResolving(true);
    try {
      await resolveConflict(opId ?? conflictOp.id, resolution);
    } finally {
      setResolving(false);
    }
  };

  const isDeadLetter = conflictOp.status === 'dead-letter';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sync Conflict Detected</h2>
          </div>
          <button
            onClick={() => setShowConflictModal(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
          This record was also modified elsewhere. Choose which version to keep.
        </div>

        {deadLetterOps.length > 0 && (
          <div className="mx-6 mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">Failed Operations ({deadLetterOps.length})</h4>
            {deadLetterOps.map(op => (
              <div key={op.id} className="flex items-center justify-between py-1">
                <span className="text-sm text-red-700 dark:text-red-400">{op.type} — {op.keyValue}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolve('retry', op.id)}
                    disabled={resolving}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => handleResolve('theirs', op.id)}
                    disabled={resolving}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                  >
                    Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto px-6 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">My Version</h3>
              <div className="space-y-1">
                {differentFields.map(field => (
                  <div key={field} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                    <span className="font-medium text-gray-500 dark:text-gray-400 capitalize">{field}:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{String(localData[field] ?? '—')}</span>
                  </div>
                ))}
                {differentFields.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No differing fields found.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Their Version</h3>
              <div className="space-y-1">
                {differentFields.map(field => (
                  <div key={field} className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                    <span className="font-medium text-gray-500 dark:text-gray-400 capitalize">{field}:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{String(theirData[field] ?? '—')}</span>
                  </div>
                ))}
                {differentFields.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No differing fields found.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={() => setShowConflictModal(false)}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => handleResolve('theirs')}
            disabled={resolving}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            Keep Theirs
          </button>
          <button
            onClick={() => handleResolve('mine')}
            disabled={resolving}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Keep Mine
          </button>
          {isDeadLetter && (
            <button
              onClick={() => handleResolve('retry')}
              disabled={resolving}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}