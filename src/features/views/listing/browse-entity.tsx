'use client';

import { WarningOutlined } from '@ant-design/icons';
import { get, uniqBy } from 'es-toolkit/compat';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { RESET } from 'jotai/utils';
import dynamic from 'next/dynamic';
import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from 'react';

import { ApiError } from '@/api/error';
import { DEFAULT_PAGE_NUMBER, WorkspaceSection } from '@/constants';
import { listExpandedViewRegistry } from '@/entity-configuration/definitions/list-expanded-view-defs';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { useQueryExtendedEntityType } from '@/ui/hooks/use-query-extended-entity-type';
import { useScope } from '@/ui/hooks/use-scope';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { GenericError } from '@/ui/molecules/generic-error';
import {
  coreActiveColumnsAtom,
  coreFiltersAtom,
  corePageNumberAtom,
  coreSortStateAtom,
  useDataListStateSnapshotActions,
} from '@/ui/segments/data-table/elements/context';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';
import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { DownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';
import { MiniDetailView } from '@/ui/segments/mini-detail-view';
import {
  makeSelectEntityClickEvent,
  useMiniDetailView,
  useSelectEntityClickEvent,
} from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';
import { getWorkspaceScopeFilters } from '@/utils/workspace-scope';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  EntityCoreIdentifiable,
  EntityCoreIdentifiableNamed,
} from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TWorkspaceScope, TWorkspaceSection } from '@/constants';
import type { TSortState } from '@/entity-configuration/definitions/types';
import type { Props as MainTableProps } from '@/ui/segments/data-table';

const MainTable = dynamic(() => import('@/ui/segments/data-table'), {
  ssr: false,
}) as (props: MainTableProps<EntityCoreIdentifiableNamed>) => ReactElement | null;

