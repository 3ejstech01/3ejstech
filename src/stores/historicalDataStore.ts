import { create } from 'zustand';
import { HistoricalDataRow } from '@/lib/types';
import { getAllHistoricalData } from '@/lib/unified-db';

interface HistoricalDataState {
  records: HistoricalDataRow[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchRecords: () => Promise<void>;
  clearCache: () => void;
}

// Client-side normalization: convert any remaining string numerics to proper types
function normalizeHistoricalRow(row: any): HistoricalDataRow {
  const parseNum = (v: unknown): number => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const parsed = parseFloat(v);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  return {
    id: row.id,
    dateInstalled: row.dateInstalled || '',
    joNumber: row.joNumber || '',
    accountNumber: String(row.accountNumber || '').replace(/\.0$/, ''),
    subscriberName: row.subscriberName || '',
    address: row.address || '',
    contactNumber1: row.contactNumber1 || '',
    contactNumber2: row.contactNumber2 || '',
    assignedTechnician: row.assignedTechnician || '',
    modemSerial: row.modemSerial || '',
    port: row.port || '',
    napBoxLonglat: row.napBoxLonglat || '',
    fiberOpticCable: row.fiberOpticCable || '',
    mechanicalConnector: row.mechanicalConnector || '',
    sClamp: row.sClamp || '',
    patchcordApsc: row.patchcordApsc || '',
    houseBracket: row.houseBracket || '',
    midspan: row.midspan || '',
    cableClip: row.cableClip || '',
    ftthTerminalBox: row.ftthTerminalBox || '',
    doubleSidedTape: row.doubleSidedTape || '',
    cableTieWrap: row.cableTieWrap || '',
    gcashHandler: row.gcashHandler || '',
    gcashReference: row.gcashReference || '',
    timeLoaded: row.timeLoaded || '',
    amount: parseNum(row.amount),
    markup: parseNum(row.markup),
    incentive: parseNum(row.incentive),
    retailer: parseNum(row.retailer),
    dealer: parseNum(row.dealer),
    remarks: row.remarks || '',
    createdAt: row.createdAt || '',
    updatedAt: row.updatedAt || '',
  };
}

export const useHistoricalDataStore = create<HistoricalDataState>((set) => ({
  records: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchRecords: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getAllHistoricalData();
      const mapped = data.map(row => normalizeHistoricalRow(row));
      set({ records: mapped, lastFetched: Date.now(), isLoading: false });
    } catch (error) {
      console.error('Error fetching historical data:', error);
      set({ isLoading: false, error: 'Failed to fetch historical data' });
    }
  },

  clearCache: () => set({ records: [], lastFetched: null }),
}));