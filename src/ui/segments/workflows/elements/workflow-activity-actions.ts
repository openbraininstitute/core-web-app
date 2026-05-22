import { kebabCase } from 'es-toolkit/compat';

import { EntityTypeDict, type TEntityTypeDict } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { ScanConfigOriginSearchParam } from '@/features/scan-config/helpers';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';
import { getWorkflow } from '@/ui/segments/workflows/config/helpers';
import { buildConfigureUrlForEntity } from '@/ui/segments/workflows/config/routes';
import { makePathParamUrlFromExtendedType } from '@/utils/url-builder';

import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { WorkspaceContext } from '@/types/common';
import type { IWorkflowDescriptor, TActivityValue } from '@/ui/segments/workflows/config/types';

export type TWorkflowActivityTableRow = {
  id: string;
  type: TEntityTypeDict;
  entity_id?: string;
  inputs?: readonly { id: string; type?: TEntityTypeDict | null }[];
  task_config_type?: string;
};

type TWorkflowActivityConfigureRequest = {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  entityId: string;
  entityType?: TExtendedEntitiesTypeDict;
};

function usesStaticScanConfigConfigureRoute(workflow: IWorkflowDescriptor | null): boolean {
  return (
    workflow?.isScanConfig === true &&
    workflow.scanConfig?.definition.entity.mode === ScanConfigEntitySourceMode.StaticType
  );
}

function resolveActivityRowEntityRef(
  workflow: IWorkflowDescriptor,
  row: TWorkflowActivityTableRow
): Pick<TWorkflowActivityConfigureRequest, 'entityId' | 'entityType'> | null {
  if (row.type === EntityTypeDict.TaskConfig) {
    const inputId = (row as ITaskConfig<Record<string, unknown>>).inputs?.at(0)?.id;
    if (!inputId) {
      return null;
    }

    const entityType =
      workflow.scanConfig?.configureBinding.browseType ??
      workflow.configurationInputs?.[0]?.type ??
      workflow.sourceType;

    return { entityId: inputId, entityType };
  }

  if (row.type === EntityTypeDict.SimulationCampaign) {
    if (usesStaticScanConfigConfigureRoute(workflow)) {
      return { entityId: row.id };
    }

    if (!row.entity_id) {
      return null;
    }

    return { entityId: row.entity_id, entityType: workflow.sourceType };
  }

  return null;
}

/** Maps an activities-table row to scan-config configure params via the workflow registry. */
export function resolveWorkflowActivityConfigureRequest(opts: {
  activity: TActivityValue;
  listEntityType: TExtendedEntitiesTypeDict;
  row: TWorkflowActivityTableRow;
}): TWorkflowActivityConfigureRequest | null {
  const { activity, listEntityType, row } = opts;
  const workflow = getWorkflow({ activity, targetType: listEntityType });

  if (!workflow?.isScanConfig) {
    return null;
  }

  const entityRef = resolveActivityRowEntityRef(workflow, row);
  if (!entityRef) {
    return null;
  }

  return {
    activity,
    targetType: listEntityType,
    ...entityRef,
  };
}

function buildConfigureUrlForActivityRow(opts: {
  activity: TActivityValue;
  listEntityType: TExtendedEntitiesTypeDict;
  workspace: WorkspaceContext;
  row: TWorkflowActivityTableRow;
  query?: Record<string, string | undefined>;
}): string | null {
  const request = resolveWorkflowActivityConfigureRequest(opts);
  if (!request) {
    return null;
  }

  return buildConfigureUrlForEntity({
    ...request,
    workspace: opts.workspace,
    query: { ...opts.query, [ScanConfigOriginSearchParam]: opts.row.id },
  });
}

function isIonChannelModelingDuplicateRow(
  listEntityType: TExtendedEntitiesTypeDict,
  row: TWorkflowActivityTableRow
): boolean {
  return (
    listEntityType === ExtendedEntitiesTypeDict.IonChannelModelingCampaign &&
    row.type === EntityTypeDict.IonChannelModelingCampaign
  );
}

