'use client';

import type { ReactNode } from 'react';

import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { cn } from '@/utils/css-class';

type Props = {
  children: ReactNode;
};

export function WorkflowSimulateLayout({ children }: Props) {
  useDisableElementOverflow({ id: 'workspace-body' });

  return (
    <div
      id="workflow-simulate-layout"
      data-testid="workflow-simulate-layout"
      className={cn(
        'bg-background border-neutral-2 ml-2 gap-4 overflow-hidden rounded-2xl border px-2 py-4',
        'h-full max-h-[calc(100vh-4rem)]'
      )}
    >
      {children}
    </div>
  );
}
