'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import {
  RiBarChartBoxLine,
  RiCheckLine,
  RiFileAddLine,
  RiFileCopyLine,
  RiSettings3Line,
} from '@remixicon/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { EntityTypeDict } from '@/api/entitycore/types';
import { type ITaskConfig, TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { resolveIonChannelModelingByCampaignId } from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import { CellRendererRegistry } from '@/features/data-grid/react';
import {
  GRID_ICON_BUTTON_ACTIVE_CLASS,
  GRID_OVERLAY_Z_CLASS,
} from '@/features/data-grid/react/molecules-theme';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';
import { ActivityValues } from '@/ui/segments/workflows/config';
import {
  buildWorkflowActivityConfigurationHref,
  buildWorkflowActivityDetailResultsHref,
  buildWorkflowActivityDuplicateHref,
  canDuplicateWorkflowActivityRow,
  NotAllowedResultsActionEntityTypes,
  type TWorkflowActivityTableRow,
} from '@/ui/segments/workflows/elements/workflow-activity-actions';
import { WorkflowStatusCell } from '@/ui/segments/workflows/elements/workflow-status-cell';
import { renderDateAndHour } from '@/util/date';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ICellRendererProps } from '@/features/data-grid/react';
import type { WorkspaceContext } from '@/types/common';
import type { TActivityValue } from '@/ui/segments/workflows/config';

/** Cell-renderer registry keys owned by the workflow-activity grid. */
export const WORKFLOW_ACTIVITY_TYPE_RENDERER = 'workflowActivityType';
export const WORKFLOW_ACTIVITY_DATE_RENDERER = 'workflowActivityDate';
export const WORKFLOW_ACTIVITY_ACTIONS_RENDERER = 'workflowActivityActions';

/** Width of the pinned actions column — enough for the "Action" trigger plus padding. */
export const WORKFLOW_ACTIVITY_ACTIONS_COLUMN_WIDTH = 96;

/** Leading icon size in the actions menu — matches the `size-4` DropdownMenuItem sets. */
const ACTION_ICON_SIZE = 16;

/**
 * Actions-menu row: roomier than the DropdownMenuItem default and highlighted in
 * `primary-8`, matching the grid's icon buttons and the outline buttons this menu
 * replaced. Radix sets `data-highlighted` for BOTH pointer hover and keyboard
 * navigation, so styling it (rather than `:hover`) keeps the two in step. The icon
 * needs its own colour rule: the base class pins any untinted svg to
 * `text-muted-foreground`, which would otherwise survive the highlight.
 */
const ACTION_ITEM_CLASS = cn(
  'cursor-pointer gap-2.5 rounded-md px-3 py-2.5',
  'data-[highlighted]:bg-primary-8 data-[highlighted]:text-white',
  'data-[highlighted]:[&_svg]:text-white',
  // a disabled row is inert: no hand cursor, no highlight
  'data-[disabled]:cursor-default'
);
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

/** `cellRendererParams` the actions cell reads; supplied by the schema factory. */
interface IActionsCellParams {
  activity?: TActivityValue;
  entityType?: TExtendedEntitiesTypeDict;
}

/**
 * One row's action menu: the same three actions the selection-driven button bar used to
 * offer, behind a per-row trigger. An action the row does not support stays LISTED and
 * disabled rather than disappearing, so the menu reads the same for every row of a type.
 *
 * Self-contained by design: routing, workspace and notifications come from context
 * rather than `cellRendererParams`, because a callback passed through params would
 * change identity on every render and rebuild the whole grid controller.
 */
