'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';

import snakeCase from 'lodash/snakeCase';
import compact from 'lodash/compact';
import get from 'lodash/get';

import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { useQueryExtendedEntityType } from '@/ui/hooks/use-query-extended-entity-type';
import {
  coreActiveColumnsAtom,
  corePageNumberAtom,
  coreSortStateAtom,
} from '@/ui/segments/data-table/elements/context';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { MiniDetailView } from '@/ui/segments/mini-detail-view';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { MainTable } from '@/ui/segments/data-table';
import { DEFAULT_PAGE_NUMBER } from '@/constants';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';
import type { TWorkspaceScope } from '@/constants';
import type { KebabCase } from '@/utils/type';
import {
  makeSelectEntityClickEvent,
  useSelectEntityClickEvent,
} from '@/ui/segments/mini-detail-view/event';

export function BrowseLibraryScope() {
  const searchParams = useSearchParams();
  const scope = searchParams.get('scope') as TWorkspaceScope;
  const { type } = useParams<WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> }>();
  const { virtualLabId, projectId } = useWorkspace();
  const dataKey = compact([virtualLabId, projectId, type, scope]).join('/');
  const dataType = snakeCase(type) as TExtendedEntitiesTypeDict;

  const entity = getEntityByExtendedType({ type: dataType });
  const setPageNumber = useSetAtom(corePageNumberAtom(dataKey));
  const [sortState, setSortState] = useAtom(coreSortStateAtom({ key: dataKey }));
  const [miniViewPresent, updateDisplayMiniView] = useState(false);

  const onSortChange = (newSortState: any) => {
    setPageNumber(DEFAULT_PAGE_NUMBER);
    setSortState(newSortState);
  };

  const allColumns = useDataTableColumns<EntityCoreIdentifiableNamed>({
    dataType,
    sortState,
    setSortState: onSortChange,
  });

  const activeColumns = useAtomValue(coreActiveColumnsAtom({ dataType, key: dataKey }));
  const columns = allColumns.filter(({ key }) => (activeColumns || []).includes(key as string));

  const { data, error, isPlaceholderData, isFetching, isLoading } = useQueryExtendedEntityType({
    context: {
      key: dataKey,
      workspaceScope: scope,
      extendedEntityType: snakeCase(type) as TExtendedEntitiesTypeDict,
    },
    workspace: { virtualLabId, projectId },
    queryFn: async ({ queryKey }) => {
      const [{ workspace, queryParameters }] = queryKey;
      return entity?.api?.query.list?.({
        withFacets: true,
        filters: { ...queryParameters },
        context: workspace,
      });
    },
    enabled: ({ queryKey }) => {
      const [{ queryParameters }] = queryKey;
      if (!get(queryParameters, 'within_brain_region_brain_region_id', null)) return false;
      return true;
    },
  });

  const dataSource = (data as EntityCoreResponse<EntityCoreIdentifiableNamed>)?.data;
  const facets = (data as EntityCoreResponse<EntityCoreIdentifiableNamed>)?.facets;
  const pagination = (data as EntityCoreResponse<EntityCoreIdentifiableNamed>)?.pagination;

  const onCellClick = (_: string, record: EntityCoreIdentifiableNamed) => {
    // navigate(
    //   `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore/view/${kebabCase(record.type)}/${record.id}`
    // );
    makeSelectEntityClickEvent({
      display: true,
      data: record,
    });
  };

  useSelectEntityClickEvent((event) => {
    updateDisplayMiniView(event.detail.display);
  });

  if (error)
    return (
      <div>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );

  return (
    <>
      <div
        id="explore-body-container"
        data-testid="explore-body-container"
        className="h-full max-h-[calc(100vh-11.8rem)] min-h-0 w-full min-w-0 overflow-hidden rounded-2xl [grid-area:body]"
      >
        <div id="main-listing-table-container" className={cn('h-full w-full')}>
          <MainTable<EntityCoreIdentifiableNamed>
            controlsVisible
            showLoadingState
            sticky={{ offsetHeader: 75.5 }}
            isLoading={(isPlaceholderData && isFetching) || isLoading}
            dataScope={scope}
            dataSource={dataSource ?? []}
            dataType={dataType}
            workspace={{ virtualLabId, projectId }}
            dataKey={dataKey}
            columns={columns}
            facets={facets}
            onCellClick={onCellClick}
            resultPagination={{
              pagination,
              totalData: dataSource?.length,
            }}
            cls={{
              table: cn(
                '[&_.ant-table]:bg-neutral-1! [&_.ant-table-header_th]:bg-neutral-1!',
                '[&_.ant-table-placeholder]:bg-neutral-1! [&_.ant-table-tbody_tr.ant-table-placeholder]:bg-neutral-1!'
              ),
            }}
          />
        </div>
      </div>
      <div
        id="mini-detail-view-container"
        className={cn(
          'h-full max-h-[calc(100vh-11.8rem)] w-full min-w-0',
          '[grid-area:mini-view]',
          {
            hidden: !miniViewPresent,
          }
        )}
      >
        <MiniDetailView />
      </div>
    </>
  );
}
