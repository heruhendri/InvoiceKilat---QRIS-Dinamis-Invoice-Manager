import { useSyncExternalStore, useCallback } from 'react';

export function getInitialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('invoice_kilat_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {}
  return 'light';
}

let currentTheme: 'light' | 'dark' = getInitialTheme();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error notifying theme listener:', e);
    }
  });
}

export function applyThemeClass(theme: 'light' | 'dark') {
  try {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('invoice_kilat_theme', theme);
    }
  } catch {}
}

export function setTheme(theme: 'light' | 'dark') {
  if (currentTheme === theme) return;
  currentTheme = theme;
  applyThemeClass(theme);
  notify();
}

export function toggleTheme() {
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): 'light' | 'dark' {
  return currentTheme;
}

function getServerSnapshot(): 'light' | 'dark' {
  return 'light';
}

// Ensure theme class is applied on script load and sync with storage events across tabs
if (typeof window !== 'undefined') {
  applyThemeClass(currentTheme);

  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === 'invoice_kilat_theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
      if (currentTheme !== e.newValue) {
        currentTheme = e.newValue;
        applyThemeClass(e.newValue);
        notify();
      }
    }
  });
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const handleToggle = useCallback(() => {
    toggleTheme();
  }, []);

  const handleSetTheme = useCallback((newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme: handleToggle,
    setTheme: handleSetTheme,
  };
}