export function WorkflowActivityActionsCell({
  row,
  params,
}: ICellRendererProps<EntityCoreObjectTypes>): ReactNode {
  const { activity, entityType } = (params ?? {}) as IActionsCellParams;
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useWorkspace();
  const notification = useAppNotification();
  const searchParams = useSearchParams();
  const [isResolvingResults, setIsResolvingResults] = useState(false);
  const [, copyId, , hasCopiedId] = useCopyToClipboard();

  const workspace = useMemo(() => ({ virtualLabId, projectId }), [virtualLabId, projectId]);
  const tableRow = row as unknown as TWorkflowActivityTableRow;

  const configurationHref = useMemo(() => {
    if (!activity || !entityType) return null;
    const href = buildWorkflowActivityConfigurationHref({
      activity,
      listEntityType: entityType,
      workspace,
      row: tableRow,
    });
    if (!href) return null;
    // The listing's own query params (activity/type) ride along so Back returns here.
    const current = searchParams.toString();
    if (!current) return href;
    return `${href}${href.includes('?') ? '&' : '?'}${current}`;
  }, [activity, entityType, workspace, tableRow, searchParams]);

  const resultsHref = useMemo(() => {
    if (!entityType) return null;
    return buildWorkflowActivityDetailResultsHref({
      workspace,
      listEntityType: entityType,
      rowId: row.id,
    });
  }, [entityType, workspace, row.id]);

  const canDuplicate = useMemo(() => {
    if (!activity || !entityType) return false;
    return canDuplicateWorkflowActivityRow({
      activity,
      listEntityType: entityType,
      row: tableRow,
    });
  }, [activity, entityType, tableRow]);

  const onDuplicate = useCallback(() => {
    if (!activity || !entityType) return;
    const href = buildWorkflowActivityDuplicateHref({
      activity,
      listEntityType: entityType,
      workspace,
      row: tableRow,
    });
    if (href) navigate(href);
  }, [activity, entityType, workspace, tableRow, navigate]);

  // An ion-channel campaign has no direct results route: the generated model has to be
  // resolved first, so this action navigates asynchronously instead of being a link.
  const onViewIonChannelResults = useCallback(async () => {
    setIsResolvingResults(true);
    try {
      const resolved = await resolveIonChannelModelingByCampaignId({
        id: row.id,
        context: workspace,
      });
      const modelId = resolved.generatedModelIds.at(0);
      if (modelId) {
        navigate(
          `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/view/ion-channel-model/${modelId}`
        );
      } else {
        notification.info({
          message: 'No ion channel model found',
          description: 'This campaign has not produced any ion channel model yet.',
        });
      }
    } finally {
      setIsResolvingResults(false);
    }
  }, [row.id, workspace, navigate, virtualLabId, projectId, notification]);

  const isIonChannelModelingCampaign =
    entityType === ExtendedEntitiesTypeDict.IonChannelModelingCampaign;
  const isBuildActivity = activity === ActivityValues.Build;
  const resultsSupported = Boolean(
    entityType && !NotAllowedResultsActionEntityTypes.includes(entityType)
  );
  const canViewResults =
    resultsSupported &&
    !isBuildActivity &&
    (isIonChannelModelingCampaign ? true : Boolean(resultsHref));

  return (
    <div className="flex h-full w-full items-center justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-testid="workflow-activity-row-actions"
            className={cn(
              'inline-flex items-center justify-center rounded-full px-3 py-1',
              'border border-neutral-2 text-xs text-primary-9 hover:text-white',
              GRID_ICON_BUTTON_ACTIVE_CLASS
            )}
          >
            Action
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="bottom"
          sideOffset={4}
          className={cn(GRID_OVERLAY_Z_CLASS, 'min-w-48 border-gray-100 bg-white p-1.5')}
        >
          <DropdownMenuItem
            asChild={Boolean(configurationHref)}
            disabled={!configurationHref}
            className={ACTION_ITEM_CLASS}
          >
            {configurationHref ? (
              <Link href={configurationHref}>
                <RiSettings3Line size={ACTION_ICON_SIZE} />
                <span>View configuration</span>
              </Link>
            ) : (
              <>
                <RiSettings3Line size={ACTION_ICON_SIZE} />
                <span>View configuration</span>
              </>
            )}
          </DropdownMenuItem>
          {isIonChannelModelingCampaign ? (
            <DropdownMenuItem
              disabled={!canViewResults || isResolvingResults}
              className={ACTION_ITEM_CLASS}
              onSelect={(event) => {
                event.preventDefault();
                void onViewIonChannelResults();
              }}
            >
              {/* the spinner takes the icon's slot, so the label never shifts */}
              {isResolvingResults ? (
                <LoadingOutlined />
              ) : (
                <RiBarChartBoxLine size={ACTION_ICON_SIZE} />
              )}
              <span>View results</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              asChild={canViewResults}
              disabled={!canViewResults}
              className={ACTION_ITEM_CLASS}
            >
              {canViewResults && resultsHref ? (
                <Link href={resultsHref}>
                  <RiBarChartBoxLine size={ACTION_ICON_SIZE} />
                  <span>View results</span>
                </Link>
              ) : (
                <>
                  <RiBarChartBoxLine size={ACTION_ICON_SIZE} />
                  <span>View results</span>
                </>
              )}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={!canDuplicate}
            onSelect={onDuplicate}
            className={ACTION_ITEM_CLASS}
          >
            <RiFileAddLine size={ACTION_ICON_SIZE} />
            <span>Duplicate</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              // hold the menu open long enough for the tick to register
              event.preventDefault();
              void copyId(row.id);
            }}
            className={ACTION_ITEM_CLASS}
          >
            {hasCopiedId ? (
              <RiCheckLine size={ACTION_ICON_SIZE} />
            ) : (
              <RiFileCopyLine size={ACTION_ICON_SIZE} />
            )}
            <span>{hasCopiedId ? 'Copied' : 'Copy ID'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Renderer registry for the workflow-activity grid. Built once at module scope. */
export function buildWorkflowActivityCellRenderers(): CellRendererRegistry {
  return new CellRendererRegistry()
    .register(WORKFLOW_ACTIVITY_TYPE_RENDERER, WorkflowActivityTypeCell)
    .register(WORKFLOW_ACTIVITY_DATE_RENDERER, WorkflowActivityDateCell)
    .register(WORKFLOW_ACTIVITY_STATUS_RENDERER, WorkflowActivityStatusCell)
    .register(WORKFLOW_ACTIVITY_ACTIONS_RENDERER, WorkflowActivityActionsCell);
}
