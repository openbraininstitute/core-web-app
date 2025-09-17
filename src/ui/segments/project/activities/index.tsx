'use client';

import { RightSquareOutlined } from '@ant-design/icons';
import { Empty, Table, ConfigProvider } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import Link from 'next/link';
import get from 'lodash/get';

import { useQueryActivity } from '@/ui/segments/project/activities/elements/use-activity';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  ACTIVITY_PAGE_SIZE,
  Scales,
  StatusMap,
} from '@/ui/segments/project/activities/elements/helpers';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { Header } from '@/ui/segments/project/activities/elements/header';
import { Card, CardHeader, CardContent } from '@/ui/molecules/card';
import { ROOT_ROUTE } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { renderDateAndHour } from '@/util/date';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ActivityType } from '@/ui/segments/project/activities/elements/helpers';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

export function ProjectActivities() {
  const { virtualLabId, projectId } = useWorkspace();
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState<TExtendedEntitiesTypeDict>(ExtendedEntitiesTypeDict.Memodel);
  const [type, setType] = useState<ActivityType>('build');

  const entity = getEntityByExtendedType({
    type: Scales[scale]?.[type] ?? undefined,
  });

  const { data, isLoading } = useQueryActivity({
    scale,
    type,
    entity,
    page,
  });

  const columns: ColumnsType<EntityCoreObjectTypes> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <span className="text-primary-8">{record.name}</span>,
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
        const className = get(StatusMap, status, null)?.class;
        const scaleType = get(record, 'type', null);

        if (scaleType) {
          const section = get(Scales, `${scaleType}.link`, null);
          const linkUrl = `${ROOT_ROUTE}/${virtualLabId}/${projectId}/${section}/view/${record.id}`;
          return (
            <Link href={linkUrl} aria-label={record.name} className={className}>
              <RightSquareOutlined />
            </Link>
          );
        }
        return null;
      },
    },
  ];

  return (
    <Card className="w-full shadow-xs">
      <CardHeader className="text-primary-9 flex items-center justify-between font-bold">
        <Header onScaleChange={setScale} onTypeChange={setType} onPageChange={setPage} />
      </CardHeader>
      <CardContent>
        <Card borderless shadowless className="flex items-center justify-center pt-5 pb-0">
          {!data?.pagination.total_items && !isLoading ? (
            <Card className="text-neutral-4 shadow-xs">
              <CardContent>You don’t have any activities yet </CardContent>
            </Card>
          ) : (
            <div className="flex h-full w-full flex-col">
              <ConfigProvider theme={{ hashed: false }}>
                <Table
                  className={cn(
                    '[&_.ant-table]:bg-neutral-1! [&_.ant-table-thead_th]:bg-neutral-1!',
                    '[&_.ant-table-thead_th]:text-neutral-4!',
                    '[&_.ant-table-placeholder]:bg-background!'
                  )}
                  loading={isLoading}
                  dataSource={data?.data}
                  columns={columns}
                  rowKey={(o) => o.id}
                  pagination={{
                    pageSize: ACTIVITY_PAGE_SIZE,
                    total: data?.pagination.total_items,
                    defaultCurrent: 1,
                    current: page,
                    hideOnSinglePage: true,
                    align: 'end',
                    size: 'default',
                    responsive: true,
                    role: 'button',
                    position: ['bottomRight'],
                    onChange: (_page, _pageSize) => {
                      setPage(_page);
                    },
                    className: cn(
                      '[&_.ant-pagination-item-active]:bg-primary-9 [&_.ant-pagination-item-active_a]:text-white!',
                      '[&_.ant-pagination-disabled_button]:text-neutral-2 [&_button.ant-pagination-item-link]:text-primary-9'
                    ),
                  }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <span className="text-primary-9">
                            No activities found for{' '}
                            <strong>{getEntityByExtendedType({ type: scale })?.title}</strong>.
                          </span>
                        }
                      />
                    ),
                  }}
                />
              </ConfigProvider>
            </div>
          )}
        </Card>
      </CardContent>
    </Card>
  );
}
