"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { AuthGate } from "../components/auth/AuthGate";
import type { AdminAuthSession } from "../lib/api/session";
import { adminAuthApi } from "../lib/api/auth";
import { useAppStore } from "../store/useAppStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [authSession, setAuthSession] = useState<AdminAuthSession | null>(() => adminAuthApi.getSession());
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
  }, [theme]);

  if (!authSession) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={toggleTheme}
          className="fixed top-6 right-6 p-2 rounded-full hover:bg-accent text-muted-foreground transition-colors z-50 bg-card border shadow-sm"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <AuthGate onAuthenticated={setAuthSession} />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}