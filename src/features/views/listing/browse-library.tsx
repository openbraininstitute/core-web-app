'use client';

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { RESET } from 'jotai/utils';
import { useEffect } from 'react';
import snakeCase from 'es-toolkit/compat/snakeCase';
import compact from 'es-toolkit/compat/compact';
import dynamic from 'next/dynamic';
import map from 'es-toolkit/compat/map';

import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { DEFAULT_PAGE_MEDIUM_SIZE, DEFAULT_PAGE_NUMBER, WorkspaceScope } from '@/constants';
import { useQueryExtendedEntityType } from '@/ui/hooks/use-query-extended-entity-type';
import {
  coreActiveColumnsAtom,
  coreFiltersAtom,
  corePageNumberAtom,
  coreSortStateAtom,
} from '@/ui/segments/data-table/elements/context';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { Card, CardDescription, CardTitle } from '@/ui/molecules/card';
import { MiniDetailView } from '@/ui/segments/mini-detail-view';
import { GenericError } from '@/ui/molecules/generic-error';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  getProjectBookmarkCategories,
  getProjectBookmarksPerCategory,
} from '@/api/virtual-lab-svc/queries/bookmark';
import {
  makeSelectEntityClickEvent,
  useMiniDetailView,
  useSelectEntityClickEvent,
} from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';

const MainTable = dynamic(() => import('@/ui/segments/data-table'), { ssr: false });

export function BrowseLibraryScope() {
  const { virtualLabId, projectId } = useWorkspace();
  const { type } = useParams<WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> }>();
  const dataKey = compact([virtualLabId, projectId, type, WorkspaceScope.Bookmarks]).join('/');
  const dataType = snakeCase(type) as TExtendedEntitiesTypeDict;
  const [pageNumber, setPageNumber] = useAtom(corePageNumberAtom(dataKey));
  const { mdv, setMdv } = useMiniDetailView();

  const { isLoading: loadingBookmarksCategory, data: bookmarksCategories } = useQuery({
    queryKey: keyBuilder.bookmarkCategories({ virtualLabId, projectId }),
    queryFn: () => getProjectBookmarkCategories({ virtualLabId, projectId }),
    select: (response) => response.data,
  });

  const { isLoading: loadingBookmarks, data: bookmarks } = useQuery({
    queryKey: keyBuilder.bookmarks({
      virtualLabId,
      projectId,
      page: pageNumber,
      pageSize: DEFAULT_PAGE_MEDIUM_SIZE,
      category: dataType,
    }),
    queryFn: () =>
      getProjectBookmarksPerCategory({
        context: { virtualLabId, projectId },
        category: dataType as TEntityTypeDict,
        pagination: { page: pageNumber, page_size: DEFAULT_PAGE_MEDIUM_SIZE },
      }),
  });

  const entity = getEntityByExtendedType({ type: dataType });

  const [sortState, setSortState] = useAtom(coreSortStateAtom({ key: dataKey }));

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

  const { data, error, isLoading } = useQueryExtendedEntityType({
    context: {
      key: dataKey,
      workspaceScope: WorkspaceScope.Bookmarks,
      extendedEntityType: snakeCase(type) as TExtendedEntitiesTypeDict,
    },
    workspace: { virtualLabId, projectId },
    queryFn: async ({ queryKey }) => {
      const [{ workspace, queryParameters }] = queryKey;
      return entity?.api?.query.list?.({
        withFacets: true,
        filters: {
          ...queryParameters,
          id__in: map(bookmarks?.data?.results, 'entity_id'),
        },
        context: workspace,
      });
    },
    useKeepPreviousData: false,
    requireBrainRegion: false,
    enabled: Boolean(bookmarks?.data?.total),
  });

  const dataSource = (data as EntityCoreResponse<EntityCoreIdentifiableNamed>)?.data;
  const facets = (data as EntityCoreResponse<EntityCoreIdentifiableNamed>)?.facets;
  const pagination = (data as EntityCoreResponse<EntityCoreIdentifiableNamed>)?.pagination;

  const onCellClick = (_: string, record: EntityCoreIdentifiableNamed) => {
    makeSelectEntityClickEvent({
      display: true,
      data: record,
    });
  };

  useSelectEntityClickEvent((event) => {
    setMdv(event.detail.display);
  });

  const resetFilterOnExit = useSetAtom(coreFiltersAtom({ dataType, key: dataKey }));

  useEffect(() => {
    setMdv(false);
    return () => {
      resetFilterOnExit(RESET);
      makeSelectEntityClickEvent({ display: false, data: null });
      setMdv(false);
    };
  }, [resetFilterOnExit, setMdv]);

  if (!loadingBookmarksCategory) {
    if (!Object.keys(bookmarksCategories ?? {}).includes(entity?.extendedType!)) {
      return (
        <div className="flex w-full items-center justify-center">
          <Card className="text-primary-9 p-5">
            <CardTitle className="select-none">No bookmarks for this type</CardTitle>
            <CardDescription className="select-none">
              Nothing saved here (yet). Pick a type from the left menu or bookmark entities from
              <br />
              your data to create your own collection.
            </CardDescription>
          </Card>
        </div>
      );
    }
  }

  if (error) {
    log('error', error);
    return (
      <GenericError
        shouldContactSupport
        text={`
    An error occurred while fetching  "${entity?.title ?? 'entities'}" data for this region.
    We are sorry about the inconvenience. Please contact support
    `}
        icon={<WarningOutlined className="fill-current [font-size:inherit]" />}
      />
    );
  }

  return (
    <>
      <div
        id="explore-body-container"
        data-testid="explore-body-container"
        className="h-full max-h-[calc(100vh-11.8rem)] min-h-0 w-full min-w-0 overflow-hidden rounded-2xl [grid-area:body]"
      >
        <div id="main-listing-table-container" className={cn('h-full w-full')}>
          <MainTable
            showLoadingState
            sticky={{ offsetHeader: 75.5 }}
            isLoading={isLoading || loadingBookmarks}
            dataScope={WorkspaceScope.Bookmarks}
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
                '[&_.ant-table]:bg-background! [&_.ant-table-header_th]:bg-background!',
                '[&_.ant-table-placeholder]:bg-background! [&_.ant-table-tbody_tr.ant-table-placeholder]:bg-background!'
              ),
            }}
            selectionType="checkbox"
          />
        </div>
      </div>
      <div
        id="mini-detail-view-container"
        className={cn(
          'h-full max-h-[calc(100vh-11.8rem)] w-full min-w-0',
          '[grid-area:mini-view]',
          {
            hidden: !mdv,
          }
        )}
      >
        <MiniDetailView dataType={dataType} />
      </div>
    </>
  );
}
