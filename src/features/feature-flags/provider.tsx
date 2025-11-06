'use client';

import { createContext, useContext } from 'react';
import { FeatureFlags } from './flags';

const FlagsContext = createContext<FeatureFlags | null>(null);

export function FlagsProvider({
  children,
  flags,
}: {
  children: React.ReactNode;
  flags: FeatureFlags;
}) {
  return <FlagsContext.Provider value={flags}>{children}</FlagsContext.Provider>;
}

export function useFlags(): FeatureFlags {
  const flags = useContext(FlagsContext);
  if (!flags) throw new Error('useFlags must be used within FlagsProvider');
  return flags;
}

export function useFlag(key: keyof FeatureFlags): boolean {
  const flags = useFlags();
  return flags[key];
}
