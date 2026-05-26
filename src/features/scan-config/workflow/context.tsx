'use client';

import { createContext, useContext, useMemo } from 'react';

import { parseScanConfigMode, ScanConfigModeSearchParam } from '@/features/scan-config/helpers';
import { ScanConfigWorkflowEntityProvider } from '@/features/scan-config/workflow/entity-provider';
import {
  ScanConfigEntitySourceMode,
  ScanConfigWorkflowStatus,
  type TResolvedScanConfigEntity,
  type TScanConfigWorkflowContextValue,
  type TScanConfigWorkflowPageProps,
  type TScanConfigWorkflowStatus,
} from '@/features/scan-config/workflow/types';
import { useWorkflowCampaign } from '@/features/scan-config/workflow/use-workflow-campaign';

const ScanConfigWorkflowContext = createContext<TScanConfigWorkflowContextValue | null>(null);

function resolveWorkflowStatus({
  entity,
  campaign,
  needsSelection,
}: {
  entity: TResolvedScanConfigEntity;
  campaign: TScanConfigWorkflowContextValue['campaign'];
  needsSelection: boolean;
}): TScanConfigWorkflowStatus {
  if (campaign.error) {
    return ScanConfigWorkflowStatus.Blocked;
  }

  // resume/duplicate flows pass `origin` so configure can proceed from an existing
  // campaign without a fresh session-scoped entity selection in storage.
  if (needsSelection && !entity.workflowSessionSelection && !campaign.origin) {
    return ScanConfigWorkflowStatus.Blocked;
  }

  // resume URL had a campaign id, but resolve returned nothing → 404 (not a blank pending screen).
  if (campaign.origin && !campaign.isLoading && !campaign.campaignData) {
    return ScanConfigWorkflowStatus.Blocked;
  }

  if (!campaign.shouldRender) {
    return ScanConfigWorkflowStatus.Pending;
  }

  return ScanConfigWorkflowStatus.Ready;
}

function ScanConfigWorkflowContextValueProvider({
  definition,
  scanConfig,
  workspace,
  searchParams,
  entity,
  children,
}: TScanConfigWorkflowPageProps & { entity: TResolvedScanConfigEntity }) {
  const campaign = useWorkflowCampaign({
    campaignSource: definition.campaign,
    workspace,
    searchParams,
  });

  const needsSelection = definition.entity.mode === ScanConfigEntitySourceMode.Session;
  const status = resolveWorkflowStatus({ entity, campaign, needsSelection });

  // the configure route is shared by view and duplicate actions; the duplicate flow flags
  // itself with `?mode=duplicate`, which overrides the definition's default action so the
  // editor opens editable instead of the read-only campaign view
  const modeOverride = parseScanConfigMode(searchParams[ScanConfigModeSearchParam]);

  const value = useMemo<TScanConfigWorkflowContextValue>(
    () => ({
      definition,
      scanConfig,
      workspace,
      entity,
      campaign,
      status,
      editor: {
        ...(definition.editor ?? {}),
        ...(modeOverride ? { campaignOriginAction: modeOverride } : {}),
      },
    }),
    [campaign, definition, entity, modeOverride, scanConfig, status, workspace]
  );

  return (
    <ScanConfigWorkflowContext.Provider value={value}>
      {children}
    </ScanConfigWorkflowContext.Provider>
  );
}

export function ScanConfigWorkflowProvider({
  definition,
  scanConfig,
  workspace,
  routeParams,
  searchParams,
  children,
}: TScanConfigWorkflowPageProps) {
  return (
    <ScanConfigWorkflowEntityProvider
      entitySource={definition.entity}
      routeParams={routeParams}
      configureBinding={scanConfig.configureBinding}
    >
      {(entity) => (
        <ScanConfigWorkflowContextValueProvider
          definition={definition}
          scanConfig={scanConfig}
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
