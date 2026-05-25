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

/** minimal row shape shared by workflow activity tables (campaigns, task configs) */
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

/**
 * resolves the primary entity reference used to build a scan-config configure URL
 * from a workflow activities-table row
 *
 * this helper only determines whether configure/duplicate is **allowed** and which
 * entity id satisfies the workflow session route. It does **not** seed the editor
 * form: resume and duplicate flows pass {@link ScanConfigOriginSearchParam} so the
 * origin campaign's stored form (including grouped model inputs) is loaded instead
 *
 * @param workflow: registry descriptor for the list's target workflow
 * @param row: selected activities-table record
 * @returns entity id and optional browse type for URL construction, or `null` when
 *   the row cannot be opened in configure (unsupported type or missing linkage)
 *
 * @remarks
 * **Task config rows** (`EntityTypeDict.TaskConfig`):
 * uses `inputs[0].id` as the session primary entity. `entityType` falls back through
 * `configureBinding.browseType`, then `configurationInputs[0].type`, then `sourceType`
 * multi-input workflows (e.g. EM synapse mapping) may list more inputs on the row,
 * those are not reflected here because the origin campaign config is authoritative
 *
 * simulation campaign rows (EntityTypeDict.SimulationCampaign):
 * - static-type scan-config workflows: uses the campaign row id directly
 * - session-based workflows: uses `entity_id` (the underlying model entity) with
 *   `workflow.sourceType`
 */
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

/** maps an activities-table row to scan-config configure params via the workflow registry */
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

/**
 * builds a scan-config configure URL for an activities-table row (configure or duplicate)
 *
 * sets {@link ScanConfigOriginSearchParam} to the row id so the editor loads the stored
 * campaign form. uses {@link buildConfigureUrlForEntity} with `skipSelectionPersist: true`
 * so no partial browse selection is written to `sessionStorage`,
 * form init skips session patching when `?origin=` is present
 *
 * @returns configure href, or `null` when the row is not a supported scan-config target
 */
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
    skipSelectionPersist: true,
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

/** detail-view URL for the configuration tab (legacy non-scan-config entities) */
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

/** detail-view URL for results or related artifacts */
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

/** prefer registry-based configure URL; fall back to detail-view configuration tab */
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

/**
 * builds the href for duplicating a workflow activity row into a new configure session
 *
 * scan-config campaigns delegate to {@link buildConfigureUrlForActivityRow} (origin +
 * empty session slot), Ion channel modeling uses a static configure route without a
 * workflow session id in the path.
 *
 * @returns duplicate configure href, or `null` when duplication is not supported for the row
 */
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
