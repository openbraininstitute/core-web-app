import { notFound } from 'next/navigation';

import { getAllFlags, logbookFlag } from '@/features/feature-flags';
import { Logbook } from '@/features/logbook/logbook';

import type { ReactNode } from 'react';

/** The logbook stays mounted across its addresses; the pages below only name them. */
export default async function LogbookLayout({ children }: { children: ReactNode }) {
  if ((await getAllFlags())[logbookFlag.key] !== true) notFound();

  return (
    <>
      <Logbook />
      {children}
    </>
  );
}
