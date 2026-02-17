import useTheme from '@/hooks/theme';

import type { ReactElement, ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  useTheme();
  return children as ReactElement<any>;
}
