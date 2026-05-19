import { create } from 'zustand';
import { localDb } from '@/lib/database';
import { InstallationRow } from '@/lib/types';

interface TechnicianData {
  name: string;
  count: number;
}

interface TechniciansState {
  technicians: TechnicianData[];
  isLoading: boolean;
  lastFetched: number | null;
  fetchTechnicians: () => Promise<void>;
  refreshCount: () => Promise<void>;
}

const CACHE_DURATION = 5 * 60 * 1000;

export const useTechniciansStore = create<TechniciansState>((set, get) => ({
  technicians: [],
  isLoading: false,
  lastFetched: null,

  fetchTechnicians: async () => {
    const { lastFetched } = get();
    const now = Date.now();
    if (lastFetched && (now - lastFetched) < CACHE_DURATION) return;

    set({ isLoading: true });
    try {
      const installations = await localDb.getAll<InstallationRow>('installations');
      const techCounts: Record<string, number> = {};
      installations.forEach((inst) => {
        const techField = inst.assignedTechnician || '';
        if (techField) {
          const techs = techField.split(/\//).map((t) => t.replace(/[.:]/g, '').replace(/[^a-zA-Z0-9\s]/g, '').trim()).filter(Boolean);
          techs.forEach((tech) => { techCounts[tech] = (techCounts[tech] || 0) + 1; });
        }
      });
      const technicians = Object.entries(techCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
      set({ technicians, lastFetched: now, isLoading: false });
    } catch (error) {
      console.error('Error fetching technicians:', error);
      set({ isLoading: false });
    }
  },

  refreshCount: async () => {
    set({ lastFetched: null });
    await get().fetchTechnicians();
  },
}));

export const getTechnicianDisplayName = (name: string, count: number): string => {
  return `${name} (${count})`;
};
