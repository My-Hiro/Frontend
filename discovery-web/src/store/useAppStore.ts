import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type DiscoveryAuthSession } from '../state/api';

interface AppState {
  // Navigation (Next.js handles URL, but we might keep stack for mobile-like feel if needed)
  // For now, we rely on Next.js routing.
  
  // Auth
  session: DiscoveryAuthSession | null;
  authPromptOpen: boolean;
  authMode: 'signin' | 'signup' | 'forgot' | 'reset';
  
  // UI
  location: string;
  locationPromptOpen: boolean;
  searchQuery: string;
  
  // Actions
  setSession: (session: DiscoveryAuthSession | null) => void;
  setAuthPromptOpen: (open: boolean) => void;
  setAuthMode: (mode: 'signin' | 'signup' | 'forgot' | 'reset') => void;
  setLocation: (location: string) => void;
  setLocationPromptOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      authPromptOpen: false,
      authMode: 'signin',
      location: 'Accra, Ghana',
      locationPromptOpen: false,
      searchQuery: '',
      
      setSession: (session) => set({ session }),
      setAuthPromptOpen: (authPromptOpen) => set({ authPromptOpen }),
      setAuthMode: (authMode) => set({ authMode }),
      setLocation: (location) => set({ location }),
      setLocationPromptOpen: (locationPromptOpen) => set({ locationPromptOpen }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
    }),
    {
      name: 'hiro-storage',
      partialize: (state) => ({ session: state.session, location: state.location }),
    }
  )
);