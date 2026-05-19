import { create } from 'zustand';
import { ELoadTransaction } from '@/lib/types';
import axios from '@/lib/axios';
import { normalizeEloadRow } from '@/lib/mappers';
import { ELoadRow } from '@/lib/types';

interface ELoadState {
  transactions: ELoadTransaction[];
  isLoading: boolean;
  isSubmitting: boolean;
  lastFetched: number | null;
  error: string | null;
  setTransactions: (transactions: ELoadTransaction[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: Partial<ELoadTransaction> & { gcashAcct: string; accountNo: string; amount: number }) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<ELoadTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  clearAll: () => void;
}

export const AMOUNT_COMPUTED: Record<number, { markedUp: number; retailer: number; dealer: number; incentive: number }> = {
  700: { markedUp: 10, retailer: 28,   dealer: 21,  incentive: 49   },
  300: { markedUp: 10, retailer: 15.2, dealer: 11.4, incentive: 26.6 },
  200: { markedUp: 19, retailer: 8,    dealer: 6,   incentive: 14   },
  50:  { markedUp: 5,  retailer: 2,    dealer: 1.5, incentive: 3.5  },
};

export const useELoadStore = create<ELoadState>((set, get) => ({
  transactions: [],
  isLoading: false,
  isSubmitting: false,
  lastFetched: null,
  error: null,

  setTransactions: (transactions) => set({ transactions, lastFetched: Date.now(), isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),

   fetchTransactions: async () => {
     set({ isLoading: true });
     try {
       const res = await axios.get<ELoadRow[]>('/api/eload');
       const transactions = res.data.map(normalizeEloadRow);
       set({ transactions, lastFetched: Date.now(), isLoading: false });
     } catch (error) {
       console.error('Error fetching eload:', error);
       set({ isLoading: false, error: 'Failed to fetch transactions' });
     }
   },

  addTransaction: async (transaction) => {
    set({ isSubmitting: true });
    try {
      await axios.post('/api/eload', transaction);
      await get().fetchTransactions();
      window.dispatchEvent(new CustomEvent('records-updated'));
    } catch (error) {
      console.error('Error adding transaction:', error);
      const errorMsg = (error as Error).message || 'Failed to add transaction';
      set({ error: errorMsg, isSubmitting: false });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateTransaction: async (id, data) => {
    const original = get().transactions;
    try {
      await axios.patch('/api/eload', { id, ...data });
      await get().fetchTransactions();
    } catch (error) {
      console.error('Error updating transaction:', error);
      set({ transactions: original, error: 'Failed to update transaction' });
    }
  },

  deleteTransaction: async (id) => {
    const original = get().transactions;
    try {
      await axios.delete(`/api/eload?id=${id}`);
      await get().fetchTransactions();
      window.dispatchEvent(new CustomEvent('records-updated'));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      set({ transactions: original, error: 'Failed to delete transaction' });
    }
  },

  clearAll: () => set({ transactions: [], lastFetched: null }),
}));