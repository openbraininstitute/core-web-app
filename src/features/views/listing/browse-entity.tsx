/* eslint-disable react/jsx-props-no-spreading */

'use client';

import { ReactElement, useEffect, type ComponentProps } from 'react';
import { parseAsString, Parser, useQueryState } from 'nuqs';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { WarningOutlined } from '@ant-design/icons';
import { RESET } from 'jotai/utils';
import compact from 'es-toolkit/compat/compact';
import dynamic from 'next/dynamic';
import get from 'es-toolkit/compat/get';

import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { useQueryExtendedEntityType } from '@/ui/hooks/use-query-extended-entity-type';
import { DEFAULT_PAGE_NUMBER, WorkspaceScope, WorkspaceSection } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { MiniDetailView } from '@/ui/segments/mini-detail-view';
import { GenericError } from '@/ui/molecules/generic-error';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  coreActiveColumnsAtom,
  coreFiltersAtom,
  corePageNumberAtom,
  coreSortStateAtom,
} from '@/ui/segments/data-table/elements/context';
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
import type { TWorkspaceScope, TWorkspaceSection } from '@/constants';
import type { Props as MainTableProps } from '@/ui/segments/data-table';

const MainTable = dynamic(() => import('@/ui/segments/data-table'), { ssr: false }) as (
  props: MainTableProps<EntityCoreIdentifiableNamed>
) => ReactElement | null;

type Props = {
  id?: string;
  section?: TWorkspaceSection;
  requireBrainRegion?: boolean;
  requireMiniDetailView?: boolean;
  classNames?: {
    container?: ComponentProps<'div'>['className'];
    miniView?: ComponentProps<'div'>['className'];
  };
  scope?: TWorkspaceScope;
  defaultBrainRegion?: string;
  dataType: TExtendedEntitiesTypeDict;
  mainTableProps?: Partial<ComponentProps<typeof MainTable>>;
  miniViewProps?: Partial<ComponentProps<typeof MiniDetailView>>;
  allowDownload?: boolean;
  extraQueryParams?: Record<string, any>;
};

export function BrowseEntityScope({
  id,
  classNames,
  section = WorkspaceSection.Data,
  requireBrainRegion = true,
  requireMiniDetailView = true,
  defaultBrainRegion,
  dataType,
  scope: defaultScope,
  mainTableProps,
  miniViewProps,
  allowDownload,
  extraQueryParams,
}: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const { mdv, setMdv } = useMiniDetailView();
  const [scope] = useQueryState(
    'scope',
    parseAsString
      .withDefault(defaultScope ?? WorkspaceScope.Public)
      .withOptions({ shallow: true }) as NonNullable<Parser<TWorkspaceScope>>
  );

  const dataKey = compact([virtualLabId, projectId, section, dataType, scope, id]).join('/');
  const entity = getEntityByExtendedType({ type: dataType });
  const setPageNumber = useSetAtom(corePageNumberAtom(dataKey));

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
  const { data, error, isPlaceholderData, isFetching } = useQueryExtendedEntityType({
    context: {
      key: dataKey,
      workspaceScope: scope!,
      extendedEntityType: dataType as TExtendedEntitiesTypeDict,
    },
    workspace: { virtualLabId, projectId },
    queryFn: async ({ queryKey }) => {
      const [{ workspace, queryParameters }] = queryKey;
      const filters = { ...queryParameters, ...extraQueryParams };
      return entity?.api?.query.list?.({
        withFacets: true,
        filters,
        context: workspace,
      });
    },
    requireBrainRegion,
    defaultBrainRegion,
    useKeepPreviousData: true,
    enabled: ({ queryKey }) => {
      const [{ queryParameters }] = queryKey;
      if (requireBrainRegion && !get(queryParameters, 'within_brain_region_brain_region_id', null))
        return false;
      return true;
    },
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
        id="data-table-container"
        data-testid="data-table-container"
        className={cn(
          'h-full max-h-[calc(100vh-11.8rem)] min-h-0 w-full min-w-0 overflow-hidden rounded-2xl [grid-area:body]',
          classNames?.container
        )}
      >
        <div id="main-listing-table-container" className={cn('h-full w-full')}>
          <MainTable
            showLoadingState
            allowDownload={allowDownload}
            sticky={{ offsetHeader: 75.5 }}
            isLoading={(isPlaceholderData || isFetching) && !(dataSource && dataSource.length > 0)}
            dataScope={scope!}
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
            {...mainTableProps}
          />
        </div>
      </div>
      {requireMiniDetailView && (
        <div
          id="mini-detail-view-container"
          className={cn(
            'h-full max-h-[calc(100vh-11.8rem)] w-full min-w-0',
            '[grid-area:mini-view]',
            {
              hidden: !mdv,
            },
            classNames?.miniView
          )}
        >
          <MiniDetailView {...miniViewProps} dataType={dataType} />
        </div>
      )}
    </>
  );
}
