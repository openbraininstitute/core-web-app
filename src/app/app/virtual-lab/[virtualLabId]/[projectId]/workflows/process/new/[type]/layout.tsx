'use client';

import { motion } from 'motion/react';
import { useParams } from 'next/navigation';

import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { useMiniDetailView, useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { WorkflowBreadcrumbProvider } from '@/ui/segments/workflows/browse/workflow-breadcrumb-context';
import { WorkflowScopeTabs } from '@/ui/segments/workflows/elements/scope-selector';
import { WorkflowBreadcrumb } from '@/ui/segments/workflows/elements/workflow-breadcrumb';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const { type } = useParams<{ type: string }>();
  const { mdv, setMdv } = useMiniDetailView();
  useDisableElementOverflow({ id: 'workspace-body' });
  useSelectEntityClickEvent((ev) => {
    setMdv(ev.detail.display);
  });

  return (
    <div className="h-full mx-2 flex flex-col max-h-[calc(100vh-6rem)] w-[calc(100%-10px)] overflow-hidden">
      <WorkflowScopeTabs className="max-w-max mb-3" />
      <WorkflowBreadcrumbProvider key={type}>
        <div className="bg-background border-neutral-2 h-full  overflow-hidden rounded-2xl border">
          <WorkflowBreadcrumb />
          <motion.div
            id="workflow-new-inner-layout"
            className={cn(
              'grid gap-2 [grid-area:main]',
              'h-full max-h-[calc(100%-4rem)] px-3 py-2',
              { "grid-cols-1 [grid-template-areas:'body']": !mdv },
              { "grid-cols-[3fr_2fr] [grid-template-areas:'body_mini-view']": mdv }
            )}
            initial={false}
            animate={{
              gridTemplateColumns: mdv ? '3fr 2fr' : '1fr',
              gridTemplateAreas: mdv ? "'body mini-view'" : "'body'",
            }}
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 30,
              mass: 0.6,
            }}
            style={{ willChange: 'grid-template-columns, grid-template-areas' }}
          >
            {children}
          </motion.div>
        </div>
      </WorkflowBreadcrumbProvider>
    </div>
  );
}
