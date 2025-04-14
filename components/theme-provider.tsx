"use client";

import { useEffect, useState } from "react";

type ThemeOption = "cosmema" | "modern" | "minimal";
const LAST_USED_THEME_KEY = "last_used_theme";

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

  return <>{children}</>;
}
