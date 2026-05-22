'use client';

import { notFound } from 'next/navigation';
import { useMemo } from 'react';

import { useObioneJsonSchema } from '@/features/scan-config/components/hooks/schema';
import { ScanConfigContainer } from '@/features/scan-config/container';
import { useScanConfigWorkflow } from '@/features/scan-config/workflow/context';
import { mergeWorkflowSessionSelectionIntoConfig } from '@/features/scan-config/workflow/workflow-session-selection';
import { resolveScanConfigFromIdType } from '@/ui/segments/workflows/config/scan-config-binding';
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
  const { definition, scanConfig, workspace, entity, campaign, editor } = useScanConfigWorkflow();
  const { configureBinding, schemaName } = scanConfig;

  const { schema } = useObioneJsonSchema({ schemaName });

  const initialConfig = useMemo(() => {
    const base = campaign.initialConfig;
    if (!base || !entity.workflowSessionSelection || !schema) {
      return base;
    }

    return mergeWorkflowSessionSelectionIntoConfig({
      config: base,
      schema,
      sessionSelection: entity.workflowSessionSelection,
      resolveFromIdType: (browseType) => resolveScanConfigFromIdType(configureBinding, browseType),
    });
  }, [campaign.initialConfig, configureBinding, entity.workflowSessionSelection, schema]);

  return (
    <ScanConfigContainer
      entity={entity.entity}
      entityId={entity.entityId}
      virtualLabId={workspace.virtualLabId}
      projectId={workspace.projectId}
      initialConfig={initialConfig}
      activity={definition.activity}
      defaultTab={editor.defaultTab}
      readOnly={editor.readOnly}
      campaignOriginAction={editor.campaignOriginAction}
      className={editor.className}
      scanConfig={scanConfig}
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
