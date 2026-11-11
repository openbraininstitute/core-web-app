import { useSetAtom } from 'jotai';
import { type ReactElement, type ReactNode, useEffect } from 'react';

import useTheme from '@/hooks/theme';
import { initializeTheme, themeAtom } from '@/state/theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const setTheme = useSetAtom(themeAtom);

  // Initialize theme from OS preference on mount
  useEffect(() => {
    const initialTheme = initializeTheme();
    setTheme(initialTheme);
  }, [setTheme]);

  useTheme();
  return children as ReactElement<any>;
}
