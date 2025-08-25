'use client';

import type { ReactNode } from 'react';

import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { Header } from '@/ui/segments/workflows/elements/browse-header';
import { cn } from '@/utils/css-class';

type Props = {
  children: ReactNode;
};

export function WorkflowBrowseLayout({ children }: Props) {
  useDisableElementOverflow({ id: 'workspace-body' });

  return (
    <div
      id="workflow-browse-layout"
      data-testid="workflow-browse-layout"
      className={cn(
        'bg-neutral-1 border-neutral-2 mx-2 gap-4 overflow-hidden rounded-2xl border px-5 py-4',
        'h-full max-h-[calc(100vh-6rem)]'
      )}
    >
      <Header />
      <div className="mt-5 h-full max-h-[calc(100%-4rem)] w-full">{children}</div>
    </div>
  );
}
