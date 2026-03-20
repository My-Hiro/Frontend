import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuMode } from '@/types';

interface UiState {
  sidebarExpanded: boolean;
  menuMode: MenuMode;
  toggleSidebar: () => void;
  setMenuMode: (mode: MenuMode) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarExpanded: true,
      menuMode: 'advanced',
      toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
      setMenuMode: (mode) => set({ menuMode: mode }),
    }),
    {
      name: 'myhiro-ui-storage',
    }
  )
);
