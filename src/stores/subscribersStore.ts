import { create } from 'zustand';
import { Installation, InstallationRow } from '@/lib/types';
import { apiDelete } from '@/lib/api';
import { getAllInstallations } from '@/lib/unified-db';
import { normalizeInstallationRow } from '@/lib/mappers';

interface SubscribersState {
  subscribers: Installation[];
  isLoading: boolean;
  isSubmitting: boolean;
  lastFetched: number | null;
  error: string | null;
  setSubscribers: (subscribers: Installation[]) => void;
  setLoading: (loading: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
   setError: (error: string | null) => void;
  fetchSubscribers: () => Promise<void>;
  addSubscriber: (subscriber: Partial<Installation> & { id: string }) => Promise<void>;
  updateSubscriber: (id: string, updates: Partial<Installation>) => Promise<void>;
  deleteSubscriber: (id: string, joNumber?: string) => Promise<boolean>;
  clearCache: () => void;
}

export const useSubscribersStore = create<SubscribersState>((set, get) => ({
  subscribers: [],
  isLoading: false,
  isSubmitting: false,
  lastFetched: null,
  error: null,

  setSubscribers: (subscribers) => set({ subscribers, lastFetched: Date.now(), isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setError: (error) => set({ error, isLoading: false }),

   fetchSubscribers: async () => {
     set({ isLoading: true });
     try {
       const rows = await getAllInstallations();
       const subscribers = (rows as InstallationRow[]).map(normalizeInstallationRow);
       set({ subscribers, lastFetched: Date.now(), isLoading: false });
     } catch (error) {
       console.error('Error fetching subscribers:', error);
       set({ isLoading: false, error: 'Failed to fetch subscribers' });
     }
   },

  addSubscriber: async (subscriber) => {
    set({ isSubmitting: true });
    try {
      const response = await fetch('/api/installations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriber),
      });
      if (!response.ok) throw new Error('Failed to create subscriber');
      await get().fetchSubscribers();
      window.dispatchEvent(new CustomEvent('records-updated'));
    } catch (error) {
      console.error('Error adding subscriber:', error);
      set({ error: 'Failed to add subscriber', isSubmitting: false });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateSubscriber: async (id, updates) => {
    try {
      await fetch(`/api/installations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      await get().fetchSubscribers();
      window.dispatchEvent(new CustomEvent('records-updated'));
    } catch (error) {
      console.error('Error updating subscriber:', error);
    }
  },

  deleteSubscriber: async (id: string, joNumber?: string) => {
    const original = get().subscribers;
    try {
      await apiDelete(`/api/installations?id=${id}`);
      await get().fetchSubscribers();
      window.dispatchEvent(new CustomEvent('records-updated'));
      return true;
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      set({ subscribers: original });
      return false;
    }
  },

  clearCache: () => set({ subscribers: [], lastFetched: null }),
}));