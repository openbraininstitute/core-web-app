'use client';

import { createContext, useContext } from 'react';
import type { FeatureFlags } from './flags';

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

export function useFlag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
  const flags = useFlags();
  return flags[key];
}
