'use client';

import { RightOutlined } from '@ant-design/icons';
import { useAtom } from 'jotai';

import { leftPaneViewAtom } from '@/ui/segments/project/get-started/elements/left-pane-view-atom';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export function TutorialsColumns({ left, right }: { left: ReactNode; right: ReactNode }) {
  const [view, setView] = useAtom(leftPaneViewAtom);
  const collapsed = view !== null;

  return (
    <section
      id="tutorials"
      data-testid="tutorials"
      className="relative flex h-full w-full items-start gap-8 pb-4"
    >
      <div
        className={cn(
          'relative flex max-h-full min-w-0 flex-col gap-3 overflow-y-auto rounded-xl bg-[#ededed] p-3 transition-[width] duration-200 ease-out',
          collapsed ? 'w-[204px]' : 'w-[40%]'
        )}
      >
        {left}
      </div>
      {collapsed && (
        <button
          type="button"
          aria-label="Expand left pane"
          onClick={() => setView(null)}
          className={cn(
            'border-neutral-2 bg-background hover:border-primary-9 hover:text-primary-9 text-primary-9 absolute -translate-y-1/2 z-10 flex size-9 items-center justify-center rounded-full border shadow-md transition-colors',
            'top-[46px] left-[186px]'
          )}
        >
          <RightOutlined className="text-sm" />
        </button>
      )}
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
