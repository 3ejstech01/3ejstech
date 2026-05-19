'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import { syncFromRemote } from '@/lib/unified-db';

interface DataLoadingContextType {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
}

const DataLoadingContext = createContext<DataLoadingContextType>({
  isLoading: true,
  isReady: false,
  error: null,
});

export function useDataLoading() {
  return useContext(DataLoadingContext);
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        console.log('[DataProvider] Loading initial data...');
        await syncFromRemote();
        console.log('[DataProvider] Data loaded successfully');
        setIsReady(true);
      } catch (err) {
        console.error('[DataProvider] Failed to load data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <DataLoadingContext.Provider value={{ isLoading, isReady, error }}>
      {children}
    </DataLoadingContext.Provider>
  );
}