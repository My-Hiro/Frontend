"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary min-w-[36px] min-h-[36px]" aria-label="Toggle theme">
        <div className="w-4 h-4 opacity-50" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary min-w-[36px] min-h-[36px] transition-colors hover:bg-secondary/80"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-secondary-foreground" />
      ) : (
        <Moon className="w-4 h-4 text-secondary-foreground" />
      )}
    </button>
  );
}