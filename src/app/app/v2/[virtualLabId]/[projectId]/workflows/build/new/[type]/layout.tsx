'use client';

import { type ReactNode } from 'react';
import { motion } from 'motion/react';

import { useMiniDetailView, useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { BuildWorkflowsBreadcrumb } from '@/ui/segments/workflows/elements/build-breadcrumb';
import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { cn } from '@/utils/css-class';

export default function Layout({ children }: { children: ReactNode }) {
  const { mdv, setMdv } = useMiniDetailView();
  useDisableElementOverflow({ id: 'workspace-body' });
  useSelectEntityClickEvent((ev) => {
    setMdv(ev.detail.display);
  });

  return (
    <div className="bg-background border-neutral-2 mx-2 h-full max-h-[calc(100vh-6rem)] w-[calc(100%-10px)] overflow-hidden rounded-2xl border">
      <BuildWorkflowsBreadcrumb />
      <motion.div
        id="workflow-new-inner-layout"
        className={cn('grid gap-2 [grid-area:main]', 'h-full max-h-[calc(100%-4rem)] px-3 py-2')}
        initial={{
          gridTemplateColumns: '1fr',
          gridTemplateAreas: "'body'",
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
  );
}
