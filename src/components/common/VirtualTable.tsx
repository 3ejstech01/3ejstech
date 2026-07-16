'use client';
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ColumnDef } from '@/hooks/useTableConfig';

export function VirtualTable<T>({ columns, data, rowHeight = 44 }: {
  columns: ColumnDef<T>[]; data: T[]; rowHeight?: number;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });
  return (
    <div ref={parentRef} className="overflow-auto max-h-[70vh]">
      <table className="w-full min-w-[720px]">
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text/50">
            {columns.map(c => <th key={c.key} className="px-4 py-3 whitespace-nowrap">{c.label}</th>)}
          </tr>
        </thead>
        <tbody style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(vi => (
            <tr key={vi.key} className="border-b border-border/40 absolute w-full"
                style={{ transform: `translateY(${vi.start}px)`, height: vi.size }}>
              {columns.map(c => <td key={c.key} className={`px-4 py-3 text-sm text-text/70 ${c.className || ''}`}>{c.render(data[vi.index])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}