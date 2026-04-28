'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import { Pagination as AntPagination, Card, ConfigProvider, Empty } from 'antd';
import { find, get, kebabCase } from 'es-toolkit/compat';
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
import { DEFAULT_PAGE_MEDIUM_SIZE } from '@/constants';
import { viewConfig as simulationCampaignExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/simulation/small-microcircuit-simulation';
import { TaskViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/task-activity';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import {
  getStatusCountMap as getIonChannelModelingStatusCountMap,
  resolveIonChannelModelingByCampaignId,
  type TExtendedIonChannelModelingCampaignsType,
} from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import {
  type ExtendedCampaignsType,
  getCircuitSimulationStatusCountMap,
} from '@/entity-configuration/domain/simulation';
import {
  getTaskCampaignStatusCountMap,
  type TTaskCampaignRow,
} from '@/entity-configuration/domain/task-helpers';
import { usePrevious } from '@/hooks/hooks';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { CardContent } from '@/ui/molecules/card';
import { ExecutionAggregatedStatus } from '@/ui/segments/activity-execution/status';
import { useRowSelection } from '@/ui/segments/data-table/elements/use-row-selection';
import {
  type UseExpandableTableOptions,
  useExpandableTable,
} from '@/ui/segments/data-table/expandable-row/use-expandable-table';
import { BaseTable } from '@/ui/segments/data-table/table';
import { StatusMap } from '@/ui/segments/project/activities/elements/helpers';
import { useQueryActivity } from '@/ui/segments/project/activities/elements/use-activity';
import { ORIGINAL_CAMPAIGN_ID_QUERY } from '@/ui/segments/workflows/build/ion-channel-build/helpers';
import { ActivityAndTypeSelectors } from '@/ui/segments/workflows/elements/browse-header';
import { ActivityDict, ActivityValues } from '@/ui/segments/workflows/elements/helpers';
import { renderDateAndHour } from '@/util/date';
import { cn } from '@/utils/css-class';

import type { ColumnsType } from 'antd/es/table/interface';
import type { ICircuitSimulationCampaign } from '@/api/entitycore/types/entities/simulation-campaign';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';

const AllowedDuplicateEntityTypes: TEntityTypeDict[] = [
  EntityTypeDict.SimulationCampaign,
  EntityTypeDict.CircuitExtractionCampaign,
  EntityTypeDict.IonChannelModelingCampaign,
  EntityTypeDict.TaskConfig,
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
            {find(ActivityDict, { value: activityType ?? undefined })?.name}
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
        return (
          <span className={cn('text-primary-9 flex items-center capitalize')}>
            {getEntityByExtendedType({ type: record.type })?.title}
          </span>
        );
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
            const statusCountMap = getCircuitSimulationStatusCountMap(
              record as ICircuitSimulationCampaign
            );
            return <ExecutionAggregatedStatus statusCountMap={statusCountMap} />;
          })
          .with({ type: EntityTypeDict.TaskConfig }, () => {
            const statusCountMap = getTaskCampaignStatusCountMap(
              record as unknown as TTaskCampaignRow<any>
            );
            return <ExecutionAggregatedStatus statusCountMap={statusCountMap} />;
          })
          .with({ type: EntityTypeDict.IonChannelModelingCampaign }, () => {
            const statusCountMap = getIonChannelModelingStatusCountMap(
              record as unknown as TExtendedIonChannelModelingCampaignsType['data'][number]
            );
            return <ExecutionAggregatedStatus statusCountMap={statusCountMap} />;
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

  const entity = getEntityByExtendedType({ type: entityType! });
  const {
    data: activityResult,
    isFetching,
    queryKeyHash,
  } = useQueryActivity({
    activity: activityType!,
    selectionType: entityType!,
    entityType: entityType!,
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

  const onDuplicate = () => {
    if (selectedRow?.type === ExtendedEntitiesTypeDict.TaskConfig) {
      const taskConfig = selectedRow as ITaskConfig<any>;
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
    }
    if (entityType === ExtendedEntitiesTypeDict.IonChannelModelingCampaign) {
      navigate(
        `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/build/configure/ion-channel-modeling-campaign?${ORIGINAL_CAMPAIGN_ID_QUERY}=${selectedRow?.id}`
      );
      return;
    }
    if (entityType === ExtendedEntitiesTypeDict.MemodelCircuitSimulation) {
      navigate(
        `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/simulate/configure/memodel/${
          (selectedRow as unknown as ExtendedCampaignsType['data'][0]).circuit.id
        }?dataType=${ExtendedEntitiesTypeDict.MemodelCircuit}&initialCampaignId=${selectedRow?.id}`
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
    }
    if (selectedRow?.type === ExtendedEntitiesTypeDict.SimulationCampaign) {
      navigate(
        `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/simulate/configure/circuit/${
          (selectedRow as unknown as ExtendedCampaignsType['data'][0]).circuit.id
        }?initialCampaignId=${selectedRow.id}`
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
      ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
      ExtendedEntitiesTypeDict.SkeletonizationCampaign,
    ];

    if (!entityType || !expandableTypes.includes(entityType)) return undefined;
    if (
      entityType === ExtendedEntitiesTypeDict.CircuitExtractionCampaign ||
      entityType === ExtendedEntitiesTypeDict.SkeletonizationCampaign
    ) {
      return {
        getRowKey: (record: TTaskCampaignRow<any>) => record.id,
        getFetchId: (record: TTaskCampaignRow<any>) => record.id,
        fetcher: async (record: TTaskCampaignRow<any>) => {
          return record.rows ?? [];
        },
        renderExpanded: (
          records: EntityCoreIdentifiable[],
          originalRecord: TTaskCampaignRow<any>
        ) => TaskViewConfig.render(originalRecord, records),
        expandIconColumnIndex: 5,
        expandIcon: TaskViewConfig.expandIcon,
        isRowExpandable: (record: TTaskCampaignRow<any>) => {
          const subRecords = record.rows ?? [];
          return subRecords.length > 1;
        },
        isTopLevel: true,
      };
    }

    return {
      getRowKey: (record: any) => record.id,
      getFetchId: (record: any) => record.id,
      fetcher: async (record: any) =>
        entity?.api.expandRow?.(record, {
          virtualLabId,
          projectId,
        }),
      renderExpanded: (records: any[], originalRecord: any) =>
        simulationCampaignExpandedViewConfig.render(originalRecord, records),
      expandIconColumnIndex: 6,
      expandIcon: simulationCampaignExpandedViewConfig.expandIcon,
      isRowExpandable: simulationCampaignExpandedViewConfig.isExpandable,
      isTopLevel: true,
    };
  }, [entityType, entity?.api.expandRow, projectId, virtualLabId]);

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
          'mb-5 grid w-full grid-cols-[2fr_2fr] items-center justify-center gap-5 pt-2',
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
                dataType={entityType!}
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
                    record: any,
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
                    {resultsLink &&
                      entityType !== ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation &&
                      entityType !== ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation &&
                      entityType !== ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation &&
                      entityType !== ExtendedEntitiesTypeDict.MemodelCircuitSimulation &&
                      entityType !== ExtendedEntitiesTypeDict.CircuitExtractionCampaign &&
                      entityType !== ExtendedEntitiesTypeDict.SkeletonizationCampaign &&
                      entityType !== ExtendedEntitiesTypeDict.IonChannelModelSimulation &&
                      (entityType === ExtendedEntitiesTypeDict.IonChannelModelingCampaign ? (
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
                          asChild={activityType !== ActivityValues.Build}
                          variant="outline"
                          size={breakpoint === 'l' ? 'md' : 'lg'}
                          disabled={activityType === ActivityValues.Build}
                          className="disabled:bg-background! disabled:text-label! select-none disabled:cursor-not-allowed group"
                        >
                          <Link
                            href={resultsLink}
                            aria-disabled={activityType === ActivityValues.Build}
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
                          entityType !== ExtendedEntitiesTypeDict.IonChannelModelingCampaign) ||
                        !AllowedDuplicateEntityTypes.includes(selectedRow.type)
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
