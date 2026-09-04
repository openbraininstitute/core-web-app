'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import {
  RiBarChartBoxLine,
  RiCheckLine,
  RiFileCopyLine,
  RiFolderLine,
  RiGitBranchLine,
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
import {
  LIFECYCLE_STATUS_RENDERER,
  LifecycleStatusCell,
} from '@/features/data-grid/bindings/entitycore/renderers/lifecycle-status-cell';
import { CellRendererRegistry } from '@/features/data-grid/react';
import {
  GRID_ICON_BUTTON_ACTIVE_CLASS,
  GRID_OVERLAY_Z_CLASS,
} from '@/features/data-grid/react/molecules-theme';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
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
export const WORKFLOW_ACTIVITY_STATUS_RENDERER = 'workflowActivityStatus';

/** Fits four 32px action buttons, their gaps and the cell padding. */
export const WORKFLOW_ACTIVITY_ACTIONS_COLUMN_WIDTH = 160;

/** Glyph size inside an action button. */
const ACTION_ICON_SIZE = 16;

/** Round, 32px to match the status pills in the same row. */
const actionButtonClass = (disabled: boolean) =>
  cn(
    'inline-flex size-8 shrink-0 items-center justify-center rounded-full border',
    disabled
      ? 'cursor-not-allowed border-neutral-1 text-gray-300'
      : cn('cursor-pointer border-neutral-2 text-primary-9', GRID_ICON_BUTTON_ACTIVE_CLASS)
  );

/** One row-level action, rendered as a link when it navigates and a button otherwise. */
interface IRowAction {
  /** React list key; not forwarded to {@link ActionButton} */
  key: string;
  /** tooltip text and accessible name */
  label: string;
  icon: ReactNode;
  href?: string | null;
  onClick?: () => void;
  disabled?: boolean;
}

/** An icon action with its title on hover. */
function ActionButton({
  label,
  icon,
  href,
  onClick,
  disabled = false,
}: Omit<IRowAction, 'key'>): ReactNode {
  const className = actionButtonClass(disabled);

  const control =
    href && !disabled ? (
      <Link href={href} aria-label={label} className={className}>
        {icon}
      </Link>
    ) : (
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={className}
      >
        {icon}
      </button>
    );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* a disabled button receives no pointer events, so the span owns the hover */}
        {disabled ? <span className="inline-flex">{control}</span> : control}
      </TooltipTrigger>
      <TooltipContent side="top" className={GRID_OVERLAY_Z_CLASS}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

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

/** Creation date as `dd.MM.yyyy | HHhMM`. */
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
 * The row's actions. An action the row does not support is disabled rather than
 * dropped, so every row of a type offers the same set.
 *
 * Routing, workspace and notifications come from context rather than
 * `cellRendererParams`: a callback passed through params changes identity on every
 * render, which would rebuild the grid controller.
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
    // carry the listing's own query params so Back returns to the same activity/type
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

  // An ion-channel campaign has no direct results route: the generated model is
  // resolved first, so this action navigates on click instead of linking.
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

  const actions: IRowAction[] = [
    {
      key: 'configuration',
      label: 'View configuration',
      icon: <RiFolderLine size={ACTION_ICON_SIZE} />,
      href: configurationHref,
      disabled: !configurationHref,
    },
    isIonChannelModelingCampaign
      ? {
          key: 'results',
          label: 'View results',
          icon: isResolvingResults ? (
            <LoadingOutlined />
          ) : (
            <RiBarChartBoxLine size={ACTION_ICON_SIZE} />
          ),
          onClick: () => void onViewIonChannelResults(),
          disabled: !canViewResults || isResolvingResults,
        }
      : {
          key: 'results',
          label: 'View results',
          icon: <RiBarChartBoxLine size={ACTION_ICON_SIZE} />,
          href: resultsHref,
          disabled: !canViewResults,
        },
    {
      key: 'duplicate',
      label: 'Duplicate',
      // not a copy-family glyph: at 16px it would be indistinguishable from Copy ID's
      icon: <RiGitBranchLine size={ACTION_ICON_SIZE} />,
      onClick: onDuplicate,
      disabled: !canDuplicate,
    },
    {
      key: 'copyId',
      // the label carries the confirmation; the glyph alone cannot
      label: hasCopiedId ? 'Copied' : 'Copy ID',
      icon: hasCopiedId ? (
        <RiCheckLine size={ACTION_ICON_SIZE} />
      ) : (
        <RiFileCopyLine size={ACTION_ICON_SIZE} />
      ),
      onClick: () => void copyId(row.id),
    },
  ];

  return (
    <div
      className="flex h-full w-full items-center justify-center gap-1"
      data-testid="workflow-activity-row-actions"
    >
      {actions.map(({ key, ...action }) => (
        <ActionButton key={key} {...action} />
      ))}
    </div>
  );
}

/** Renderer registry for the workflow-activity grid. */
export function buildWorkflowActivityCellRenderers(): CellRendererRegistry {
  return new CellRendererRegistry()
    .register(WORKFLOW_ACTIVITY_TYPE_RENDERER, WorkflowActivityTypeCell)
    .register(WORKFLOW_ACTIVITY_DATE_RENDERER, WorkflowActivityDateCell)
    .register(WORKFLOW_ACTIVITY_STATUS_RENDERER, WorkflowActivityStatusCell)
    .register(WORKFLOW_ACTIVITY_ACTIONS_RENDERER, WorkflowActivityActionsCell)
    .register(LIFECYCLE_STATUS_RENDERER, LifecycleStatusCell);
}
