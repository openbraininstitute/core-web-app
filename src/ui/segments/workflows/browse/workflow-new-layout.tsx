'use client';

import { motion } from 'motion/react';
import { useParams } from 'next/navigation';

import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { useMiniDetailView, useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { WorkflowBreadcrumbProvider } from '@/ui/segments/workflows/browse/workflow-breadcrumb-context';
import { WorkflowBreadcrumb } from '@/ui/segments/workflows/elements/workflow-breadcrumb';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/** Spring used to animate the body ⇄ mini-detail-view column transition. */
const GRID_TRANSITION = {
  type: 'spring',
  stiffness: 320,
  damping: 30,
  mass: 0.6,
} as const;

export function WorkflowNewLayout({ children }: { children: ReactNode }) {
  const { type } = useParams<{ type: string }>();
  const { mdv, setMdv } = useMiniDetailView();
  useDisableElementOverflow({ id: 'workspace-body' });
  useSelectEntityClickEvent((ev) => {
    setMdv(ev.detail.display);
  });

  const gridTemplate = {
    gridTemplateColumns: mdv ? '3fr 2fr' : '1fr',
    gridTemplateRows: '1fr auto',
    gridTemplateAreas: mdv ? "'body mini-view' 'footer mini-view'" : "'body' 'footer'",
  };

  return (
    <div className="mx-2 flex h-full min-h-0 w-[calc(100%-10px)] flex-col overflow-hidden">
      <WorkflowBreadcrumbProvider key={type}>
        <WorkflowBreadcrumb />
        <div className="bg-background border-neutral-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border">
          <motion.div
            id="browse-workflow-new-inner-layout"
            className={cn('grid min-h-0 flex-1 gap-2 [grid-area:main]', 'px-3 py-2')}
            initial={gridTemplate}
            animate={gridTemplate}
            transition={GRID_TRANSITION}
            style={{ willChange: 'grid-template-columns, grid-template-areas' }}
          >
            {children}
          </motion.div>
        </div>
      </WorkflowBreadcrumbProvider>
    </div>
  );
}
