'use client';

import { RightSquareOutlined } from '@ant-design/icons';
import { get } from 'es-toolkit/compat';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DEFAULT_PAGE_MEDIUM_SIZE } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Header } from '@/ui/segments/project/activities/elements/header';
import { StatusMap } from '@/ui/segments/project/activities/elements/helpers';
import { ActivityValues } from '@/ui/segments/workflows/config';
import { renderDateAndHour } from '@/util/date';
import { cn } from '@/utils/css-class';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { GridDataSource, GridPage } from '@/features/data-grid/core';
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

  // Changing the category/type resets to page 1: the SimpleGrid below is keyed on
  // `${activity}-${entityType}`, so a change remounts it with a fresh page-1 store
  // (parity with the legacy `setPage(1)` on selector change).
  const onActivityChange = (next: TActivityValue | null) => {
    if (next) setActivity(next);
  };

  const onEntityTypeChange = (next: TExtendedEntitiesTypeDict | null) => {
    if (next) setEntityType(next);
  };

  // Server data source: the grid owns paging; each page fetches via the entity's
  // list query (same call the legacy `useQueryActivity` made).
  const listQuery = entity.api.query?.list;
  const dataSource = useMemo<GridDataSource<EntityCoreObjectTypes>>(
    () => ({
      fetch: async (query): Promise<GridPage<EntityCoreObjectTypes>> => {
        if (!listQuery) return { rows: [], total: 0 };
        const response = await listQuery({
          withFacets: false,
          context: { virtualLabId, projectId },
          filters: {
            page: query.page,
            page_size: query.pageSize,
            authorized_project_id: projectId,
            authorized_public: false,
          },
        });
        return {
          // the per-entity list queries return a union of entity arrays; the table is
          // entity-agnostic (legacy typed this response as `EntityCoreResponse<any>`).
          rows: (response?.data ?? []) as EntityCoreObjectTypes[],
          total: response?.pagination?.total_items ?? 0,
        };
      },
    }),
    [listQuery, virtualLabId, projectId]
  );

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
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="secondary-scrollbar flex-1 overflow-auto">
            <SimpleGrid<EntityCoreObjectTypes>
              // remount on category/type change → fresh page-1 store (legacy setPage(1))
              key={`${activity}-${entityType}`}
              columns={columns}
              getRowId={(o) => o.id}
              pageSize={DEFAULT_PAGE_MEDIUM_SIZE}
              serverSide={{
                dataSource,
                queryKey: ['project-activities', virtualLabId, projectId, activity, entityType],
                enabled: Boolean(activity && entityType),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
