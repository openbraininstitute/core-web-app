'use client';

import { atom } from 'jotai';

export type Theme = 'dark' | 'light';

const baseThemeAtom = atom<Theme>('light');

// Derived atom that applies the dark class to the HTML element
export const themeAtom = atom(
  (get) => get(baseThemeAtom),
  (get, set, newTheme: Theme) => {
    set(baseThemeAtom, newTheme);

    // Apply dark class to HTML element for Tailwind and Shiki
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  }
);

// Initialize theme from OS preference on first load
export function initializeTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = prefersDark ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', prefersDark);
  return theme;
}
