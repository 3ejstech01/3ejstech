import { create } from 'zustand';
import { ELoadTransaction, ELoadRow } from '@/lib/types';
import { normalizeEloadRow, denormalizeEloadRow } from '@/lib/mappers';
import { getAllEload, createEload, updateEload, deleteEload } from '@/lib/unified-db';

interface ELoadState {
  transactions: ELoadTransaction[];
  isLoading: boolean;
  isSubmitting: boolean;
  lastFetched: number | null;
  error: string | null;
  hasData: boolean;
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
  hasData: false,

  setTransactions: (transactions) => set({ transactions, lastFetched: Date.now(), isLoading: false, error: null, hasData: transactions.length > 0 }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),

   fetchTransactions: async () => {
     set({ isLoading: true });
     try {
       const rows = await getAllEload();
       const transactions = (rows as unknown as ELoadRow[]).map(normalizeEloadRow);
       set({ transactions, lastFetched: Date.now(), isLoading: false, error: null, hasData: transactions.length > 0 });
     } catch (error) {
       console.error('Error fetching eload:', error);
       set({ isLoading: false, error: 'Failed to fetch transactions' });
     }
   },

  addTransaction: async (transaction) => {
    set({ isSubmitting: true });
    try {
      const row = denormalizeEloadRow(transaction);
      await createEload(row as Parameters<typeof createEload>[0]);
      window.dispatchEvent(new CustomEvent('data-version'));
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
      await updateEload(id, data as Parameters<typeof updateEload>[1]);
      window.dispatchEvent(new CustomEvent('data-version'));
    } catch (error) {
      console.error('Error updating transaction:', error);
      set({ transactions: original, error: 'Failed to update transaction' });
    }
  },

  deleteTransaction: async (id) => {
    const original = get().transactions;
    try {
      await deleteEload(id);
      window.dispatchEvent(new CustomEvent('data-version'));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      set({ transactions: original, error: 'Failed to delete transaction' });
    }
  },

  clearAll: () => set({ transactions: [], lastFetched: null, error: null, hasData: false }),
}));

window.addEventListener('data-version', () => {
  useELoadStore.getState().fetchTransactions();
});