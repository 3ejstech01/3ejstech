'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { getAllInstallations } from '@/lib/unified-db';
import type { InstallationRow } from '@/lib/unified-db';

function formatSyncStatus(row: InstallationRow, syncedIds: Set<string>): { label: string; color: string } {
  if (syncedIds.has(row.id)) return { label: 'Synced', color: 'bg-green-500' };
  if (row.updatedAt) return { label: 'Local', color: 'bg-amber-500' };
  return { label: 'Pending', color: 'bg-gray-400' };
}

export default function RecentRecordsPanel() {
  const [records, setRecords] = useState<InstallationRow[]>([]);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissPanel = useCallback(() => {
    setClosing(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 300);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismissPanel, 5000);
  }, [dismissPanel]);

  const fetchRecords = useCallback(async () => {
    try {
      const data = await getAllInstallations();
      const recent = data
        .sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bDate - aDate;
        })
        .slice(0, 5);
      setRecords(recent);
      setSyncedIds((prev) => new Set(prev).add(recent[0]?.id ?? ''));
      setVisible(true);
      setClosing(false);
      resetTimer();
    } catch {
      setVisible(false);
    }
  }, [resetTimer]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.count > 0) {
        fetchRecords();
      }
    };
    window.addEventListener('record-saved', handler);
    return () => {
      window.removeEventListener('record-saved', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchRecords]);

  if (!visible) return null;

  return (
    <div
      className={`fixed right-0 top-16 z-50 w-full md:w-96 max-w-[90vw] bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-out ${closing ? 'animate-slide-out' : 'animate-slide-in'}`}
      onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
      onMouseLeave={() => resetTimer()}
      role="complementary"
      aria-modal="false"
      aria-label="Recent records panel"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Records</h3>
        <button onClick={() => dismissPanel()} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close recent records panel">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {records.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No recent records</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {records.map((row) => {
              const sync = formatSyncStatus(row, syncedIds);
              return (
                <li key={row.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{row.subscriberName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{row.accountNumber}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {row.dateInstalled ? new Date(row.dateInstalled).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <div className="ml-3 flex items-center gap-1.5">
                      <span className={`inline-block w-2 h-2 rounded-full ${sync.color}`} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{sync.label}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}