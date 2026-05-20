'use client';

import { motion } from 'motion/react';

import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { useMiniDetailView, useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { BuildWorkflowsBreadcrumb } from '@/ui/segments/workflows/elements/build-breadcrumb';
import { WorkflowScopeTabs } from '@/ui/segments/workflows/elements/scope-selector';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const { mdv, setMdv } = useMiniDetailView();
  useDisableElementOverflow({ id: 'workspace-body' });
  useSelectEntityClickEvent((ev) => {
    setMdv(ev.detail.display);
  });

  return (
    <div className="mx-2 flex h-full max-h-[calc(100vh-6rem)] w-[calc(100%-10px)] flex-col overflow-hidden">
      <WorkflowScopeTabs className="mb-3 max-w-max" />
      <div className="bg-background border-neutral-2 h-full overflow-hidden rounded-2xl border">
        <BuildWorkflowsBreadcrumb />
        <motion.div
          id="workflow-new-inner-layout"
          className={cn('grid gap-2 [grid-area:main]', 'h-full max-h-[calc(100%-3rem)] px-3 py-2')}
          initial={{
            gridTemplateColumns: mdv ? '3fr 2fr' : '1fr',
            gridTemplateAreas: mdv ? "'body mini-view'" : "'body'",
          }}
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
    </div>
  );
}
