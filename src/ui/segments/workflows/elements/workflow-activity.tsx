'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import { Card } from 'antd';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { parseAsString, type SingleParserBuilder, useQueryStates } from 'nuqs';
import { useCallback, useMemo, useState } from 'react';

import { type EntityCoreObjectTypes, EntityTypeDict } from '@/api/entitycore/types';
import { type ITaskConfig, TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { DEFAULT_PAGE_MEDIUM_SIZE } from '@/constants';
import { EmptyValue, renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { resolveIonChannelModelingByCampaignId } from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import { SelectionMode } from '@/features/data-grid/core';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { ServerGridStateStatus } from '@/features/data-grid/react';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { CardContent } from '@/ui/molecules/card';
import { ActivityValues, getActivity, type TActivityValue } from '@/ui/segments/workflows/config';
import { ActivityAndTypeSelectors } from '@/ui/segments/workflows/elements/browse-header';
import {
  buildWorkflowActivityConfigurationHref,
  buildWorkflowActivityDetailResultsHref,
  buildWorkflowActivityDuplicateHref,
  canDuplicateWorkflowActivityRow,
  type TWorkflowActivityTableRow,
} from '@/ui/segments/workflows/elements/workflow-activity-actions';
import { WorkflowStatusCell } from '@/ui/segments/workflows/elements/workflow-status-cell';
import { renderDateAndHour } from '@/util/date';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IGridDataSource, IGridPage } from '@/features/data-grid/core';
import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { IServerGridState } from '@/features/data-grid/react';

/**
 * Campaign and simulation types whose row offers no "View results" action.
 *
 * Their results are not reachable from a single generated entity — an e-feature extraction, for
 * instance, registers one task result per config rather than one entity for the campaign — so the
 * detail results route has nothing to open.
 */
export const NotAllowedResultsActionEntityTypes: TExtendedEntitiesTypeDict[] = [
  ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
  ExtendedEntitiesTypeDict.MicrocircuitSimulation,
  ExtendedEntitiesTypeDict.RegionCircuitSimulation,
  ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation,
  ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
  ExtendedEntitiesTypeDict.CircuitSimplificationCampaign,
  ExtendedEntitiesTypeDict.IonChannelModelSimulation,
  ExtendedEntitiesTypeDict.SkeletonizationCampaign,
  ExtendedEntitiesTypeDict.EFeatureExtractionCampaign,
];

const IDLE_GRID_META: IServerGridState = { total: 0, status: ServerGridStateStatus.Idle };

export interface WorkflowActivityRef {
  dataCount: number;
  totalItems: number;
  entityType: TExtendedEntitiesTypeDict | undefined;
}

export type WorkflowActivityProps = {
  onActivityChange?: (activity: TActivityValue | undefined) => void;
  onEntityTypeChange?: (entityType: TExtendedEntitiesTypeDict | undefined) => void;
  onShouldRenderScrollableSelector: (shouldRenderScrollableSelector: boolean) => void;
  onShouldOnlyRenderScrollableSelector: (shouldRenderOnlyScrollableSelector: boolean) => void;
};

export function WorkflowActivity() {
  const { push: navigate } = useRouter();
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  const notification = useAppNotification();
  const queryParams = useSearchParams();
  const query = new URLSearchParams(queryParams);

  const [{ activityType, entityType }, updateActivityState] = useQueryStates(
    {
      activityType: parseAsString
        .withOptions({
          clearOnDefault: false,
          shallow: true,
        })
        .withDefault(ActivityValues.Build) as SingleParserBuilder<TActivityValue>,
      entityType: parseAsString
        .withOptions({
          clearOnDefault: false,
          shallow: true,
        })
        .withDefault(
          ExtendedEntitiesTypeDict.Memodel
        ) as SingleParserBuilder<TExtendedEntitiesTypeDict>,
    },
    {
      urlKeys: {
        activityType: 'tactivity',
        entityType: 'ttype',
      },
    }
  );

  const resolvedActivityType: TActivityValue =
    activityType ?? (ActivityValues.Build as TActivityValue);
  const resolvedEntityType: TExtendedEntitiesTypeDict =
    entityType ?? ExtendedEntitiesTypeDict.Memodel;

  const workspace = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);

  // Also the SimpleGrid `key`, so a change remounts the grid on page 1.
  const gridKey = `${resolvedActivityType}-${resolvedEntityType}`;

  const [selectedRow, setSelectedRow] = useState<EntityCoreObjectTypes | undefined>(undefined);
  const [gridMeta, setGridMeta] = useState<IServerGridState>(IDLE_GRID_META);
  const [metaKey, setMetaKey] = useState(gridKey);
  const [isResolvingResults, setIsResolvingResults] = useState(false);

  // Reset on the key, not in the change handlers: both values also come from the URL, so
  // browser navigation swaps them without either handler running.
  if (metaKey !== gridKey) {
    setMetaKey(gridKey);
    setGridMeta(IDLE_GRID_META);
    setSelectedRow(undefined);
  }

  // server data source: the grid owns paging and reports status/total back through
  // `serverSide.onStateChange`, which drives the empty state
  const entity = getEntityByExtendedType({ type: resolvedEntityType });
  const listQuery = entity?.api.query?.list;
  const dataSource = useMemo<IGridDataSource<EntityCoreObjectTypes>>(
    () => ({
      fetch: async (q): Promise<IGridPage<EntityCoreObjectTypes>> => {
        if (!listQuery) {
          return { rows: [], total: 0 };
        }
        const response = await listQuery({
          withFacets: false,
          context: { virtualLabId, projectId },
          filters: {
            page: q.page,
            page_size: q.pageSize,
            authorized_project_id: projectId,
            authorized_public: false,
          },
        });
        const total = response?.pagination?.total_items ?? 0;
        // per-entity list queries return a union of entity arrays; the table is entity-agnostic
        return { rows: (response?.data ?? []) as EntityCoreObjectTypes[], total };
      },
    }),
    [listQuery, virtualLabId, projectId]
  );

  const appendCurrentQueryParams = useCallback(
    (href: string) => {
      const currentQuery = query.toString();
      if (!currentQuery) {
        return href;
      }

      const separator = href.includes('?') ? '&' : '?';
      return `${href}${separator}${currentQuery}`;
    },
    [query]
  );

  const configurationHref = useMemo(() => {
    if (!entityType || !selectedRow) {
      return null;
    }

    const href = buildWorkflowActivityConfigurationHref({
      activity: resolvedActivityType,
      listEntityType: entityType,
      workspace,
      row: selectedRow as unknown as TWorkflowActivityTableRow,
    });

    return href ? appendCurrentQueryParams(href) : null;
  }, [appendCurrentQueryParams, entityType, resolvedActivityType, selectedRow, workspace]);

  const onViewIonChannelResults = useCallback(async () => {
    if (!selectedRow) return;
    setIsResolvingResults(true);
    try {
      const resolved = await resolveIonChannelModelingByCampaignId({
        id: selectedRow.id,
        context: { virtualLabId, projectId },
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
  }, [selectedRow, navigate, virtualLabId, projectId, notification]);

  const resultsLink = useMemo(() => {
    if (!entityType || !selectedRow) {
      return null;
    }

    return buildWorkflowActivityDetailResultsHref({
      workspace,
      listEntityType: entityType,
      rowId: selectedRow.id,
    });
  }, [entityType, selectedRow, workspace]);

  const isIonChannelModelingCampaign =
    entityType === ExtendedEntitiesTypeDict.IonChannelModelingCampaign;
  const isBuildActivity = activityType === ActivityValues.Build;
  const canShowResultsAction = Boolean(
    resultsLink && entityType && !NotAllowedResultsActionEntityTypes.includes(entityType)
  );
  const resultsActionLink = resultsLink ?? undefined;

  const onDuplicate = useCallback(() => {
    if (!selectedRow || !entityType) {
      return;
    }

    const href = buildWorkflowActivityDuplicateHref({
      activity: resolvedActivityType,
      listEntityType: entityType,
      workspace,
      row: selectedRow as unknown as TWorkflowActivityTableRow,
    });

    if (href) {
      navigate(href);
    }
  }, [entityType, navigate, resolvedActivityType, selectedRow, workspace]);

  const canDuplicate = useMemo(() => {
    if (!selectedRow || !entityType) {
      return false;
    }

    return canDuplicateWorkflowActivityRow({
      activity: resolvedActivityType,
      listEntityType: entityType,
      row: selectedRow as unknown as TWorkflowActivityTableRow,
    });
  }, [entityType, resolvedActivityType, selectedRow]);

  const shouldShowEmptyState =
    gridMeta.status === ServerGridStateStatus.Loaded && gridMeta.total === 0;

  const columns: Array<ISimpleColumn<EntityCoreObjectTypes>> = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        width: { minWidth: 160, flex: 2 },
        renderCell: (record) => <span className="text-primary-9">{record.name}</span>,
      },
      {
        id: 'category',
        header: 'Category',
        width: { minWidth: 120, flex: 1 },
        renderCell: () => (
          <span className={cn('text-primary-9 flex items-center capitalize')}>
            {getActivity(activityType)?.name}
          </span>
        ),
      },
      {
        id: 'type',
        header: 'Type',
        width: { minWidth: 140, flex: 1 },
        renderCell: (record) => {
          const taskConfigType =
            record.type === EntityTypeDict.TaskConfig
              ? (record as unknown as ITaskConfig<Record<string, unknown>>).task_config_type
              : undefined;
          const taskConfigTitleType =
            taskConfigType === TaskConfigType.CircuitExtractionCampaign
              ? ExtendedEntitiesTypeDict.CircuitExtractionCampaign
              : taskConfigType === TaskConfigType.CircuitSimplificationCampaign
                ? ExtendedEntitiesTypeDict.CircuitSimplificationCampaign
                : undefined;
          const taskConfigTitle = taskConfigTitleType
            ? getEntityByExtendedType({ type: taskConfigTitleType })?.title
            : undefined;
          const title =
            taskConfigTitle ??
            getEntityByExtendedType({
              type: record.type as unknown as TExtendedEntitiesTypeDict,
            })?.title ??
            getEntityByExtendedType({ type: entityType ?? undefined })?.title ??
            '-';

          return <span className={cn('text-primary-9 flex items-center capitalize')}>{title}</span>;
        },
      },
      {
        id: 'creation_date',
        header: 'Date',
        width: { minWidth: 150, flex: 1 },
        renderCell: (record) => (
          <span className="text-primary-9">{renderDateAndHour(record.creation_date)}</span>
        ),
      },
      {
        id: 'created_by',
        header: 'Created by',
        width: { minWidth: 140, flex: 1 },
        renderCell: (record) => {
          const createdBy =
            'created_by' in record ? renderEmptyOrValue(record.created_by?.pref_label) : EmptyValue;
          return <span className="text-primary-9">{createdBy}</span>;
        },
      },
      {
        id: 'status',
        header: 'Status',
        align: 'center',
        width: { minWidth: 140, flex: 1 },
        renderCell: (record) => <WorkflowStatusCell record={record} workspace={workspace} />,
      },
    ],
    [activityType, entityType, workspace]
  );

  return (
    <section
      id="activity-table-with-filters"
      data-testid="activity-table-with-filters"
      className={cn('flex h-full w-full min-w-0 flex-col before:shadow-lg after:shadow-md')}
    >
      <div
        id="workflow-activity-type-selectors"
        className={cn(
          'mb-5 grid w-full grid-cols-[2fr_2fr] items-center justify-center gap-5',
          '[grid-template-areas:"selectors_filters"]'
        )}
      >
        <div
          id="activity-table-filters"
          className="flex w-full items-start justify-start [grid-area:selectors]"
        >
          <ActivityAndTypeSelectors
            activity={activityType}
            entityType={entityType}
            onActivityChange={(activityType) => updateActivityState({ activityType })}
            onEntityTypeChange={(entityType) => updateActivityState({ entityType })}
          />
        </div>
      </div>
      <div
        className="h-full w-full"
        id="workflow-activities-table"
        data-testid="workflow-activities-table"
      >
        {shouldShowEmptyState ? (
          <Card className="text-neutral-4 bg-background border-none">
            <CardContent className="flex w-full items-center justify-center py-10">
              You don't have any activities yet
            </CardContent>
          </Card>
        ) : (
          <div
            className="flex h-full w-full flex-col"
            id="workflow-activities-full-table"
            data-testid="workflow-activities-full-table"
          >
            <div className="relative min-h-0 flex-1">
              <div className="h-full overflow-hidden">
                <SimpleGrid<EntityCoreObjectTypes>
                  key={gridKey}
                  columns={columns}
                  getRowId={(o) => o.id}
                  autoHeight={false}
                  pageSize={DEFAULT_PAGE_MEDIUM_SIZE}
                  loadingLabel="activities"
                  className={cn('[&_.ag-header]:bg-background [&_.ag-header-cell]:text-neutral-4')}
                  rowSelection={{
                    mode: SelectionMode.Single,
                    selectedIds: selectedRow ? [selectedRow.id] : [],
                    onSelectionChange: (_ids, rows) => setSelectedRow(rows.at(0)),
                  }}
                  serverSide={{
                    dataSource,
                    queryKey: [
                      'workflow-activity',
                      virtualLabId,
                      projectId,
                      resolvedActivityType,
                      resolvedEntityType,
                    ],
                    enabled: Boolean(resolvedActivityType && resolvedEntityType),
                    onStateChange: setGridMeta,
                  }}
                />
              </div>
            </div>
            <div className="relative flex h-15 w-full items-end justify-end">
              {selectedRow && configurationHref && (
                <div className="flex h-15 shrink-0 items-center justify-center gap-2">
                  <Button
                    rounded
                    asChild
                    variant="outline"
                    size={breakpoint === 'l' ? 'md' : 'lg'}
                    className="select-none"
                  >
                    <Link href={configurationHref} className="text-primary-9! hover:text-white!">
                      View configuration
                    </Link>
                  </Button>
                  {canShowResultsAction &&
                    resultsActionLink &&
                    (isIonChannelModelingCampaign ? (
                      <Button
                        rounded
                        variant="outline"
                        size={breakpoint === 'l' ? 'md' : 'lg'}
                        disabled={isResolvingResults}
                        onClick={onViewIonChannelResults}
                        className="disabled:bg-background! disabled:text-label! select-none disabled:cursor-not-allowed"
                      >
                        {isResolvingResults && <LoadingOutlined />}
                        <span>View results</span>
                      </Button>
                    ) : (
                      <Button
                        rounded
                        asChild={!isBuildActivity}
                        variant="outline"
                        size={breakpoint === 'l' ? 'md' : 'lg'}
                        disabled={isBuildActivity}
                        className="disabled:bg-background! disabled:text-label! select-none disabled:cursor-not-allowed group"
                      >
                        <Link
                          href={resultsActionLink}
                          aria-disabled={isBuildActivity}
                          className="text-primary-9! hover:text-white!"
                        >
                          View results
                        </Link>
                      </Button>
                    ))}
                  <Button
                    rounded
                    variant="outline"
                    size={breakpoint === 'l' ? 'md' : 'lg'}
                    onClick={onDuplicate}
                    className="disabled:bg-background disabled:text-label select-none disabled:cursor-not-allowed text-primary-9! hover:text-white!"
                    disabled={!canDuplicate}
                  >
                    Duplicate
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
