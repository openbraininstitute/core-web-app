'use client';

import { type ReactNode, useState } from 'react';
import { motion } from 'motion/react';

import { SimulateWorkflowsBreadcrumb } from '@/ui/segments/workflows/elements/simulate-breadcrumb';
import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

export default function Layout({ children }: { children: ReactNode }) {
  const [miniViewPresent, setMiniViewPresent] = useState(false);
  useDisableElementOverflow({ id: 'workspace-body' });
  useSelectEntityClickEvent((ev) => {
    setMiniViewPresent(ev.detail.display);
  });

  return (
    <div className="bg-background border-neutral-2 mx-2 h-full max-h-[calc(100vh-6rem)] w-[calc(100%-10px)] overflow-hidden rounded-2xl border">
      <SimulateWorkflowsBreadcrumb />
      <motion.div
        id="workflow-new-inner-layout"
        className={cn(
          'grid gap-2 [grid-area:main]',
          'h-full max-h-[calc(100%-4rem)] px-3 py-2',
          { "grid-cols-1 [grid-template-areas:'body']": !miniViewPresent },
          { "grid-cols-[3fr_2fr] [grid-template-areas:'body_mini-view']": miniViewPresent }
        )}
        initial={false}
        animate={{
          gridTemplateColumns: miniViewPresent ? '3fr 2fr' : '1fr',
          gridTemplateAreas: miniViewPresent ? "'body mini-view'" : "'body'",
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
