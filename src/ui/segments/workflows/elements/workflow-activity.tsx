'use client';

import { Card, ConfigProvider, Empty, Pagination as AntPagination } from 'antd';
import { useRouter } from '@bprogress/next';
import { useState } from 'react';
import kebabCase from 'es-toolkit/compat/kebabCase';
import find from 'es-toolkit/compat/find';
import get from 'es-toolkit/compat/get';
import Link from 'next/link';
import type { ColumnsType } from 'antd/es/table/interface';

import { EntityCoreObjectTypes, EntityTypeDict, TEntityTypeDict } from '@/api/entitycore/types';
import { useQueryActivity } from '@/ui/segments/project/activities/elements/use-activity';
import { ActivityAndTypeSelectors } from '@/ui/segments/workflows/elements/browse-header';
import { ActivityDict, ActivityValues } from '@/ui/segments/workflows/elements/helpers';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useRowSelection } from '@/ui/segments/data-table/elements/use-row-selection';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { StatusMap } from '@/ui/segments/project/activities/elements/helpers';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { BaseTable } from '@/ui/segments/data-table/table';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { DEFAULT_PAGE_MEDIUM_SIZE } from '@/constants';
import { CardContent } from '@/ui/molecules/card';
import { renderDateAndHour } from '@/util/date';
import { Button } from '@/ui/molecules/button';
import { usePrevious } from '@/hooks/hooks';
import { cn } from '@/utils/css-class';
import { ROOT_ROUTE } from '@/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ExtendedCampaignsType } from '@/entity-configuration/domain/simulation';
import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';

const AllowedDuplicateEntityTypes: TEntityTypeDict[] = [EntityTypeDict.SimulationCampaign];
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

export function WorkflowActivity({ ref }: { ref: React.RefObject<HTMLDivElement | null> }) {
  const { push: navigate } = useRouter();
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();

  const [{ activity: activityType, entityType, page, pageSize }, updateActivityState] = useState<{
    activity: TActivityValue | undefined;
    entityType: TExtendedEntitiesTypeDict | undefined;
    page: number;
    pageSize: number;
  }>({
    activity: ActivityValues.Build,
    entityType: ExtendedEntitiesTypeDict.Memodel,
    page: 1,
    pageSize: DEFAULT_PAGE_MEDIUM_SIZE,
  });

  const previousActivityType = usePrevious(activityType);

  const updateActivity = (activity: TActivityValue | undefined) => {
    updateActivityState((prev) => ({ ...prev, activity, page: 1 }));
  };

  const updateEntityType = (et: TExtendedEntitiesTypeDict | undefined) => {
    updateActivityState((prev) => ({ ...prev, entityType: et, page: 1 }));
  };

  const columns: ColumnsType<EntityCoreObjectTypes> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      onHeaderCell: () => ({
        id: 'activity-table-name-cell-selector',
      }),
      render: (text, record) => <span className="text-primary-9">{record.name}</span>,
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
            {find(ActivityDict, { value: activityType })?.name}
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => {
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
  ];

  const entity = getEntityByExtendedType({ type: entityType! });
  const {
    data: activityResult,
    isFetching,
    queryKeyHash,
    isDependenciesLoading,
  } = useQueryActivity({
    activity: activityType!,
    selectionType: entityType!,
    entityType: entityType!,
    page,
    pageSize,
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
  const configurationLink = entity?.detailViewSections?.includes('configuration')
    ? `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(entityType)}/${selectedRow?.id}/configuration`
    : `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(entityType)}/${selectedRow?.id}`;

  const resultsLink = entity?.detailViewSections?.includes('results')
    ? `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(entityType)}/${selectedRow?.id}/results`
    : `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(entityType)}/${selectedRow?.id}`;

  const onDuplicate = () => {
    if (selectedRow?.type === ExtendedEntitiesTypeDict.SimulationCampaign) {
      navigate(
        `${ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/simulate/configure/circuit/${
          (selectedRow as unknown as ExtendedCampaignsType['data'][0]).circuit.id
        }?initialCampaignId=${selectedRow.id}`
      );
    }
  };

  const shouldShowEmptyState =
    !activityResult?.pagination.total_items && !isDependenciesLoading && !isFetching;

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
              You don’t have any activities yet
            </CardContent>
          </Card>
        ) : (
          <div
            ref={ref}
            className="h-full w-full"
            id="workflow-activities-full-table"
            data-testid="workflow-activities-full-table"
          >
            <ConfigProvider theme={{ hashed: false }}>
              <BaseTable
                sticky
                id="activities-table"
                data-testid="activities-table"
                wrapperClassname="max-h-[calc(100%-5rem)] h-full"
                dataType={entityType!}
                className={cn(
                  '[&_.ant-table]:bg-background! [&_.ant-table-thead_th]:bg-background!',
                  '[&_.ant-table-thead_th]:text-neutral-4!',
                  '[&_.ant-table-placeholder]:bg-background!',
                  '[&_.ant-table-sticky-holder]:shadow-none',
                  '[&_.ant-table-body]:secondary-scrollbar!'
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
                          You don’t have any activities yet
                          <strong>{getEntityByExtendedType({ type: entityType })?.title}</strong>.
                        </span>
                      }
                    />
                  ),
                }}
              />
              <div className="relative flex h-[60px] w-full items-center justify-end">
                <div className="absolute left-1/2 -translate-x-1/2">
                  <AntPagination
                    responsive
                    showLessItems
                    hideOnSinglePage
                    key="listing-pagination"
                    data-testid="listing-pagination"
                    pageSize={DEFAULT_PAGE_MEDIUM_SIZE}
                    defaultPageSize={DEFAULT_PAGE_MEDIUM_SIZE}
                    onChange={(_page, _pageSize) => {
                      updateActivityState((prev) => ({ ...prev, page: _page }));
                    }}
                    size="default"
                    current={page}
                    total={activityResult?.pagination?.total_items}
                    showSizeChanger={false}
                    aria-label="pagination for listing results"
                    className={cn(
                      '[&_.ant-pagination-item-active]:bg-primary-9 [&_.ant-pagination-item-active_a]:text-white!',
                      '[&_.ant-pagination-disabled_button]:text-neutral-2 [&_button.ant-pagination-item-link]:text-primary-9'
                    )}
                  />
                </div>
                {selectedRow && (
                  <div className="flex h-[60px] shrink-0 items-center justify-center gap-2">
                    <Button
                      rounded
                      asChild
                      variant="outline"
                      size={breakpoint === 'l' ? 'md' : 'lg'}
                      className="select-none"
                    >
                      <Link href={configurationLink}>View configuration</Link>
                    </Button>
                    {entityType !== ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation &&
                      entityType !== ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation &&
                      entityType !== ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation && (
                        <Button
                          rounded
                          asChild={activityType !== ActivityValues.Build}
                          variant="outline"
                          size={breakpoint === 'l' ? 'md' : 'lg'}
                          disabled={activityType === ActivityValues.Build}
                          className="disabled:bg-background! disabled:text-label! select-none disabled:cursor-not-allowed"
                        >
                          <Link
                            href={resultsLink}
                            aria-disabled={activityType === ActivityValues.Build}
                          >
                            View results
                          </Link>
                        </Button>
                      )}
                    <Button
                      rounded
                      variant="outline"
                      size={breakpoint === 'l' ? 'md' : 'lg'}
                      onClick={onDuplicate}
                      className="disabled:bg-background disabled:text-label select-none disabled:cursor-not-allowed"
                      disabled={
                        activityType === ActivityValues.Build ||
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
