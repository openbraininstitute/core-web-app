'use client';

import { notFound } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { WorkspaceSection } from '@/constants';
import { ScanConfigWorkflowEditorFieldProvider } from '@/features/scan-config/bridge/editor-context';
import { ScanConfigContainer } from '@/features/scan-config/container';
import { ScanConfigActivity, type TScanConfigActivity } from '@/features/scan-config/types';
import { useScanConfigWorkflow } from '@/features/scan-config/workflow/context';
import { ActivityRegistry } from '@/ui/segments/workflows/config/activities';
import { resolveScanConfigFromIdType } from '@/ui/segments/workflows/config/scan-config-binding';
import { cn } from '@/utils/css-class';

import { ScanConfigWorkflowStatus } from './types';

import type { ReactNode } from 'react';
import type { TWorkspaceSection } from '@/constants';
import type { IWorkflowDescriptor } from '@/ui/segments/workflows/config/types';

function scanConfigActivityToWorkspaceSection(activity: TScanConfigActivity): TWorkspaceSection {
  switch (activity) {
    case ScanConfigActivity.Simulate:
      return WorkspaceSection.SimulateWorkflow;
    case ScanConfigActivity.Extract:
      return WorkspaceSection.ExtractWorkflow;
    case ScanConfigActivity.Process:
      return WorkspaceSection.ProcessWorkflow;
    case ScanConfigActivity.Build:
      return WorkspaceSection.ScanConfigBuildWorkflow;
    default:
      return WorkspaceSection.GeneralWorkflow;
  }
}

function findWorkflowDescriptorByDefinitionId(definitionId: string): IWorkflowDescriptor | null {
  for (const activity of Object.values(ActivityRegistry)) {
    const workflows = [...activity.workflows, ...(activity.browseWorkflows ?? [])];

    for (const workflow of workflows) {
      if (workflow.scanConfig?.definition.id === definitionId) {
        return workflow;
      }
    }
  }

  return null;
}

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
  const { configureBinding } = scanConfig;

  const resolveSessionFromIdType = useCallback(
    (browseType: Parameters<typeof resolveScanConfigFromIdType>[1]) =>
      resolveScanConfigFromIdType(configureBinding, browseType),
    [configureBinding]
  );

  const workflowDescriptor = useMemo(
    () => findWorkflowDescriptorByDefinitionId(definition.id),
    [definition.id]
  );

  const workflowFieldContext = useMemo(
    () => ({
      activity: definition.activity,
      workspaceSection: scanConfigActivityToWorkspaceSection(definition.activity),
      configureBinding,
      configurationInputs: workflowDescriptor?.configurationInputs ?? [],
      workflowSessionSelection: entity.workflowSessionSelection,
      requireSpecies: workflowDescriptor?.requireSpecies,
      browseConfig: workflowDescriptor?.browseConfig,
    }),
    [
      configureBinding,
      definition.activity,
      entity.workflowSessionSelection,
      workflowDescriptor?.browseConfig,
      workflowDescriptor?.configurationInputs,
      workflowDescriptor?.requireSpecies,
    ]
  );

  return (
    <ScanConfigWorkflowEditorFieldProvider value={workflowFieldContext}>
      <ScanConfigContainer
        // NOTE: this will not reset the atoms
        // in another PR, i will add a proper atomFamily for the atoms used within the scan-config
        key={`${entity.workflowSessionId ?? ''}_${campaign.origin ?? ''}`}
        entity={entity.entity}
        entityId={entity.entityId}
        virtualLabId={workspace.virtualLabId}
        projectId={workspace.projectId}
        origin={campaign.origin}
        initialConfig={campaign.initialConfig}
        workflowSessionSelection={entity.workflowSessionSelection}
        resolveSessionFromIdType={resolveSessionFromIdType}
        activity={definition.activity}
        defaultTab={editor.defaultTab}
        readOnly={editor.readOnly}
        campaignOriginAction={editor.campaignOriginAction}
        className={editor.className}
        scanConfig={scanConfig}
      />
    </ScanConfigWorkflowEditorFieldProvider>
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
