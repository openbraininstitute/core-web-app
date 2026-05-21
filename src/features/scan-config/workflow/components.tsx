'use client';

import { notFound } from 'next/navigation';

import { ScanConfigContainer } from '@/features/scan-config/container';
import { useScanConfigWorkflow } from '@/features/scan-config/workflow/context';
import { cn } from '@/utils/css-class';

import { ScanConfigWorkflowStatus } from './types';

import type { ReactNode } from 'react';

function ScanConfigWorkflowGate({ children }: { children: ReactNode }) {
  const { status } = useScanConfigWorkflow();

  if (status === ScanConfigWorkflowStatus.Blocked) {
    return notFound();
  }

  if (status === ScanConfigWorkflowStatus.Pending) {
    return null;
  }

  return children;
}

function ScanConfigWorkflowFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('border-neutral-2 ml-2 h-full rounded-2xl border', className)}>
      {children}
    </div>
  );
}

function ScanConfigWorkflowEditor() {
  const { definition, workspace, entity, campaign, editor } = useScanConfigWorkflow();

  return (
    <ScanConfigContainer
      entity={entity.entity}
      entityId={entity.entityId}
      entityType={entity.entityType}
      virtualLabId={workspace.virtualLabId}
      projectId={workspace.projectId}
      initialConfig={campaign.initialConfig}
      activity={definition.activity}
      schemaMappingKey={editor.schemaMappingKey}
      defaultTab={editor.defaultTab}
      readOnly={editor.readOnly}
      campaignOriginAction={editor.campaignOriginAction}
      className={editor.className}
    />
  );
}

function ScanConfigWorkflowAside({ children }: { children: ReactNode }) {
  return children;
}

export const ScanConfigWorkflow = {
  Gate: ScanConfigWorkflowGate,
  Frame: ScanConfigWorkflowFrame,
  Editor: ScanConfigWorkflowEditor,
  Aside: ScanConfigWorkflowAside,
};
