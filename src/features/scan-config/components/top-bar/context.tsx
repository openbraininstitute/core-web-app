'use client';

import { createContext, useContext, useMemo } from 'react';

import type { ReactNode } from 'react';

/**
 * What the host page puts on the scan-config panel's top bar: `start`, a ready-made breadcrumb chip (or
 * nothing; the tabs take the end, the template's campaign copy the centre). Hosts compose it without
 * threading props through the container.
 */
export type ScanConfigTopBarSlots = { start?: ReactNode };

const ScanConfigTopBarContext = createContext<ScanConfigTopBarSlots>({});

export function ScanConfigTopBarProvider({
  start,
  children,
}: ScanConfigTopBarSlots & { children: ReactNode }) {
  const value = useMemo(() => ({ start }), [start]);
  return (
    <ScanConfigTopBarContext.Provider value={value}>{children}</ScanConfigTopBarContext.Provider>
  );
}

export function useScanConfigTopBarSlots() {
  return useContext(ScanConfigTopBarContext);
}
