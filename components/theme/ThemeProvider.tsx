"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "rek-theme";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function readDomTheme(): ThemeMode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

let currentTheme: ThemeMode = "light";
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  currentTheme = readStoredTheme();
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

function emit() {
  listeners.forEach((listener) => listener());
}

/** Only notify subscribers when the value actually changed. */
function commitTheme(next: ThemeMode) {
  applyTheme(next);
  if (currentTheme === next) return;
  currentTheme = next;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ThemeMode {
  return currentTheme;
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

function writeTheme(theme: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore quota / private mode
  }
  commitTheme(theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    commitTheme(readStoredTheme());

    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      commitTheme(event.newValue === "dark" ? "dark" : "light");
    }

    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      const stored = readStoredTheme();
      if (stored !== currentTheme || stored !== readDomTheme()) {
        commitTheme(stored);
      }
    }

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    writeTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    writeTheme(currentTheme === "dark" ? "light" : "dark");
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
