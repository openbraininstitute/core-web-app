'use client';

import { EntityTypeDict } from '@/api/entitycore/types';
import { type ITaskConfig, TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { CellRendererRegistry } from '@/features/data-grid/react';
import { WorkflowStatusCell } from '@/ui/segments/workflows/elements/workflow-status-cell';
import { renderDateAndHour } from '@/util/date';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ICellRendererProps } from '@/features/data-grid/react';
import type { WorkspaceContext } from '@/types/common';

/** Cell-renderer registry keys owned by the workflow-activity grid. */
export const WORKFLOW_ACTIVITY_TYPE_RENDERER = 'workflowActivityType';
export const WORKFLOW_ACTIVITY_DATE_RENDERER = 'workflowActivityDate';
export const WORKFLOW_ACTIVITY_STATUS_RENDERER = 'workflowActivityStatus';

/** `cellRendererParams` the Type cell reads; supplied by the schema factory. */
interface ITypeCellParams {
  /** the listing's selected entity type, used when the row carries none of its own */
  entityType?: TExtendedEntitiesTypeDict;
}

/** `cellRendererParams` the Status cell reads; supplied by the schema factory. */
interface IStatusCellParams {
  workspace?: WorkspaceContext;
}

/**
 * The row's entity title. A circuit-extraction campaign is a `TaskConfig` row whose
 * own `type` says nothing about which campaign it is, so its `task_config_type`
 * resolves the title instead; everything else falls back to the listed entity type.
 */
export function WorkflowActivityTypeCell({
  row,
  params,
}: ICellRendererProps<EntityCoreObjectTypes>): ReactNode {
  const { entityType } = (params ?? {}) as ITypeCellParams;

  const extractionTitle =
    row.type === EntityTypeDict.TaskConfig &&
    (row as unknown as ITaskConfig<Record<string, unknown>>).task_config_type ===
      TaskConfigType.CircuitExtractionCampaign
      ? getEntityByExtendedType({ type: ExtendedEntitiesTypeDict.CircuitExtractionCampaign })?.title
      : undefined;

  const title =
    extractionTitle ??
    getEntityByExtendedType({ type: row.type as unknown as TExtendedEntitiesTypeDict })?.title ??
    getEntityByExtendedType({ type: entityType })?.title ??
    '-';

  return <span className={cn('text-primary-9 flex items-center capitalize')}>{title}</span>;
}

/** Creation date as `dd.MM.yyyy | HHhMM`, the two-part layout the listing has always shown. */
export function WorkflowActivityDateCell({
  row,
}: ICellRendererProps<EntityCoreObjectTypes>): ReactNode {
  if (!row?.creation_date) return null;
  return <span className="text-primary-9">{renderDateAndHour(row.creation_date)}</span>;
}

/** Aggregated campaign execution status, distinct from the row's `lifecycle_status`. */
export function WorkflowActivityStatusCell({
  row,
  params,
}: ICellRendererProps<EntityCoreObjectTypes>): ReactNode {
  const { workspace } = (params ?? {}) as IStatusCellParams;
  if (!workspace) return null;
  return <WorkflowStatusCell record={row} workspace={workspace} />;
}

/** Renderer registry for the workflow-activity grid. Built once at module scope. */
export function buildWorkflowActivityCellRenderers(): CellRendererRegistry {
  return new CellRendererRegistry()
    .register(WORKFLOW_ACTIVITY_TYPE_RENDERER, WorkflowActivityTypeCell)
    .register(WORKFLOW_ACTIVITY_DATE_RENDERER, WorkflowActivityDateCell)
    .register(WORKFLOW_ACTIVITY_STATUS_RENDERER, WorkflowActivityStatusCell);
}
