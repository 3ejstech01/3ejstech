'use client';

import { useEffect, useCallback } from 'react';

type EventCallback = () => void;

const listeners = new Map<string, Set<EventCallback>>();

export function emitEvent(eventName: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}

function getListenerSet(eventName: string): Set<EventCallback> {
  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set());
  }
  return listeners.get(eventName)!;
}

export function useEventListener(
  eventName: string,
  callback: EventCallback,
  deps: React.DependencyList = []
): void {
  const stableCallback = useCallback(callback, deps);

  useEffect(() => {
    const listenerSet = getListenerSet(eventName);
    listenerSet.add(stableCallback);

    const handler = () => {
      listenerSet.forEach(cb => cb());
    };

    window.addEventListener(eventName, handler);

    return () => {
      window.removeEventListener(eventName, handler);
      listenerSet.delete(stableCallback);
    };
  }, [eventName, stableCallback]);
}

export function useDbSync(callback: EventCallback, deps: React.DependencyList = []): void {
  useEventListener('db-synced', callback, deps);
}

export function useRecordsUpdate(callback: EventCallback, deps: React.DependencyList = []): void {
  useEventListener('records-updated', callback, deps);
}