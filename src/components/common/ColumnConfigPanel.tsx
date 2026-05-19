'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ColumnDef, TableConfig } from '@/hooks/useTableConfig';

interface Props<T> {
  columns: ColumnDef<T>[];
  config: TableConfig;
  onToggleColumn: (key: string) => void;
  onMoveColumn: (key: string, direction: 'up' | 'down') => void;
  onReset: () => void;
}

export function ColumnConfigPanel<T>({
  columns,
  config,
  onToggleColumn,
  onMoveColumn,
  onReset,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const orderedColumns = config.columnOrder
    .map(key => columns.find(c => c.key === key))
    .filter(Boolean) as ColumnDef<T>[];

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-background border border-border text-sm text-text/70 hover:bg-primary/5 hover:text-text transition-colors"
        title="Configure columns"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.925.332.238.747.372 1.182.281l1.277-.308c.54-.13 1.1.14 1.383.593l1.296 2.247c.283.453.216 1.044-.217 1.381l-.969.83c-.3.257-.462.612-.462.993 0 .38.163.736.462.993l.97.83c.433.337.5.928.216 1.381l-1.296 2.247c-.283.453-.843.723-1.383.59l-1.277-.307c-.435-.091-.85.043-1.182.28-.332.24-.582.552-.645.926l-.213 1.282c-.09.543-.56.939-1.11.939h-2.593c-.55 0-1.02-.396-1.11-.94l-.214-1.281c-.062-.374-.312-.686-.644-.925-.332-.238-.747-.372-1.182-.281l-1.277.308c-.54.13-1.1-.14-1.383-.593l-1.296-2.247c-.283-.453-.216-1.044.217-1.381l.969-.83c.3-.257.462-.612.462-.993 0-.38-.163-.736-.462-.993l-.97-.83c-.433-.337-.5-.928-.216-1.381l1.296-2.247c.283-.453.843-.723 1.383-.59l1.277.308c.435.091.85-.043 1.182-.28.332-.24.582-.552.645-.926l.213-1.282z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Columns
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-surface rounded-xl border border-border shadow-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-text">Configure Columns</span>
            <button
              onClick={() => { onReset(); }}
              className="text-xs text-primary hover:text-primary/80 font-medium"
            >
              Reset
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {orderedColumns.map((col, idx) => {
              const isHidden = config.hiddenColumns.includes(col.key);
              return (
                <div
                  key={col.key}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${isHidden ? 'text-text/30' : 'text-text'}`}
                >
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    onChange={() => onToggleColumn(col.key)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="flex-1 truncate">{col.label}</span>
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => onMoveColumn(col.key, 'up')}
                      disabled={idx === 0}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-primary/10 disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onMoveColumn(col.key, 'down')}
                      disabled={idx === orderedColumns.length - 1}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-primary/10 disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-border">
            <button
              onClick={() => setOpen(false)}
              className="w-full px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}