'use client';

import { createContext, useContext, useMemo } from 'react';

import { ScanConfigWorkflowEntityProvider } from '@/features/scan-config/workflow/entity-provider';
import {
  ScanConfigEntitySourceMode,
  ScanConfigWorkflowStatus,
  type TResolvedScanConfigEntity,
  type TScanConfigWorkflowContextValue,
  type TScanConfigWorkflowDefinition,
  type TScanConfigWorkflowPageProps,
  type TScanConfigWorkflowStatus,
} from '@/features/scan-config/workflow/types';
import { useWorkflowCampaign } from '@/features/scan-config/workflow/use-workflow-campaign';
import { log } from '@/utils/logger';

const ScanConfigWorkflowContext = createContext<TScanConfigWorkflowContextValue | null>(null);

function entitySourceRequiresEntity(
  entitySource: TScanConfigWorkflowDefinition['entity']
): boolean {
  return (
    entitySource.mode === ScanConfigEntitySourceMode.Session && entitySource.query !== undefined
  );
}

function requiresWorkflowSelection(entitySource: TScanConfigWorkflowDefinition['entity']): boolean {
  return entitySource.mode === ScanConfigEntitySourceMode.Session;
}

function resolveWorkflowStatus({
  entity,
  campaign,
  requiresEntity,
  needsSelection,
}: {
  entity: TResolvedScanConfigEntity;
  campaign: TScanConfigWorkflowContextValue['campaign'];
  requiresEntity: boolean;
  needsSelection: boolean;
}): TScanConfigWorkflowStatus {
  if (campaign.error) {
    return ScanConfigWorkflowStatus.Blocked;
  }

  if (needsSelection && entity.workflowSelection === null) {
    return ScanConfigWorkflowStatus.Blocked;
  }

  // Resume URL had a campaign id, but resolve returned nothing → 404 (not a blank pending screen).
  if (campaign.originId && !campaign.isLoading && !campaign.campaignData) {
    return ScanConfigWorkflowStatus.Blocked;
  }

  if (requiresEntity && !entity.entity) {
    return ScanConfigWorkflowStatus.Blocked;
  }

  if (!campaign.shouldRender) {
    return ScanConfigWorkflowStatus.Pending;
  }

  return ScanConfigWorkflowStatus.Ready;
}

function ScanConfigWorkflowContextValueProvider({
  definition,
  workspace,
  routeParams,
  searchParams,
  entity,
  children,
}: TScanConfigWorkflowPageProps & { entity: TResolvedScanConfigEntity }) {
  const campaign = useWorkflowCampaign({
    campaignSource: definition.campaign,
    workspace,
    searchParams,
  });

  const requiresEntity = entitySourceRequiresEntity(definition.entity);
  const needsSelection = requiresWorkflowSelection(definition.entity);
  log('debug', 'ScanConfigWorkflowContextValueProvider', {
    entity,
    campaign,
    requiresEntity,
    needsSelection,
  });
  const status = resolveWorkflowStatus({
    entity,
    campaign,
    requiresEntity,
    needsSelection,
  });
  log('debug', 'ScanConfigWorkflowContextValueProvider', { status });
  const value = useMemo<TScanConfigWorkflowContextValue>(
    () => ({
      definition,
      workspace,
      entity,
      campaign,
      status,
      editor: definition.editor ?? {},
    }),
    [campaign, definition, entity, status, workspace]
  );
  log('debug', 'ScanConfigWorkflowContextValueProvider', { value });
  return (
    <ScanConfigWorkflowContext.Provider value={value}>
      {children}
    </ScanConfigWorkflowContext.Provider>
  );
}

export function ScanConfigWorkflowProvider({
  definition,
  workspace,
  routeParams,
  searchParams,
  children,
}: TScanConfigWorkflowPageProps) {
  return (
    <ScanConfigWorkflowEntityProvider
      entitySource={definition.entity}
      workspace={workspace}
      routeParams={routeParams}
    >
      {(entity) => (
        <ScanConfigWorkflowContextValueProvider
          definition={definition}
          workspace={workspace}
          routeParams={routeParams}
          searchParams={searchParams}
          entity={entity}
        >
          {children}
        </ScanConfigWorkflowContextValueProvider>
      )}
    </ScanConfigWorkflowEntityProvider>
  );
}

export function useScanConfigWorkflow(): TScanConfigWorkflowContextValue {
  const context = useContext(ScanConfigWorkflowContext);
  if (!context) {
    throw new Error('useScanConfigWorkflow must be used within ScanConfigWorkflowProvider');
  }
  return context;
}
