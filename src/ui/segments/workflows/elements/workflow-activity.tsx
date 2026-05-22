'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import { Pagination as AntPagination, Card, ConfigProvider, Empty } from 'antd';
import { get, includes, kebabCase } from 'es-toolkit/compat';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { parseAsString, type SingleParserBuilder, useQueryStates } from 'nuqs';
import { useCallback, useMemo, useState } from 'react';
import { match } from 'ts-pattern';

import {
  type EntityCoreObjectTypes,
  EntityTypeDict,
  type TEntityTypeDict,
} from '@/api/entitycore/types';
import { type ITaskConfig, TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { DEFAULT_PAGE_MEDIUM_SIZE, WorkflowActivityDictValue } from '@/constants';
import { viewConfig as simulationCampaignExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/simulation/small-microcircuit-simulation';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { CircuitExtractionCampaign } from '@/entity-configuration/domain/extraction/extraction-campaign';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import {
  getStatusCountMap as getIonChannelModelingStatusCountMap,
  resolveIonChannelModelingByCampaignId,
  type TExtendedIonChannelModelingCampaignsType,
} from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import { SkeletonizationCampaign } from '@/entity-configuration/domain/processing/skeletonization-campaign';
import {
  type ExtendedCampaignsType,
  rows as listSimulationRows,
  type SimulationRow,
} from '@/entity-configuration/domain/simulation/simulation-campaign';
import {
  getTaskCampaignStatusCountMap,
  type TTaskCampaignRow,
} from '@/entity-configuration/domain/task-functions';
import { isSimulateCircuitSourceType } from '@/features/scan-config/workflow/simulate-circuit-workflows';
import { LegacyCampaignStatusCell } from '@/features/task-runner/activity-execution/legacy-status-cell';
import { ActivityAggregatedStatus } from '@/features/task-runner/activity-execution/status';
import { ActivityStatusCell } from '@/features/task-runner/activity-execution/status-cell';
import { TaskViewConfig } from '@/features/task-runner/expanded-view';
import { usePrevious } from '@/hooks/hooks';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { CardContent } from '@/ui/molecules/card';
import { useRowSelection } from '@/ui/segments/data-table/elements/use-row-selection';
import {
  type UseExpandableTableOptions,
  useExpandableTable,
} from '@/ui/segments/data-table/expandable-row/use-expandable-table';
import { BaseTable } from '@/ui/segments/data-table/table';
import { StatusMap } from '@/ui/segments/project/activities/elements/helpers';
import { useQueryActivity } from '@/ui/segments/project/activities/elements/use-activity';
import { ORIGINAL_CAMPAIGN_ID_QUERY } from '@/ui/segments/workflows/build/ion-channel-build/helpers';
import { ActivityValues, getActivity, getWorkflow } from '@/ui/segments/workflows/config';
import { ActivityAndTypeSelectors } from '@/ui/segments/workflows/elements/browse-header';
import { renderDateAndHour } from '@/util/date';
import { cn } from '@/utils/css-class';

import type { ColumnsType } from 'antd/es/table/interface';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config';

const AllowedDuplicateEntityTypes: TEntityTypeDict[] = [
  EntityTypeDict.SimulationCampaign,
  EntityTypeDict.CircuitExtractionCampaign,
  EntityTypeDict.IonChannelModelingCampaign,
  EntityTypeDict.EmSynapseMappingCampaign,
  EntityTypeDict.TaskConfig,
];

const AllowedDuplicateBuildEntityTypes: TEntityTypeDict[] = [
  ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
  ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
];

const NotAllowedResultsActionEntityTypes: TExtendedEntitiesTypeDict[] = [
  ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
  ExtendedEntitiesTypeDict.MicrocircuitSimulation,
  ExtendedEntitiesTypeDict.RegionCircuitSimulation,
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
type WorkflowSimulationCampaignRow = ExtendedCampaignsType['data'][number];
type WorkflowSimulationChildRow = SimulationRow;

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

  const [{ page, pageSize }, updatePagination] = useState<{
    page: number;
    pageSize: number;
  }>({
    page: 1,
    pageSize: DEFAULT_PAGE_MEDIUM_SIZE,
  });
  const resolvedActivityType: TActivityValue =
    activityType ?? (ActivityValues.Build as TActivityValue);
  const resolvedEntityType: TExtendedEntitiesTypeDict =
    entityType ?? ExtendedEntitiesTypeDict.Memodel;
  const previousActivityType = usePrevious(activityType);

  const updateActivity = (activity: TActivityValue | null) => {
    updatePagination({ page: 1, pageSize: DEFAULT_PAGE_MEDIUM_SIZE });
    updateActivityState({
      activityType: activity,
    });
  };

  const updateEntityType = (et: TExtendedEntitiesTypeDict | null) => {
    updatePagination({ page: 1, pageSize: DEFAULT_PAGE_MEDIUM_SIZE });
    updateActivityState({
      entityType: et,
    });
  };

  const columns: ColumnsType<EntityCoreObjectTypes> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      onHeaderCell: () => ({
        id: 'activity-table-name-cell-selector',
      }),
      render: (_, record) => <span className="text-primary-9">{record.name}</span>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      onHeaderCell: () => ({
        id: 'activity-table-category-cell-selector',
      }),
      render: () => {
        return (
          <span className={cn('text-primary-9 flex items-center capitalize')}>
            {getActivity(activityType)?.name}
          </span>
        );
      },
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      onHeaderCell: () => ({
        id: 'activity-table-type-cell-selector',
      }),
      render: (_, record) => {
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
      title: 'Date',
      dataIndex: 'date',
      key: 'creation_date',
      render: (_, record) => {
        return <span className="text-primary-9">{renderDateAndHour(record.creation_date)}</span>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => {
        return match({ type: record.type })
          .with({ type: EntityTypeDict.SimulationCampaign }, () => {
            return (
              <LegacyCampaignStatusCell
                campaignId={record.id}
                context={{ virtualLabId, projectId }}
              />
            );
          })
          .with({ type: EntityTypeDict.TaskConfig }, () => {
            const taskConfigType = (record as unknown as ITaskConfig<Record<string, unknown>>)
              .task_config_type;
            if (taskConfigType === TaskConfigType.CircuitExtractionCampaign) {
              return (
                <ActivityStatusCell campaignId={record.id} context={{ virtualLabId, projectId }} />
              );
            }
            if (taskConfigType === TaskConfigType.SkeletonizationCampaign) {
              return (
                <ActivityStatusCell campaignId={record.id} context={{ virtualLabId, projectId }} />
              );
            }

            const statusCountMap = getTaskCampaignStatusCountMap(
              record as unknown as WorkflowTaskCampaignRow
            );
            return <ActivityAggregatedStatus statusCountMap={statusCountMap} />;
          })
          .with({ type: EntityTypeDict.IonChannelModelingCampaign }, () => {
            const statusCountMap = getIonChannelModelingStatusCountMap(
              record as unknown as TExtendedIonChannelModelingCampaignsType['data'][number]
            );
            return <ActivityAggregatedStatus statusCountMap={statusCountMap} />;
          })
          .otherwise(() => {
            const status = get(record, 'status', 'default');
            const mapper = get(StatusMap, status, null);
            const className = mapper?.class;
            const icon = mapper?.icon;
            const title = mapper?.title;
            return (
              <span className={cn('flex items-center capitalize', className)}>
                {icon}
                {title}
              </span>
            );
          });
      },
    },
  ];

  const entity = getEntityByExtendedType({ type: resolvedEntityType });
  const {
    data: activityResult,
    isFetching,
    queryKeyHash,
  } = useQueryActivity({
    activity: resolvedActivityType,
    selectionType: resolvedEntityType,
    entityType: resolvedEntityType,
    page: page ?? 1,
    pageSize: pageSize ?? DEFAULT_PAGE_MEDIUM_SIZE,
    useKeepPreviousData: previousActivityType === activityType,
  });

  const { rowSelection, selectedRows, onRowSelect } = useRowSelection<{
    id: string;
    type: TEntityTypeDict;
  }>({
    dataKey: queryKeyHash,
    selectionType: 'radio',
    onRowsSelected: () => {},
  });

  const selectedRow = selectedRows.at(0);
  const [isResolvingResults, setIsResolvingResults] = useState(false);

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

  const configurationLink = entityType
    ? entity?.detailViewSections?.includes('configuration')
      ? `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/view/${kebabCase(entityType)}/${selectedRow?.id}/configuration`
      : entity?.detailViewSections?.includes('overview')
        ? `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/view/${kebabCase(entityType)}/${selectedRow?.id}/overview`
        : `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/view/${kebabCase(entityType)}/${selectedRow?.id}`
    : null;

  const configurationQuery = query.toString();

  const resultsPath = entity?.detailViewSections?.includes(DetailViewSectionsDict.Results)
    ? DetailViewSectionsDict.Results
    : entity?.detailViewSections?.includes(DetailViewSectionsDict.RelatedArtifacts)
      ? DetailViewSectionsDict.RelatedArtifacts
      : null;

  const resultsLink = entityType
    ? resultsPath
      ? `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/view/${kebabCase(entityType)}/${selectedRow?.id}/${resultsPath}`
      : `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/view/${kebabCase(entityType)}/${selectedRow?.id}`
    : null;
  const isIonChannelModelingCampaign =
    entityType === ExtendedEntitiesTypeDict.IonChannelModelingCampaign;
  const isBuildActivity = activityType === ActivityValues.Build;
  const canShowResultsAction = Boolean(
    resultsLink && entityType && !NotAllowedResultsActionEntityTypes.includes(entityType)
  );
  const resultsActionLink = resultsLink ?? undefined;

  const onDuplicate = () => {
    if (selectedRow?.type === ExtendedEntitiesTypeDict.TaskConfig) {
      const taskConfig = selectedRow as ITaskConfig<Record<string, unknown>>;
      if (taskConfig.task_config_type === TaskConfigType.CircuitExtractionCampaign) {
        const circuitId = taskConfig.inputs.at(0)?.id;
        navigate(
          `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/extract/configure/circuit/${
            circuitId
          }?initialCampaignId=${selectedRow.id}`
        );
      }
      if (taskConfig.task_config_type === TaskConfigType.SkeletonizationCampaign) {
        const emCellMeshId = taskConfig.inputs.at(0)?.id;
        navigate(
          `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/process/configure/em-cell-mesh/${
            emCellMeshId
          }?initialCampaignId=${selectedRow.id}`
        );
      }
      if (
        (selectedRow as ITaskConfig<any>).task_config_type ===
        TaskConfigType.EmSynapseMappingCampaign
      ) {
        const morphologyId = (selectedRow as ITaskConfig<any>).inputs.at(0)?.id;
        navigate(
          `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/build/configure/em-synapse-mapping-campaign/${morphologyId}?initialCampaignId=${selectedRow?.id}`
        );
      }
    }
    if (entityType === ExtendedEntitiesTypeDict.IonChannelModelingCampaign) {
      navigate(
        `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/build/configure/ion-channel-modeling-campaign?${ORIGINAL_CAMPAIGN_ID_QUERY}=${selectedRow?.id}`
      );
      return;
    }
    if (entityType === ExtendedEntitiesTypeDict.MemodelCircuitSimulation) {
      navigate(
        `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/simulate/configure/me-model-circuit/${
          (selectedRow as unknown as ExtendedCampaignsType['data'][0]).entity_id
        }?initialCampaignId=${selectedRow?.id}`
      );

      return;
    }
    if (
      selectedRow?.type === ExtendedEntitiesTypeDict.SimulationCampaign &&
      entityType === ExtendedEntitiesTypeDict.IonChannelModelSimulation
    ) {
      navigate(
        `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/simulate/configure/${kebabCase(ExtendedEntitiesTypeDict.IonChannelModelSimulation)}?initialCampaignId=${selectedRow.id}`
      );
      return;
    }
    if (selectedRow?.type === ExtendedEntitiesTypeDict.SimulationCampaign && entityType) {
      const workflow = getWorkflow({
        activity: WorkflowActivityDictValue.simulate,
        targetType: entityType,
      });
      const entityId = (selectedRow as unknown as ExtendedCampaignsType['data'][0]).entity_id;
      const query = new URLSearchParams({ initialCampaignId: selectedRow.id });

      if (workflow && isSimulateCircuitSourceType(workflow.sourceType)) {
        query.set('dataType', workflow.sourceType);
        navigate(
          `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/simulate/configure/circuit/${entityId}?${query}`
        );
        return;
      }

      const configureSegment = workflow ? kebabCase(workflow.sourceType) : 'circuit';
      navigate(
        `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/simulate/configure/${configureSegment}/${entityId}?${query}`
      );
    }
  };

  const shouldShowEmptyState = !activityResult?.pagination.total_items && !isFetching;

  const expandableOptions = useMemo(() => {
    const expandableTypes: TExtendedEntitiesTypeDict[] = [
      ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
      ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
      ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
      ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
      ExtendedEntitiesTypeDict.MicrocircuitSimulation,
      ExtendedEntitiesTypeDict.IonChannelModelSimulation,
      ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
      ExtendedEntitiesTypeDict.SkeletonizationCampaign,
    ];

    if (!entityType || !expandableTypes.includes(entityType)) return undefined;
    if (
      entityType === ExtendedEntitiesTypeDict.CircuitExtractionCampaign ||
      entityType === ExtendedEntitiesTypeDict.SkeletonizationCampaign
    ) {
      return {
        getRowKey: (record: WorkflowTaskCampaignRow) => record.id,
        getFetchId: (record: WorkflowTaskCampaignRow) => record.id,
        fetcher: async (record: WorkflowTaskCampaignRow) => {
          const taskConfigType = (record as unknown as ITaskConfig<Record<string, unknown>>)
            .task_config_type;
          if (taskConfigType === TaskConfigType.SkeletonizationCampaign) {
            const expandRow = SkeletonizationCampaign.api.expandRow;
            if (!expandRow) return [];
            return expandRow(record as unknown as ITaskConfig<Record<string, unknown>>, {
              virtualLabId,
              projectId,
            }) as Promise<WorkflowTaskCampaignRow['rows']>;
          }
          const expandRow = CircuitExtractionCampaign.api.expandRow;
          if (!expandRow) return [];
          return expandRow(record as unknown as ITaskConfig<Record<string, unknown>>, {
            virtualLabId,
            projectId,
          }) as Promise<WorkflowTaskCampaignRow['rows']>;
        },
        renderExpanded: (
          records: WorkflowTaskCampaignRow['rows'],
          originalRecord: WorkflowTaskCampaignRow
        ) => TaskViewConfig.render(originalRecord, records),
        expandIconColumnIndex: 5,
        expandIcon: TaskViewConfig.expandIcon,
        isRowExpandable: (): boolean => true,
        isTopLevel: true,
      };
    }

    return {
      getRowKey: (record: WorkflowSimulationCampaignRow) => record.id,
      getFetchId: (record: WorkflowSimulationCampaignRow) => record.id,
      fetcher: (record: WorkflowSimulationCampaignRow) =>
        listSimulationRows({
          id: record.id,
          context: { virtualLabId, projectId },
        }),
      renderExpanded: (
        records: WorkflowSimulationChildRow[],
        originalRecord: WorkflowSimulationCampaignRow
      ) =>
        simulationCampaignExpandedViewConfig.render(
          {
            ...originalRecord,
            simulations: records,
          },
          records
        ),
      expandIconColumnIndex: 5,
      expandIcon: simulationCampaignExpandedViewConfig.expandIcon,
      isRowExpandable: (): boolean => true,
      isTopLevel: true,
    };
  }, [entityType, projectId, virtualLabId]);

  const { expandableConfig } = useExpandableTable(
    expandableOptions as UseExpandableTableOptions<EntityCoreObjectTypes> | undefined
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
            className="h-full w-full"
            id="workflow-activities-full-table"
            data-testid="workflow-activities-full-table"
          >
            <ConfigProvider theme={{ hashed: false }}>
              <BaseTable
                expandableConfig={expandableConfig}
                sticky
                id="activities-table"
                data-testid="activities-table"
                wrapperClassname="max-h-[calc(100%-4rem)] h-full"
                dataType={resolvedEntityType}
                className={cn(
                  '[&_.ant-table]:bg-background! [&_.ant-table-thead_th]:bg-background!',
                  '[&_.ant-table-thead_th]:text-neutral-4!',
                  '[&_.ant-table-placeholder]:bg-background!',
                  '[&_.ant-table-sticky-holder]:shadow-none',
                  '[&_.ant-table-body]:secondary-scrollbar!',
                  '[&_.ant-table_th:before]:bg-neutral-2!'
                )}
                loading={isFetching}
                dataSource={activityResult?.data}
                columns={columns}
                rowKey={(o) => o.id}
                rowClassName={cn(
                  '[&.ant-table-row-selected]:translate-x-2 [&.ant-table-row-selected]:ease-out ',
                  '[&.ant-table-row-selected]:transition-transform [&.ant-table-row-selected]:duration-200'
                )}
                rowSelection={{
                  ...rowSelection,
                  renderCell: (
                    _checked: boolean,
                    record: EntityCoreObjectTypes,
                    _index: number,
                    _: React.ReactNode
                  ) => {
                    return (
                      <div className="flex items-center justify-center">
                        <input
                          type="radio"
                          className={cn(
                            'h-5 w-5 cursor-pointer appearance-none rounded-full border border-gray-400',
                            'shadow-[4px_4px_14px_0px_#0000001F,-4px_-4px_10px_0px_#FFFFFFD1]',
                            'checked:border-primary-9 checked:bg-primary-9',
                            'transition-colors duration-200'
                          )}
                          checked={_checked}
                          onChange={() => onRowSelect([], [record])}
                        />
                      </div>
                    );
                  },
                }}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span className="text-primary-9">
                          You don't have any activities yet
                          <strong>
                            {getEntityByExtendedType({ type: entityType ?? undefined })?.title}
                          </strong>
                          .
                        </span>
                      }
                    />
                  ),
                }}
              />
              <div className="relative flex h-15 w-full items-end justify-end">
                <div className="absolute left-1/2 h-15 flex items-center justify-center -translate-x-1/2">
                  <AntPagination
                    responsive
                    showLessItems
                    hideOnSinglePage
                    key="listing-pagination"
                    data-testid="listing-pagination"
                    pageSize={DEFAULT_PAGE_MEDIUM_SIZE}
                    defaultPageSize={DEFAULT_PAGE_MEDIUM_SIZE}
                    onChange={(_page, _pageSize) => {
                      updatePagination({ page: _page, pageSize: _pageSize });
                    }}
                    size="default"
                    current={page ?? 1}
                    total={activityResult?.pagination?.total_items}
                    showSizeChanger={false}
                    aria-label="pagination for listing results"
                    className={cn(
                      '[&_.ant-pagination-item-active]:bg-primary-9! [&_.ant-pagination-item-active_a]:text-white!',
                      '[&_.ant-pagination-disabled_button]:text-neutral-2 [&_button.ant-pagination-item-link]:text-primary-9'
                    )}
                  />
                </div>
                {selectedRow && configurationLink && (
                  <div className="flex h-15 shrink-0 items-center justify-center gap-2">
                    <Button
                      rounded
                      asChild
                      variant="outline"
                      size={breakpoint === 'l' ? 'md' : 'lg'}
                      className="select-none"
                    >
                      <Link
                        href={{ pathname: configurationLink, query: configurationQuery }}
                        className="text-primary-9!"
                      >
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
                      disabled={
                        (activityType === ActivityValues.Build &&
                          !includes(AllowedDuplicateBuildEntityTypes, entityType)) ||
                        !includes(AllowedDuplicateEntityTypes, selectedRow.type)
                      }
                    >
                      Duplicate
                    </Button>
                  </div>
                )}
              </div>
            </ConfigProvider>
          </div>
        )}
      </div>
    </section>
  );
}
