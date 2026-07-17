'use client';

import { create } from 'zustand';

interface QuickActionState {
  openNewInstallation: boolean;
  setOpenNewInstallation: (open: boolean) => void;
  reset: () => void;
}

export const useQuickAction = create<QuickActionState>((set) => ({
  openNewInstallation: false,
  setOpenNewInstallation: (open) => set({ openNewInstallation: open }),
  reset: () => set({ openNewInstallation: false }),
}));