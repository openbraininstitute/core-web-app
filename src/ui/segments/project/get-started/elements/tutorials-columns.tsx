'use client';

import { useAtomValue } from 'jotai';

import { leftPaneViewAtom } from '@/ui/segments/project/get-started/elements/left-pane-view-atom';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export function TutorialsColumns({ left, right }: { left: ReactNode; right: ReactNode }) {
  const view = useAtomValue(leftPaneViewAtom);
  const collapsed = view !== null;

  return (
    <section
      id="tutorials"
      data-testid="tutorials"
      className="flex h-full w-full items-start gap-8 pb-4"
    >
      <div
        className={cn(
          'flex max-h-full min-w-0 flex-col gap-3 overflow-y-auto rounded-xl bg-[#ededed] p-3 transition-[width] duration-200 ease-out',
          collapsed ? 'w-[204px]' : 'w-[40%]'
        )}
      >
        {left}
      </div>
      <div
        className={cn(
          'h-full min-w-0 transition-[width] duration-200 ease-out',
          collapsed ? 'flex-1' : 'w-[60%]'
        )}
      >
        {right}
      </div>
    </section>
  );
}

export default TutorialsColumns;
