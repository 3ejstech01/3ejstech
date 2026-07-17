'use client';

import React, { useEffect, useState } from 'react';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  kind: ToastKind;
  message: string;
}

const toastStore: { listeners: Set<(toasts: ToastMessage[]) => void>; toasts: ToastMessage[] } = {
  listeners: new Set(),
  toasts: [],
};

export function showToast(message: string, kind: ToastKind = 'info', ttl = 4000) {
  if (typeof window === 'undefined') return;
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  toastStore.toasts = [...toastStore.toasts, { id, kind, message }];
  toastStore.listeners.forEach((listener) => listener(toastStore.toasts));
  window.setTimeout(() => {
    toastStore.toasts = toastStore.toasts.filter((toast) => toast.id !== id);
    toastStore.listeners.forEach((listener) => listener(toastStore.toasts));
  }, ttl);
}

export function ToastStack() {
  const [toasts, setToasts] = useState<ToastMessage[]>(toastStore.toasts);

  useEffect(() => {
    const listener = (next: ToastMessage[]) => setToasts(next);
    toastStore.listeners.add(listener);
    return () => {
      toastStore.listeners.delete(listener);
    };
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:bottom-6 sm:right-6" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-2xl border p-4 shadow-xl backdrop-blur ${
            toast.kind === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
              : toast.kind === 'error'
                ? 'border-red-500/20 bg-red-500/10 text-red-700'
                : toast.kind === 'warning'
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-700'
                  : 'border-blue-500/20 bg-blue-500/10 text-blue-700'
          }`}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
