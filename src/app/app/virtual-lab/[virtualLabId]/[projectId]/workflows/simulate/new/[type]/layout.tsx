'use client';

import { motion } from 'motion/react';

import { WorkspaceSection } from '@/constants';
import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { useMiniDetailView, useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { WorkflowScopeTabs } from '@/ui/segments/workflows/elements/scope-selector';
import { SimulateWorkflowsBreadcrumb } from '@/ui/segments/workflows/elements/simulate-breadcrumb';

import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const { mdv, setMdv } = useMiniDetailView();
  useDisableElementOverflow({ id: 'workspace-body' });
  useSelectEntityClickEvent((ev) => {
    setMdv(ev.detail.display);
  });

  return (
    <div className="h-full mx-2 flex flex-col max-h-[calc(100vh-6rem)] w-[calc(100%-10px)] overflow-hidden">
      <WorkflowScopeTabs className="max-w-max mb-3" />
      <div className="bg-background border-neutral-2 h-full  overflow-hidden rounded-2xl border">
        <SimulateWorkflowsBreadcrumb section={WorkspaceSection.SimulateWorkflow} />
        <motion.div
          id="workflow-new-inner-layout"
          className="grid gap-2 [grid-area:main] h-full max-h-[calc(100%-4rem)] px-3 py-2"
          initial={false}
          transition={{
            type: 'spring',
            stiffness: 320,
            damping: 30,
            mass: 0.6,
          }}
          style={{
            willChange: 'grid-template-columns, grid-template-areas',
            gridTemplateColumns: mdv ? '3fr 2fr' : '1fr',
            gridTemplateAreas: mdv ? "'body mini-view'" : "'body'",
          }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
