'use client';

import { RightSquareOutlined } from '@ant-design/icons';
import { Pagination as AntPagination, Empty } from 'antd';
import { get } from 'es-toolkit/compat';
import Link from 'next/link';
import { useState } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DEFAULT_PAGE_MEDIUM_SIZE } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Card, CardContent } from '@/ui/molecules/card';
import { Header } from '@/ui/segments/project/activities/elements/header';
import { StatusMap } from '@/ui/segments/project/activities/elements/helpers';
import { useQueryActivity } from '@/ui/segments/project/activities/elements/use-activity';
import { ActivityValues } from '@/ui/segments/workflows/config';
import { renderDateAndHour } from '@/util/date';
import { cn } from '@/utils/css-class';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { TActivityValue } from '@/ui/segments/workflows/config';

export function ProjectActivities({
  targetVirtualLabId,
  targetProjectId,
  showTitle = true,
  card = true,
  onNavigate,
}: {
  targetVirtualLabId?: string;
  targetProjectId?: string;
  showTitle?: boolean;
  card?: boolean;
  onNavigate?: () => void;
}) {
  const context = useWorkspace();
  const virtualLabId = targetVirtualLabId || context.virtualLabId;
  const projectId = targetProjectId || context.projectId;

  const [page, setPage] = useState(1);

  // Category -> Type selection, mirroring the workflows browse view:
  // `activity` is the Category (Build / Simulate / Extract / Process data) and
  // `entityType` is the Type (the target entity the activity produces).
  const [activity, setActivity] = useState<TActivityValue>(ActivityValues.Build as TActivityValue);
  const [entityType, setEntityType] = useState<TExtendedEntitiesTypeDict>(
    ExtendedEntitiesTypeDict.Memodel
  );

  const entity = getEntityByExtendedType({ type: entityType });

  if (!entity?.extendedType) {
    throw new Error(`No entity found for type: ${entityType}`);
  }

  const onActivityChange = (next: TActivityValue | null) => {
    if (next) setActivity(next);
    setPage(1);
  };

  const onEntityTypeChange = (next: TExtendedEntitiesTypeDict | null) => {
    if (next) setEntityType(next);
    setPage(1);
  };

  const { data, isQueryEnabled } = useQueryActivity({
    activity,
    selectionType: entityType,
    entityType: entity?.extendedType,
    page,
    useKeepPreviousData: true,
    targetVirtualLabId: virtualLabId,
    targetProjectId: projectId,
  });

  const columns: Array<SimpleColumn<EntityCoreObjectTypes>> = [
    {
      id: 'name',
      header: 'Name',
      renderCell: (record) => <span className="text-primary-8">{record.name}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      renderCell: (record) => {
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
      id: 'creation_date',
      header: 'Date',
      renderCell: (record) => (
        <span className="text-primary-9">{renderDateAndHour(record.creation_date)}</span>
      ),
    },
    {
      id: 'spacer',
      header: '',
      width: { flex: 1 },
    },
    {
      id: 'linkUrl',
      header: 'Actions',
      align: 'center',
      renderCell: (record) => {
        const status = get(record, 'status', 'default');
        const color = get(StatusMap, status, null)?.color;
        const scaleType = get(record, 'type', null);

        if (!scaleType) {
          return null;
        }

        const linkUrl = resolveExploreDetailsPageUrl({
          ctx: { virtualLabId, projectId },
          entityId: record.id,
          dataType: entity.extendedType,
        });

        return (
          <Link href={linkUrl} aria-label={record.name} style={{ color }} onClick={onNavigate}>
            <RightSquareOutlined />
          </Link>
        );
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
        activity={activity}
        entityType={entityType}
        onActivityChange={onActivityChange}
        onEntityTypeChange={onEntityTypeChange}
        showTitle={showTitle}
      />
      <div className="flex-1 overflow-hidden flex flex-col mt-5">
        {shouldShowEmptyState ? (
          <Card className="text-neutral-4 shadow-xs">
            <CardContent>You don't have any activities yet </CardContent>
          </Card>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="secondary-scrollbar flex-1 overflow-auto">
              {data?.data?.length ? (
                <SimpleGrid<EntityCoreObjectTypes>
                  columns={columns}
                  rows={data.data}
                  getRowId={(o) => o.id}
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span className="text-primary-9">
                      No activities found for{' '}
                      <strong>{getEntityByExtendedType({ type: entityType })?.title}</strong>.
                    </span>
                  }
                />
              )}
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
                  '[&_.ant-pagination-item]:rounded-full! [&_.ant-pagination-item-link]:rounded-full!',
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
