'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

export interface ColumnDef<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
}

export interface TableConfig {
  columnOrder: string[];
  hiddenColumns: string[];
  sortKey: string;
  sortDirection: 'asc' | 'desc';
}

export function useTableConfig<T>(
  storageKey: string,
  defaultColumns: ColumnDef<T>[],
  defaultSortKey = '',
  defaultSortDirection: 'asc' | 'desc' = 'asc',
) {
  const [config, setConfig] = useState<TableConfig>(() => {
    if (typeof window === 'undefined') {
      return {
        columnOrder: defaultColumns.map(c => c.key),
        hiddenColumns: [],
        sortKey: defaultSortKey,
        sortDirection: defaultSortDirection,
      };
    }
    try {
      const stored = localStorage.getItem(`table-config-${storageKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const allDefaultKeys = defaultColumns.map(c => c.key);
        const order = parsed.columnOrder?.filter((k: string) => allDefaultKeys.includes(k)) || allDefaultKeys;
        const missing = allDefaultKeys.filter((k: string) => !order.includes(k));
        return {
          columnOrder: [...order, ...missing],
          hiddenColumns: parsed.hiddenColumns || [],
          // Always use the passed defaults for sort — don't restore stale cached sort
          sortKey: defaultSortKey || parsed.sortKey || '',
          sortDirection: defaultSortKey ? defaultSortDirection : (parsed.sortDirection || defaultSortDirection),
        };
      }
    } catch {}
    return {
      columnOrder: defaultColumns.map(c => c.key),
      hiddenColumns: [],
      sortKey: defaultSortKey,
      sortDirection: defaultSortDirection,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(`table-config-${storageKey}`, JSON.stringify(config));
    } catch {}
  }, [config, storageKey]);

  const visibleColumns = useMemo(() => {
    return config.columnOrder
      .filter(key => !config.hiddenColumns.includes(key))
      .map(key => defaultColumns.find(c => c.key === key))
      .filter(Boolean) as ColumnDef<T>[];
  }, [config.columnOrder, config.hiddenColumns, defaultColumns]);

  const toggleColumn = useCallback((key: string) => {
    setConfig(prev => ({
      ...prev,
      hiddenColumns: prev.hiddenColumns.includes(key)
        ? prev.hiddenColumns.filter(k => k !== key)
        : [...prev.hiddenColumns, key],
    }));
  }, []);

  const moveColumn = useCallback((key: string, direction: 'up' | 'down') => {
    setConfig(prev => {
      const idx = prev.columnOrder.indexOf(key);
      if (idx === -1) return prev;
      const newOrder = [...prev.columnOrder];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= newOrder.length) return prev;
      [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
      return { ...prev, columnOrder: newOrder };
    });
  }, []);

  const toggleSort = useCallback((key: string) => {
    setConfig(prev => {
      if (prev.sortKey === key) {
        if (prev.sortDirection === 'asc') {
          return { ...prev, sortDirection: 'desc' };
        }
        return { ...prev, sortKey: '', sortDirection: 'asc' };
      }
      return { ...prev, sortKey: key, sortDirection: 'asc' };
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfig({
      columnOrder: defaultColumns.map(c => c.key),
      hiddenColumns: [],
      sortKey: defaultSortKey,
      sortDirection: defaultSortDirection,
    });
  }, [defaultColumns, defaultSortKey, defaultSortDirection]);

  return {
    config,
    visibleColumns,
    toggleColumn,
    moveColumn,
    toggleSort,
    resetConfig,
  };
}

export function sortData<T>(data: T[], sortKey: string, sortDirection: 'asc' | 'desc', columns: ColumnDef<T>[]): T[] {
  if (!sortKey) return data;
  const col = columns.find(c => c.key === sortKey);
  if (!col) return data;
  const getSortVal = col.sortValue || (() => '');

  return [...data].sort((a, b) => {
    const va = getSortVal(a);
    const vb = getSortVal(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;

    const strA = String(va).toLowerCase();
    const strB = String(vb).toLowerCase();

    if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
    if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}