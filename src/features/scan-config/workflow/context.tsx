'use client';

import { useRouter } from '@bprogress/next';
import { createContext, useContext, useEffect, useMemo } from 'react';

import { parseScanConfigMode, ScanConfigModeSearchParam } from '@/features/scan-config/helpers';
import { ScanConfigWorkflowEntityProvider } from '@/features/scan-config/workflow/entity-provider';
import { listWorkflows } from '@/ui/segments/workflows/config/helpers';
import { buildConfigureUrlForEntity } from '@/ui/segments/workflows/config/routes';
import { WORKFLOW_SESSION_ID_SEARCH_PARAM } from '@/ui/segments/workflows/config/types';
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

/**
 * The configure URL of the workflow whose form made the origin campaign, when another one shows
 * it. Lists of Brian2 whole-brain campaigns hold the NeuroMechFly closed loop's too, and the
 * generic workflow's schema refuses the body's blocks.
 */
function ownWorkflowUrl({
  definition,
  scanConfig,
  workspace,
  searchParams,
  campaign,
}: Pick<TScanConfigWorkflowPageProps, 'definition' | 'scanConfig' | 'workspace' | 'searchParams'> & {
  campaign: TScanConfigWorkflowContextValue['campaign'];
}): string | null {
  const form = campaign.initialConfig;
  const formType = form?.type;
  if (!campaign.origin || typeof formType !== 'string' || formType === scanConfig.schemaName) {
    return null;
  }
  const owner = listWorkflows({ activity: definition.activity }).find(
    (workflow) => workflow.scanConfig?.schemaName === formType
  );
  const circuit = (form?.initialize as { circuit?: { id_str?: string } } | undefined)?.circuit;
  if (!owner?.targetType || !circuit?.id_str) return null;
  const query = Object.fromEntries(
    Object.entries(searchParams)
      .filter(([key]) => key !== WORKFLOW_SESSION_ID_SEARCH_PARAM)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
  );
  return buildConfigureUrlForEntity({
    activity: definition.activity,
    targetType: owner.targetType,
    workspace,
    entityId: circuit.id_str,
    entityType: owner.sourceType,
    skipSelectionPersist: true,
    query,
  });
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

  const router = useRouter();
  const redirect = useMemo(
    () => ownWorkflowUrl({ definition, scanConfig, workspace, searchParams, campaign }),
    [campaign, definition, scanConfig, searchParams, workspace]
  );
  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  const needsSelection =
    definition.entity.mode === ScanConfigEntitySourceMode.Session &&
    !definition.entity.picksEntitiesInEditor;
  const status = redirect
    ? ScanConfigWorkflowStatus.Pending
    : resolveWorkflowStatus({ entity, campaign, needsSelection });

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

/** Null outside the provider, for chrome that renders on both configure and other routes. */
export function useScanConfigWorkflowOptional(): TScanConfigWorkflowContextValue | null {
  return useContext(ScanConfigWorkflowContext);
}

export function useScanConfigWorkflow(): TScanConfigWorkflowContextValue {
  const context = useContext(ScanConfigWorkflowContext);
  if (!context) {
    throw new Error('useScanConfigWorkflow must be used within ScanConfigWorkflowProvider');
  }
  return context;
}
