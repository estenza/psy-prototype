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
export type AppThemePreference = AppTheme | "system";

const APP_THEME_STORAGE_KEY = "psy-prototype:theme";

type AppThemeContextValue = {
  setTheme: (theme: AppThemePreference) => void;
  theme: AppTheme;
  themePreference: AppThemePreference;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function resolveDocumentTheme(): AppTheme {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function isAppThemePreference(value: string | null | undefined): value is AppThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function resolveSystemTheme(): AppTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveInitialThemePreference(): AppThemePreference {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const storedPreference = window.localStorage.getItem(APP_THEME_STORAGE_KEY);

    if (isAppThemePreference(storedPreference)) {
      return storedPreference;
    }
  } catch {
    // If localStorage is unavailable, fall back to the current document theme.
  }

  const documentPreference = document.documentElement.dataset.themePreference;

  if (isAppThemePreference(documentPreference)) {
    return documentPreference;
  }

  return resolveDocumentTheme();
}

function resolveThemePreference(preference: AppThemePreference): AppTheme {
  return preference === "system" ? resolveSystemTheme() : preference;
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
  const [themePreference, setThemePreferenceState] = useState<AppThemePreference>(
    resolveInitialThemePreference,
  );
  const [systemTheme, setSystemTheme] = useState<AppTheme>(resolveSystemTheme);
  const theme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    applyTheme(theme);
    document.documentElement.dataset.themePreference = themePreference;

    try {
      window.localStorage.setItem(APP_THEME_STORAGE_KEY, themePreference);
    } catch {
      // If localStorage is unavailable, keep the current theme only for this session.
    }

    document.cookie = `${APP_THEME_COOKIE_NAME}=${themePreference};path=/;max-age=${APP_THEME_COOKIE_MAX_AGE};SameSite=Lax`;
  }, [theme, themePreference]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (
        event.key !== APP_THEME_STORAGE_KEY ||
        !isAppThemePreference(event.newValue)
      ) {
        return;
      }

      setThemePreferenceState(event.newValue);
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (themePreference !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSystemThemeChange() {
      setSystemTheme(resolveSystemTheme());
    }

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [themePreference]);

  const setTheme = useCallback((nextTheme: AppThemePreference) => {
    setThemePreferenceState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemePreferenceState((currentPreference) => (
      resolveThemePreference(currentPreference) === "dark" ? "light" : "dark"
    ));
  }, []);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      setTheme,
      theme,
      themePreference,
      toggleTheme,
    }),
    [setTheme, theme, themePreference, toggleTheme],
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
