'use client';

import { useDataLoading } from '@/context/DataProvider';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function DataLoader({ children }: { children: React.ReactNode }) {
  const { isLoading, isReady, error } = useDataLoading();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isReady && !authLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, isReady, authLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Loading Data...</h2>
          <p className="text-slate-400 text-sm">Connecting to database</p>
          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}