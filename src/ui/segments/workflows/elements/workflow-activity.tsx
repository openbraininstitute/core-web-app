'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import { Card } from 'antd';
import { get } from 'es-toolkit/compat';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { parseAsString, type SingleParserBuilder, useQueryStates } from 'nuqs';
import { useCallback, useMemo, useState } from 'react';
import { match } from 'ts-pattern';

import { type EntityCoreObjectTypes, EntityTypeDict } from '@/api/entitycore/types';
import { type ITaskConfig, TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { DEFAULT_PAGE_MEDIUM_SIZE } from '@/constants';
import { EmptyValue, renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { CircuitExtractionCampaign } from '@/entity-configuration/domain/extraction/extraction-campaign';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import {
  getStatusCountMap as getIonChannelModelingStatusCountMap,
  resolveIonChannelModelingByCampaignId,
  type TExtendedIonChannelModelingCampaignsType,
} from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import { SkeletonizationCampaign } from '@/entity-configuration/domain/processing/skeletonization-campaign';
import {
  rows as listSimulationRows,
  status as simulationCampaignStatus,
} from '@/entity-configuration/domain/simulation/simulation-campaign';
import {
  getTaskCampaignStatusCountMap,
  Task,
  type TTaskCampaignExecutionRow,
  type TTaskCampaignRow,
} from '@/entity-configuration/domain/task-functions';
import { CampaignStatusBadgePopover } from '@/features/data-grid/bindings/entitycore/renderers/campaign-status-cell';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { TASK_STATUS_QUERY_KEY_HEAD } from '@/features/task-runner/constants';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { CardContent } from '@/ui/molecules/card';
import { StatusMap } from '@/ui/segments/project/activities/elements/helpers';
import { ActivityValues, getActivity, type TActivityValue } from '@/ui/segments/workflows/config';
import { ActivityAndTypeSelectors } from '@/ui/segments/workflows/elements/browse-header';
import {
  buildWorkflowActivityConfigurationHref,
  buildWorkflowActivityDetailResultsHref,
  buildWorkflowActivityDuplicateHref,
  canDuplicateWorkflowActivityRow,
  type TWorkflowActivityTableRow,
} from '@/ui/segments/workflows/elements/workflow-activity-actions';
import { renderDateAndHour } from '@/util/date';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import type { GridDataSource, GridPage } from '@/features/data-grid/core';
import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { WorkspaceContext } from '@/types/common';

const NotAllowedResultsActionEntityTypes: TExtendedEntitiesTypeDict[] = [
  ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
  ExtendedEntitiesTypeDict.MicrocircuitSimulation,
  ExtendedEntitiesTypeDict.RegionCircuitSimulation,
  ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation,
  ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
  ExtendedEntitiesTypeDict.IonChannelModelSimulation,
  ExtendedEntitiesTypeDict.SkeletonizationCampaign,
];

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

type WorkflowTaskCampaignRow = TTaskCampaignRow<{
  scan_parameters: Record<string, unknown>;
}>;

/** Loose card-row shape shared by simulation + task scan rows (see `toScanCardData`). */
interface ScanCardRow {
  id: string;
  name: string;
  status?: ActivityStatus;
  scan_parameters: Record<string, unknown>;
}

/**
 * Project the task-campaign expand payload (`expandRow` → execution rows) into the loose
 * card-row shape the scan-cards popover reads: one card per distinct config (latest
 * execution status wins), surfacing that config's `meta.scan_parameters`. Replaces the
 * legacy nested scan-parameter table with the shared badge + hover cards popover.
 */
function toTaskScanCardRows(
  rows: TTaskCampaignExecutionRow<{ scan_parameters?: Record<string, unknown> }>[]
): ScanCardRow[] {
  const byConfig = new Map<
    string,
    { row: TTaskCampaignExecutionRow<{ scan_parameters?: Record<string, unknown> }>; date?: string }
  >();
  for (const row of rows) {
    const configId = row.provenance.config.id;
    const date = row.execution?.creation_date ?? undefined;
    const prev = byConfig.get(configId);
    if (!prev || (date && (!prev.date || date > prev.date))) byConfig.set(configId, { row, date });
  }
  return Array.from(byConfig.values()).map(({ row }) => {
    const config = row.provenance.config;
    return {
      id: config.id,
      name: config.name,
      status: row.execution?.status as ActivityStatus | undefined,
      scan_parameters: config.meta?.scan_parameters ?? {},
    };
  });
}

/**
 * The generalized status cell for the activities table. Resolves each row's aggregated
 * `status → count` map the SAME way the legacy status column did (by `record.type`) and,
 * for the expandable campaign types, supplies the matching scan-rows fetcher so the
 * badge's hover popover shows the scan-parameter CARDS (replacing the old expandable
 * rows). Non-campaign rows keep the legacy single-status presentation.
 */
function WorkflowStatusCell({
  record,
  workspace,
}: {
  record: EntityCoreObjectTypes;
  workspace: WorkspaceContext;
}) {
  const enabled = Boolean(record.id && workspace.virtualLabId && workspace.projectId);
  const statusQueryKey = [
    TASK_STATUS_QUERY_KEY_HEAD,
    { campaignId: record.id, context: workspace },
  ];
  const scanQueryKey = ['campaign-scan-rows', { campaignId: record.id, context: workspace }];

  return match({ type: record.type })
    .with({ type: EntityTypeDict.SimulationCampaign }, () => (
      <CampaignStatusBadgePopover
        fetchStatus={() => simulationCampaignStatus({ id: record.id, context: workspace })}
        statusQueryKey={statusQueryKey}
        enabled={enabled}
        fetchScanRows={() => listSimulationRows({ id: record.id, context: workspace })}
        scanQueryKey={scanQueryKey}
        title={`${record.name ?? 'Simulation'} execution status`}
      />
    ))
    .with({ type: EntityTypeDict.TaskConfig }, () => {
      const taskConfigType = (record as unknown as ITaskConfig<Record<string, unknown>>)
        .task_config_type;
      const isExpandableTask =
        taskConfigType === TaskConfigType.CircuitExtractionCampaign ||
        taskConfigType === TaskConfigType.SkeletonizationCampaign;

      if (isExpandableTask) {
        const expandRow =
          taskConfigType === TaskConfigType.SkeletonizationCampaign
            ? SkeletonizationCampaign.api.expandRow
            : CircuitExtractionCampaign.api.expandRow;
        return (
          <CampaignStatusBadgePopover
            fetchStatus={() =>
              Task.status({ campaignId: record.id, context: workspace }) as Promise<
                Map<ActivityStatus, number>
              >
            }
            statusQueryKey={statusQueryKey}
            enabled={enabled}
            fetchScanRows={
              expandRow
                ? async () => {
                    const taskRows = (await expandRow(
                      record as unknown as ITaskConfig<Record<string, unknown>>,
                      workspace
                    )) as TTaskCampaignExecutionRow<{
                      scan_parameters?: Record<string, unknown>;
                    }>[];
                    return toTaskScanCardRows(taskRows);
                  }
                : undefined
            }
            scanQueryKey={scanQueryKey}
            title={`${record.name ?? 'Campaign'} execution status`}
          />
        );
      }

      const statusCountMap = getTaskCampaignStatusCountMap(
        record as unknown as WorkflowTaskCampaignRow
      ) as unknown as Map<ActivityStatus, number>;
      return <CampaignStatusBadgePopover statusCountMap={statusCountMap} />;
    })
    .with({ type: EntityTypeDict.IonChannelModelingCampaign }, () => {
      const statusCountMap = getIonChannelModelingStatusCountMap(
        record as unknown as TExtendedIonChannelModelingCampaignsType['data'][number]
      ) as unknown as Map<ActivityStatus, number>;
      return <CampaignStatusBadgePopover statusCountMap={statusCountMap} />;
    })
    .otherwise(() => {
      const status = get(record, 'status', 'default');
      const mapper = get(StatusMap, status, null);
      return (
        <span className={cn('text-primary-9 flex items-center capitalize', mapper?.class)}>
          {mapper?.icon}
          {mapper?.title}
        </span>
      );
    });
}

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

  const [selectedRow, setSelectedRow] = useState<EntityCoreObjectTypes | undefined>(undefined);
  const [gridMeta, setGridMeta] = useState<{
    total: number;
    status: 'idle' | 'loading' | 'loaded';
  }>({ total: 0, status: 'idle' });
  const [isResolvingResults, setIsResolvingResults] = useState(false);

  // Changing category/type resets selection + the empty/loading meta and (via the
  // SimpleGrid `key`) remounts the grid with a fresh page-1 store (legacy `setPage(1)`).
  const updateActivity = (activity: TActivityValue | null) => {
    setSelectedRow(undefined);
    setGridMeta({ total: 0, status: 'idle' });
    updateActivityState({ activityType: activity });
  };

  const updateEntityType = (et: TExtendedEntitiesTypeDict | null) => {
    setSelectedRow(undefined);
    setGridMeta({ total: 0, status: 'idle' });
    updateActivityState({ entityType: et });
  };

  // Server data source: the grid owns paging; each page fetches via the entity's list
  // query (the SAME call the legacy `useQueryActivity` made). The fetch also surfaces
  // total/loading into `gridMeta` so the empty + loading states are preserved.
  const entity = getEntityByExtendedType({ type: resolvedEntityType });
  const listQuery = entity?.api.query?.list;
  const dataSource = useMemo<GridDataSource<EntityCoreObjectTypes>>(
    () => ({
      fetch: async (q): Promise<GridPage<EntityCoreObjectTypes>> => {
        setGridMeta((m) => ({ ...m, status: 'loading' }));
        if (!listQuery) {
          setGridMeta({ total: 0, status: 'loaded' });
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
        setGridMeta({ total, status: 'loaded' });
        // the per-entity list queries return a union of entity arrays; the table is
        // entity-agnostic (legacy typed this response as `EntityCoreResponse<any>`).
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

  const shouldShowEmptyState = gridMeta.status === 'loaded' && gridMeta.total === 0;

  const columns: Array<SimpleColumn<EntityCoreObjectTypes>> = useMemo(
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
          const extractionTitle =
            record.type === EntityTypeDict.TaskConfig &&
            (record as unknown as ITaskConfig<Record<string, unknown>>).task_config_type ===
              TaskConfigType.CircuitExtractionCampaign
              ? getEntityByExtendedType({
                  type: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
                })?.title
              : undefined;
          const title =
            extractionTitle ??
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
            onActivityChange={updateActivity}
            onEntityTypeChange={updateEntityType}
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
              {gridMeta.status === 'loading' && (
                <div className="pointer-events-none absolute right-3 top-2 z-10 text-primary-9">
                  <LoadingOutlined aria-label="loading activities" />
                </div>
              )}
              <div className="secondary-scrollbar h-full max-h-[calc(100%-4rem)] overflow-auto">
                <SimpleGrid<EntityCoreObjectTypes>
                  // remount on category/type change → fresh page-1 store (legacy setPage(1))
                  key={`${resolvedActivityType}-${resolvedEntityType}`}
                  columns={columns}
                  getRowId={(o) => o.id}
                  pageSize={DEFAULT_PAGE_MEDIUM_SIZE}
                  className={cn('[&_.ag-header]:bg-background [&_.ag-header-cell]:text-neutral-4')}
                  rowSelection={{
                    mode: 'single',
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
                    <Link href={configurationHref} className="text-primary-9!">
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
                        <span className="text-primary-9!">View results</span>
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
                          className="text-primary-9!"
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
                    className="disabled:bg-background disabled:text-label select-none disabled:cursor-not-allowed text-primary-9!"
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
