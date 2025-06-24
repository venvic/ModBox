"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemeOption = "cosmema" | "modern" | "minimal";
const LAST_USED_THEME_KEY = "last_used_theme";

const ThemeContext = createContext<ThemeOption | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeOption>("modern");

  const getLastUsedTheme = (): ThemeOption => {
    const storedTheme = localStorage.getItem(LAST_USED_THEME_KEY);
    return storedTheme ? (storedTheme as ThemeOption) : "modern";
  };

  const applyTheme = (theme: ThemeOption) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(LAST_USED_THEME_KEY, theme);
  };

  useEffect(() => {
    const storedTheme = getLastUsedTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useCurrentTheme(): ThemeOption {
  const theme = useContext(ThemeContext);
  if (theme === undefined) {
    throw new Error("useCurrentTheme must be used within a ThemeProvider");
  }
  return theme;
}
