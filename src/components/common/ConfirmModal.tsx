'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  variant?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isConfirming = false,
  variant = 'danger',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-overlay p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="p-5">
            <h3 className="text-lg font-semibold text-text">{title}</h3>
            <p className="mt-2 text-sm text-text/60">{description}</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={isConfirming}
                onClick={onClose}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text hover:bg-background disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => void onConfirm()}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${
                  variant === 'primary' ? 'bg-primary hover:bg-primary-dark' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isConfirming ? 'Working...' : confirmLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
