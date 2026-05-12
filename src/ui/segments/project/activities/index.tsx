'use client';

import { RightSquareOutlined } from '@ant-design/icons';
import { Pagination as AntPagination, ConfigProvider, Empty, Table } from 'antd';
import { get, kebabCase } from 'es-toolkit/compat';
import Link from 'next/link';
import { useState } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { DEFAULT_PAGE_MEDIUM_SIZE } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Card, CardContent, CardHeader } from '@/ui/molecules/card';
import { Header } from '@/ui/segments/project/activities/elements/header';
import { Scales, StatusMap } from '@/ui/segments/project/activities/elements/helpers';
import { useQueryActivity } from '@/ui/segments/project/activities/elements/use-activity';
import { ActivityValues } from '@/ui/segments/workflows/config';
import { renderDateAndHour } from '@/util/date';
import { cn } from '@/utils/css-class';

import type { ColumnsType } from 'antd/es/table';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config';

export function ProjectActivities({
  targetVirtualLabId,
  targetProjectId,
  showTitle = true,
  card = true,
}: {
  targetVirtualLabId?: string;
  targetProjectId?: string;
  showTitle?: boolean;
  card?: boolean;
}) {
  const context = useWorkspace();
  const virtualLabId = targetVirtualLabId || context.virtualLabId;
  const projectId = targetProjectId || context.projectId;

  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState<TExtendedEntitiesTypeDict>(
    ExtendedEntitiesTypeDict.Memodel
  );

  const [activity, setActivity] = useState<TActivityValue>(ActivityValues.Build as TActivityValue);
  const entity = getEntityByExtendedType({
    type: get(Scales, [entityType, activity], null),
  });

  if (!entity?.extendedType) {
    throw new Error(`No entity found for type: ${entityType}`);
  }

  const { data, isFetching, isQueryEnabled } = useQueryActivity({
    activity,
    selectionType: entityType,
    entityType: entity?.extendedType,
    page,
    useKeepPreviousData: true,
  });

  const columns: ColumnsType<EntityCoreObjectTypes> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => <span className="text-primary-8">{record.name}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => {
        const status = get(record, 'status', 'default');
        const mapper = get(StatusMap, status, null);
        const icon = mapper?.icon;
        const title = mapper?.title;
        return (
          <span className="flex items-center capitalize" style={{ color: mapper?.color }}>
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
    {
      title: '',
      width: 'auto',
    },
    {
      title: 'Actions',
      dataIndex: 'linkUrl',
      key: 'linkUrl',
      align: 'center',
      render: (_, record) => {
        const status = get(record, 'status', 'default');
        const color = get(StatusMap, status, null)?.color;
        const scaleType = get(record, 'type', null);

        if (scaleType) {
          const linkUrl = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(entity?.extendedType)}/${record.id}`;
          return (
            <Link href={linkUrl} aria-label={record.name} style={{ color }}>
              <RightSquareOutlined />
            </Link>
          );
        }
        return null;
      },
    },
  ];

  const shouldShowEmptyState =
    data && !data.pagination.total_items && !isQueryEnabled && activity && entityType;

  return (
    <div
      className={cn(
        card ? 'border border-gray-200 rounded-2xl p-4' : 'border-none px-7',
        'w-full shadow-xs flex flex-col h-full overflow-hidden'
      )}
    >
      <Header
        onScaleChange={setEntityType}
        onTypeChange={setActivity}
        onPageChange={setPage}
        showTitle={showTitle}
      />
      <div className="flex-1 overflow-hidden flex flex-col mt-5">
        {shouldShowEmptyState ? (
          <Card className="text-neutral-4 shadow-xs">
            <CardContent>You don't have any activities yet </CardContent>
          </Card>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <Table
                bordered
                className={cn(
                  '[&_.ant-table]:bg-zinc-100! [&_.ant-table-container]:bg-zinc-100!',
                  '[&_.ant-table-content]:bg-zinc-100! [&_.ant-table-body]:bg-zinc-100!',
                  '[&_.ant-table-thead_th]:bg-zinc-100! [&_.ant-table-thead_th]:text-neutral-4!',
                  '[&_.ant-table-tbody_td]:bg-zinc-100! [&_.ant-table-cell]:bg-zinc-100!',
                  '[&_.ant-table-cell-row-hover]:bg-zinc-100!',
                  '[&_.ant-table-cell-fix-left]:bg-zinc-100! [&_.ant-table-cell-fix-right]:bg-zinc-100!',
                  '[&_tr.ant-table-placeholder]:bg-zinc-100! [&_tr.ant-table-placeholder:hover_td]:bg-zinc-100!',
                  '[&_.ant-table-summary]:bg-zinc-100!',
                  '[&_.ant-spin-container]:bg-zinc-100! [&_.ant-spin-nested-loading]:bg-zinc-100!',
                  '[&_.ant-table-body]:secondary-scrollbar!'
                )}
                scroll={{ y: 'calc(100vh - 20rem)' }}
                loading={isFetching}
                dataSource={data?.data}
                columns={columns}
                rowKey={(o) => o.id}
                pagination={false}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span className="text-primary-9">
                          No activities found for{' '}
                          <strong>{getEntityByExtendedType({ type: entityType })?.title}</strong>.
                        </span>
                      }
                    />
                  ),
                }}
              />
            </div>
            <div className="flex shrink-0 items-center justify-end py-3">
              <AntPagination
                responsive
                showLessItems
                hideOnSinglePage
                pageSize={DEFAULT_PAGE_MEDIUM_SIZE}
                defaultPageSize={DEFAULT_PAGE_MEDIUM_SIZE}
                current={page}
                total={data?.pagination.total_items}
                showSizeChanger={false}
                size="default"
                onChange={(_page) => setPage(_page)}
                className={cn(
                  '[&_.ant-pagination-item-active]:bg-primary-9! [&_.ant-pagination-item-active_a]:text-white!',
                  '[&_.ant-pagination-disabled_button]:text-neutral-2! [&_button.ant-pagination-item-link]:text-primary-9!'
                )}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
