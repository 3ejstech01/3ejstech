'use client';

import React from 'react';
import { Sidebar } from '@/components/common/Sidebar';
import { MobileNav } from '@/components/common/MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface LayoutWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const LayoutWrapper: React.FC<LayoutWrapperProps> = ({ children, requireAuth = true }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (requireAuth && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, requireAuth, router]);

  if (requireAuth && (isLoading || !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative w-10 h-10 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="mt-4 text-sm text-text/50">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileNav />
      <div className="flex">
        {isAuthenticated && (
          <div className="hidden lg:block">
            <Sidebar />
          </div>
        )}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex-1 min-h-screen pb-20 pt-14 lg:pt-0 lg:pb-0"
        >
          <div className="p-4 lg:px-6 lg:py-6 max-w-7xl mx-auto">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  );
};