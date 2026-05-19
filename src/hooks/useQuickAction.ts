'use client';

import { create } from 'zustand';

interface QuickActionState {
  openNewInstallation: boolean;
  openNewELoad: boolean;
  setOpenNewInstallation: (open: boolean) => void;
  setOpenNewELoad: (open: boolean) => void;
  reset: () => void;
}

export const useQuickAction = create<QuickActionState>((set) => ({
  openNewInstallation: false,
  openNewELoad: false,
  setOpenNewInstallation: (open) => set({ openNewInstallation: open }),
  setOpenNewELoad: (open) => set({ openNewELoad: open }),
  reset: () => set({ openNewInstallation: false, openNewELoad: false }),
}));