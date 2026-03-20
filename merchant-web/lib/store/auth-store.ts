import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, type AuthSession } from '@/lib/api/auth.service';

interface AuthState {
  session: AuthSession | null;
  loading: boolean;
  setSession: (session: AuthSession | null) => void;
  signIn: (input: any) => Promise<AuthSession>;
  signUp: (input: any) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      loading: true,
      setSession: (session) => set({ session }),
      signIn: async (input) => {
        const next = await authService.signInWithPassword(input);
        set({ session: next });
        return next;
      },
      signUp: async (input) => {
        const next = await authService.signUp(input);
        set({ session: next });
        return next;
      },
      signOut: async () => {
        await authService.clearSession();
        set({ session: null });
      },
      initialize: () => {
        const current = authService.getSession();
        set({ session: current, loading: false });
      },
    }),
    {
      name: 'myhiro-auth-storage',
      partialize: (state) => ({ session: state.session }),
    }
  )
);
