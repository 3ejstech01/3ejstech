'use client';

import React from 'react';
import { ColumnDef } from '@/hooks/useTableConfig';
import { VirtualTable } from './VirtualTable';

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey?: (row: T, index: number) => string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription,
  rowKey = (_row, index) => String(index),
  className = '',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-xl bg-border/50" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center">
          <h3 className="text-sm font-semibold text-text">{emptyTitle}</h3>
          {emptyDescription && <p className="mt-1 text-sm text-text/50">{emptyDescription}</p>}
        </div>
      </div>
    );
  }

  const useVirtual = data.length > 100;

  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-surface ${className}`}>
      {useVirtual ? (
        <VirtualTable columns={columns} data={data} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-border bg-background/60 text-left text-xs font-semibold uppercase tracking-wide text-text/50">
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3 whitespace-nowrap">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={rowKey(row, index)} className="border-b border-border/40 last:border-0 hover:bg-primary/5">
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3 text-sm text-text/70 ${column.className || ''}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
