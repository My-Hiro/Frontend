import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RangePreset } from "../lib/api/client";

export type ThemeMode = "light" | "dark";
export type RangeMode = RangePreset | "custom";
export type PlatformRankingView =
  | "ranked-searches"
  | "top-stores"
  | "full-store-ranking"
  | "product-sales-ranking"
  | "sales-dimension-ranking"
  | "customer-purchase-intelligence";

interface AppState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;

  rangeMode: RangeMode;
  setRangeMode: (mode: RangeMode) => void;
  
  customStart: string;
  setCustomStart: (date: string) => void;
  
  customEnd: string;
  setCustomEnd: (date: string) => void;

  platformRankingView: PlatformRankingView;
  setPlatformRankingView: (view: PlatformRankingView) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

      rangeMode: "30days",
      setRangeMode: (mode) => set({ rangeMode: mode }),

      customStart: "",
      setCustomStart: (date) => set({ customStart: date }),

      customEnd: "",
      setCustomEnd: (date) => set({ customEnd: date }),

      platformRankingView: "ranked-searches",
      setPlatformRankingView: (view) => set({ platformRankingView: view }),
    }),
    {
      name: "myhiro_admin_app_state",
      partialize: (state) => ({ theme: state.theme }), // Only persist theme, or keep as is. Actually original code only persisted theme.
    }
  )
);