export function canDuplicateWorkflowActivityRow(opts: {
  activity: TActivityValue;
  listEntityType: TExtendedEntitiesTypeDict;
  row: TWorkflowActivityTableRow;
}): boolean {
  if (isIonChannelModelingDuplicateRow(opts.listEntityType, opts.row)) {
    return true;
  }

  return resolveWorkflowActivityConfigureRequest(opts) !== null;
}

function buildDetailViewBasePath(
  workspace: WorkspaceContext,
  listEntityType: TExtendedEntitiesTypeDict,
  rowId: string
): string {
  return `${config.ROOT_ROUTE}/${workspace.virtualLabId}/${workspace.projectId}/workflows/view/${kebabCase(listEntityType)}/${rowId}`;
}

/** Detail-view URL for the configuration tab (legacy non-scan-config entities). */
export function buildWorkflowActivityDetailConfigurationHref(opts: {
  workspace: WorkspaceContext;
  listEntityType: TExtendedEntitiesTypeDict;
  rowId: string;
}): string | null {
  const entity = getEntityByExtendedType({ type: opts.listEntityType });
  const base = buildDetailViewBasePath(opts.workspace, opts.listEntityType, opts.rowId);

  if (entity?.detailViewSections?.includes(DetailViewSectionsDict.Configuration)) {
    return `${base}/configuration`;
  }

  if (entity?.detailViewSections?.includes(DetailViewSectionsDict.Overview)) {
    return `${base}/overview`;
  }

  return base;
}

/** Detail-view URL for results or related artifacts. */
export function buildWorkflowActivityDetailResultsHref(opts: {
  workspace: WorkspaceContext;
  listEntityType: TExtendedEntitiesTypeDict;
  rowId: string;
}): string | null {
  const entity = getEntityByExtendedType({ type: opts.listEntityType });
  const base = buildDetailViewBasePath(opts.workspace, opts.listEntityType, opts.rowId);

  if (entity?.detailViewSections?.includes(DetailViewSectionsDict.Results)) {
    return `${base}/${DetailViewSectionsDict.Results}`;
  }

  if (entity?.detailViewSections?.includes(DetailViewSectionsDict.RelatedArtifacts)) {
    return `${base}/${DetailViewSectionsDict.RelatedArtifacts}`;
  }

  return base;
}

/** Prefer registry-based configure URL; fall back to detail-view configuration tab. */
export function buildWorkflowActivityConfigurationHref(opts: {
  activity: TActivityValue;
  listEntityType: TExtendedEntitiesTypeDict;
  workspace: WorkspaceContext;
  row: TWorkflowActivityTableRow;
  query?: Record<string, string | undefined>;
}): string | null {
  return (
    buildConfigureUrlForActivityRow(opts) ??
    buildWorkflowActivityDetailConfigurationHref({
      workspace: opts.workspace,
      listEntityType: opts.listEntityType,
      rowId: opts.row.id,
    })
  );
}

export function buildWorkflowActivityDuplicateHref(opts: {
  activity: TActivityValue;
  listEntityType: TExtendedEntitiesTypeDict;
  workspace: WorkspaceContext;
  row: TWorkflowActivityTableRow;
  query?: Record<string, string | undefined>;
}): string | null {
  if (isIonChannelModelingDuplicateRow(opts.listEntityType, opts.row)) {
    const { virtualLabId, projectId } = opts.workspace;
    const configureSegment = makePathParamUrlFromExtendedType({
      extendedType: ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
    }).pathParam;
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(opts.query ?? {})) {
      if (value !== undefined && value !== '') {
        params.set(key, value);
      }
    }

    params.set(ScanConfigOriginSearchParam, opts.row.id);

    return `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/build/configure/${configureSegment}?${params}`;
  }

  return buildConfigureUrlForActivityRow(opts);
}
