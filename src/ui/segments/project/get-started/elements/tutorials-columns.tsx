'use client';

import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export function TutorialsColumns({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <section
      id="tutorials"
      data-testid="tutorials"
      className="relative flex h-full w-full items-start gap-8 pb-4"
    >
      <div
        className={cn('relative flex h-full w-[40%] min-w-0 flex-col gap-3 overflow-hidden')}
      >
        {left}
      </div>
      <div className="h-full w-[60%] min-w-0">{right}</div>
    </section>
  );
}

export default TutorialsColumns;