type Props = {
  id?: string;
  section?: TWorkspaceSection;
  requireBrainRegion?: boolean;
  requireMiniDetailView?: boolean;
  classNames?: {
    container?: ComponentProps<'div'>['className'];
    miniView?: ComponentProps<'div'>['className'];
    filterClassNames?: {
      container?: string;
    };
  };
  scope?: TWorkspaceScope;
  defaultBrainRegion?: string;
  dataType: TExtendedEntitiesTypeDict;
  mainTableProps?: Partial<ComponentProps<typeof MainTable>>;
  miniViewProps?: Partial<ComponentProps<typeof MiniDetailView>>;
  allowDownload?: boolean;
  allowDelete?: boolean;
  requireBrainRegionDropdown?: boolean;
  extraQueryParams?: Record<string, unknown>;
  left?: ReactNode;
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
  allowDelete,
  requireBrainRegionDropdown,
  extraQueryParams,
  left,
}: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const { mdv, setMdv } = useMiniDetailView();
  const { scope } = useScope({ defaultScope, clearOnDefault: false });
  const scopeFilter = getWorkspaceScopeFilters(scope, { virtualLabId, projectId });
  const { dataKey } = makeDataKey({
    virtualLabId,
    projectId,
    section,
    dataType,
    scope,
    id,
  });
  const entity = getEntityByExtendedType({ type: dataType });
  const setPageNumber = useSetAtom(corePageNumberAtom(dataKey));
  const [sortState, setSortState] = useAtom(coreSortStateAtom({ key: dataKey }));
  const activeColumns = useAtomValue(coreActiveColumnsAtom({ dataType, key: dataKey }));

  const { sync: runStorageSync, restore: runStorageRestore } = useDataListStateSnapshotActions({
    dataKey,
    dataType,
    section,
  });

  const onSortChange = useCallback(
    (newSortState: TSortState) => {
      setPageNumber(DEFAULT_PAGE_NUMBER);
      setSortState(newSortState);
      runStorageSync({ Sort: newSortState, Page: DEFAULT_PAGE_NUMBER });
    },
    [setPageNumber, setSortState, runStorageSync]
  );

  const allColumns = useDataTableColumns<EntityCoreIdentifiableNamed>({
    dataType,
    sortState,
    setSortState: onSortChange,
  });
  const columns = uniqBy(
    allColumns.filter(({ key }) => (activeColumns || []).includes(key as string)),
    'key'
  );

  const expandableOptions = useMemo(() => {
    const expandedViewConfig = listExpandedViewRegistry[dataType];

    if (!entity?.api?.expandRow || !expandedViewConfig) return undefined;

    return {
      getRowKey: (record: EntityCoreIdentifiableNamed) => record.id,
      getFetchId: (record: EntityCoreIdentifiableNamed) => record.id,
      fetcher: (record: EntityCoreIdentifiable) =>
        entity.api.expandRow?.(record as any, {
          virtualLabId,
          projectId,
        }),
      renderExpanded: (
        records: EntityCoreIdentifiableNamed[],
        originalRecord: EntityCoreIdentifiableNamed
      ) => expandedViewConfig.render(originalRecord, records),
      expandIconColumnIndex: expandedViewConfig.expandIconColumnIndex,
      expandIcon: expandedViewConfig.expandIcon,
      isRowExpandable: expandedViewConfig.isExpandable,
      isTopLevel: true,
    };
  }, [dataType, virtualLabId, projectId, entity]);

  useEffect(() => {
    // allow restoring the data table state snapshot when the section is "Data" only.
    if (section === WorkspaceSection.Data) {
      runStorageRestore();
    }
  }, [section, runStorageRestore]);

  const { data, error, isFetching } = useQueryExtendedEntityType({
    context: {
      key: dataKey,
      workspaceScope: scope,
      extendedEntityType: dataType as TExtendedEntitiesTypeDict,
    },
    workspace: { virtualLabId, projectId },
    queryFn: async ({ queryKey }) => {
      const [{ workspace, queryParameters }] = queryKey;
      const filters = {
        ...queryParameters,
        ...extraQueryParams,
        ...scopeFilter,
      };
      return entity?.api?.query.list?.({
        filters,
        withFacets: true,
        context: workspace,
      });
    },
    requireBrainRegion,
    defaultBrainRegion,
    useKeepPreviousData: true,
    extraQueryParams,
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
    let content: ReactNode = `An error occurred while fetching "${entity?.title ?? 'entities'}" data for this region. We are sorry about the inconvenience. Please contact support.`;
    let shouldContactSupport = true;

    if (error instanceof ApiError && error.cause?.code === 'NOT_AUTHORIZED') {
      shouldContactSupport = false;
      content = (
        <>
          You don&apos;t have permission to access{' '}
          <strong className="lowercase">{`${entity?.title ?? 'these'} entities`}</strong> in this
          project.
          <div className="h-3" />
          <p className="text-xl font-light">
            Please check that you are a member of the virtual lab and project, or reach out to your
            project administrator to request access.
          </p>
        </>
      );
    }

    return (
      <GenericError
        shouldContactSupport={shouldContactSupport}
        content={content}
        icon={<WarningOutlined className="fill-current [font-size:inherit]" />}
        cls={{ content: 'max-w-3xl' }}
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
            allowDelete={allowDelete}
            requireBrainRegionDropdown={requireBrainRegionDropdown}
            sticky={{ offsetHeader: 75.5 }}
            isLoading={isFetching}
            dataScope={scope}
            section={section}
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
            filterClassNames={classNames?.filterClassNames}
            expandableOptions={expandableOptions}
            left={left}
          />
        </div>
      </div>
      {requireMiniDetailView && (
        <div
          id="mini-detail-view-container"
          className={cn(
            'h-full max-h-[calc(100vh-11.8rem)] w-full min-w-0',
            '[grid-area:mini-view]',
            { hidden: !mdv },
            classNames?.miniView
          )}
        >
          <MiniDetailView {...miniViewProps} dataType={dataType} />
        </div>
      )}
      <DownloadPanel />
    </>
  );
}
