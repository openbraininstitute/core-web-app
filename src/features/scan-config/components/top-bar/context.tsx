'use client';

import { createContext, useContext } from 'react';

import { TopBar } from '@/ui/molecules/top-bar';

import type { ReactNode } from 'react';

/**
 * What the host page puts on the scan-config panel's top bar: `start`, a ready-made breadcrumb chip,
 * and `end`, e.g. the details page's close (the tabs sit before it, the template's campaign copy in
 * the centre). Hosts compose them without threading props through the container.
 */
export type ScanConfigTopBarSlots = { start?: ReactNode; end?: ReactNode };

const ScanConfigTopBarContext = createContext<ScanConfigTopBarSlots>({});

export function ScanConfigTopBarProvider({
  start,
  end,
  children,
}: ScanConfigTopBarSlots & { children: ReactNode }) {
  // no memo: hosts pass fresh elements every render, so it could never hit (and the compiler is on)
  return (
    <ScanConfigTopBarContext.Provider value={{ start, end }}>
      {children}
    </ScanConfigTopBarContext.Provider>
  );
}

export function useScanConfigTopBarSlots() {
  return useContext(ScanConfigTopBarContext);
}

/** The host's slots as a plain top bar, for states that render no tabs rail (errors, empty). */
export function ScanConfigTopBar() {
  const { start, end } = useScanConfigTopBarSlots();
  return <TopBar start={start} end={end} />;
}
