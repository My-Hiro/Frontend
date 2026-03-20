import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DiscoveryAuthSession } from '../services/auth.service';
import { CONFIG } from '../lib/config';

interface LocationState {
  label: string;
  lat: number | null;
  lng: number | null;
}

interface DiscoveryState {
  session: DiscoveryAuthSession | null;
  location: LocationState;
  theme: "light" | "dark";
  
  // Actions
  setSession: (session: DiscoveryAuthSession | null) => void;
  setLocation: (loc: LocationState) => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  logout: () => void;
}

export const useDiscoveryStore = create<DiscoveryState>()(
  persist(
    (set) => ({
      session: null,
      location: { label: "Accra, Ghana", lat: null, lng: null },
      theme: "light",

      setSession: (session) => set({ session }),
      
      setLocation: (location) => set({ location }),
      
      setTheme: (theme) => {
        if (typeof window !== "undefined") {
          document.documentElement.classList.toggle("dark", theme === "dark");
        }
        set({ theme });
      },
      
      toggleTheme: () => set((state) => {
        const next = state.theme === "light" ? "dark" : "light";
        if (typeof window !== "undefined") {
          document.documentElement.classList.toggle("dark", next === "dark");
        }
        return { theme: next };
      }),

      logout: () => set({ session: null }),
    }),
    {
      name: CONFIG.AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
        location: state.location,
        theme: state.theme,
      }),
    }
  )
);
