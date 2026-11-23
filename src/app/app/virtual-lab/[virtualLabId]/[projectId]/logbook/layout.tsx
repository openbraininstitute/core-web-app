import { notFound } from 'next/navigation';

import { getAllFlags, logbookFlag } from '@/features/feature-flags';
import { Logbook } from '@/features/logbook/logbook';

import type { ReactNode } from 'react';

export default async function LogbookLayout({ children }: { children: ReactNode }) {
  if ((await getAllFlags())[logbookFlag.key] !== true) notFound();

  return (
    <>
      <Logbook />
      {children}
    </>
  );
}
