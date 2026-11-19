import { Logbook } from '@/features/logbook/logbook';

import type { ReactNode } from 'react';

/** The logbook stays mounted across its addresses; the pages below only name them. */
export default function LogbookLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Logbook />
      {children}
    </>
  );
}
