'use client';

import React, { useState, useCallback } from 'react';
import { syncFromRemote } from '@/lib/unified-db';
import { motion, AnimatePresence } from 'framer-motion';

export const SyncButton: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  const handleSync = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      await syncFromRemote();
      window.dispatchEvent(new CustomEvent('db-synced'));
      setShowCheck(true);
      setTimeout(() => setShowCheck(false), 2000);
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  return (
    <motion.button
      onClick={handleSync}
      disabled={isSyncing}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
        isSyncing
          ? 'bg-primary/50 cursor-not-allowed text-white/70'
          : showCheck
          ? 'bg-green-500 text-white'
          : 'bg-gradient-to-br from-primary to-secondary text-white hover:shadow-lg hover:shadow-primary/40'
      }`}
    >
      <AnimatePresence mode="wait">
        {isSyncing ? (
          <motion.svg
            key="spinner"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </motion.svg>
        ) : showCheck ? (
          <motion.svg
            key="check"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </motion.svg>
        ) : (
          <motion.svg
            key="sync"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
};