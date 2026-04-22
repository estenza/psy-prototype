"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { APP_THEME_COOKIE_MAX_AGE, APP_THEME_COOKIE_NAME } from "@/components/theme/theme-constants";

export type AppTheme = "light" | "dark";

const APP_THEME_STORAGE_KEY = "psy-prototype:theme";

type AppThemeContextValue = {
  setTheme: (theme: AppTheme) => void;
  theme: AppTheme;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function resolveDocumentTheme(): AppTheme {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
  document.documentElement.classList.toggle("theme-dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function AppThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<AppTheme>(resolveDocumentTheme);

  useEffect(() => {
    applyTheme(theme);

    try {
      window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    } catch {
      // If localStorage is unavailable, keep the current theme only for this session.
    }

    document.cookie = `${APP_THEME_COOKIE_NAME}=${theme};path=/;max-age=${APP_THEME_COOKIE_MAX_AGE};SameSite=Lax`;
  }, [theme]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (
        event.key !== APP_THEME_STORAGE_KEY ||
        (event.newValue !== "light" && event.newValue !== "dark")
      ) {
        return;
      }

      setThemeState(event.newValue);
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      setTheme,
      theme,
      toggleTheme,
    }),
    [setTheme, theme, toggleTheme],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider.");
  }

  return context;
}
