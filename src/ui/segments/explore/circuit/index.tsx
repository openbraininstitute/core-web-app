/* eslint-disable react/jsx-props-no-spreading */

'use client';

import { parseAsString, SingleParserBuilder, useQueryStates } from 'nuqs';
import { ReactNode, useEffect, type ComponentProps } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { WarningOutlined } from '@ant-design/icons';
import { compact, get } from 'es-toolkit/compat';
import { RESET } from 'jotai/utils';
import dynamic from 'next/dynamic';

import { RecursiveExpandableTable } from '@/ui/segments/explore/circuit/elements/recursive-expandable-table';
import { createExpandableTableConfig } from '@/ui/segments/explore/circuit/elements/expandable-base-table';
import { CircuitView, ICircuitEnriched, TCircuitView } from '@/ui/segments/explore/circuit/helpers';
import { useExpandableTable } from '@/ui/segments/explore/circuit/elements/use-expandable-table';
import { useFilterStateWatcher } from '@/ui/segments/explore/circuit/use-filter-state-watcher';
import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { useQueryExtendedEntityType } from '@/ui/hooks/use-query-extended-entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';
import { DEFAULT_PAGE_NUMBER, WorkspaceScope, WorkspaceSection } from '@/constants';
import { expandIcon } from '@/ui/segments/explore/circuit/elements/expand-icon';
import { useHierarchy } from '@/ui/segments/explore/circuit/use-hierarchy';
import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import { Circuit } from '@/entity-configuration/domain/model/circuit';
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
import type { Facets, Pagination } from '@/api/entitycore/types/shared/response';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TWorkspaceScope, TWorkspaceSection } from '@/constants';

const CircuitTable = dynamic(() => import('@/ui/segments/explore/circuit/table'), { ssr: false });

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
  mainTableProps?: Partial<ComponentProps<typeof CircuitTable>>;
  miniViewProps?: Partial<ComponentProps<typeof MiniDetailView>>;
  extraQueryParams?: Record<string, any>;
};

export function BrowseCircuit({
  id,
  classNames,
  section = WorkspaceSection.Data,
  requireBrainRegion = true,
  defaultBrainRegion,
  dataType,
  scope: defaultScope,
  mainTableProps,
  miniViewProps,
  extraQueryParams,
}: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const { mdv, setMdv } = useMiniDetailView();
  const [{ scope, view }] = useQueryStates({
    view: parseAsString
      .withDefault(CircuitView.Hierarchy)
      .withOptions({ shallow: true, clearOnDefault: false }) as NonNullable<
      SingleParserBuilder<TCircuitView>
    >,
    scope: parseAsString
      .withDefault(defaultScope ?? WorkspaceScope.Public)
      .withOptions({ shallow: true, clearOnDefault: false }) as NonNullable<
      SingleParserBuilder<TWorkspaceScope>
    >,
  });

  const dataKey = compact([virtualLabId, projectId, section, dataType, scope, view, id]).join('/');
  const resetFilterOnExit = useSetAtom(coreFiltersAtom({ dataType, key: dataKey }));
  const activeColumns = useAtomValue(coreActiveColumnsAtom({ dataType, key: dataKey }));
  const setPageNumber = useSetAtom(corePageNumberAtom(dataKey));
  const [sortState, setSortState] = useAtom(coreSortStateAtom({ key: dataKey }));

  const onSortChange = (newSortState: any) => {
    setPageNumber(DEFAULT_PAGE_NUMBER);
    setSortState(newSortState);
  };

  const allColumns = useDataTableColumns<ICircuit>({
    dataType,
    sortState,
    setSortState: onSortChange,
  });

  const columns = allColumns.filter(({ key }) => (activeColumns || []).includes(key as string));

  const {
    queryKeyHash,
    isLoading: loadingHierarchy,
    dataSource: hierarchyDataSource,
    facets: hierarchyFacets,
    pagination: hierarchyPagination,
  } = useHierarchy({
    scope,
    dataKey,
    view,
  });

  const {
    data,
    error,
    isPlaceholderData,
    isFetching,
    isLoading,
    queryKeyHash: defaultQueryHash,
  } = useQueryExtendedEntityType({
    context: {
      key: dataKey,
      workspaceScope: scope!,
      extendedEntityType: ExtendedEntitiesTypeDict.Circuit,
    },
    workspace: { virtualLabId, projectId },
    queryFn: async ({ queryKey }) => {
      const [{ workspace, queryParameters }] = queryKey;
      return await Circuit.api.query.list?.({
        withFacets: true,
        filters: { ...queryParameters, ...extraQueryParams },
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

  let dataSource: Array<ICircuit> = [];

  let facets: Facets | undefined;
  let pagination: Pagination | undefined;

  if (view === CircuitView.Flat) {
    dataSource = data?.data ?? [];
    facets = data?.facets;
    pagination = data?.pagination;
  } else if (view === CircuitView.Hierarchy) {
    dataSource = hierarchyDataSource;
    pagination = hierarchyPagination;
    facets = hierarchyFacets;
  }

  const onCellClick = (_: string, record: EntityCoreIdentifiableNamed) => {
    makeSelectEntityClickEvent({
      display: true,
      data: record,
    });
  };

  useSelectEntityClickEvent((event) => {
    setMdv(event.detail.display);
  });

  const nestedTableColumns = allColumns.filter(({ key }) =>
    (activeColumns || []).includes(key as string)
  );

  const expandableOptions = createExpandableTableConfig<ICircuit | ICircuitEnriched>({
    data: ((record: ICircuit | ICircuitEnriched) => {
      const enrichedRecord = record as ICircuitEnriched;

      if (enrichedRecord?.sub_circuits && enrichedRecord?.sub_circuits.length > 0) {
        return enrichedRecord.sub_circuits;
      }
      return [];
    }) as any,
    getRowKey: (record) => record.id,
    isRowExpandable: (record) => {
      const enrichedRecord = record as ICircuitEnriched;
      return Boolean(enrichedRecord.sub_circuits && enrichedRecord.sub_circuits.length > 0);
    },
    expandedColumns: nestedTableColumns,
    expandedTableProps: {
      dataType,
    },
    renderWrapper: (_: ReactNode, records: Array<ICircuit>) => {
      return (
        <div className="my-5 flex flex-col items-start gap-5">
          <div className="ml-7 flex flex-row items-center gap-2">
            <ArrowReturnRight className="text-neutral-3 text-3xl" />
            <div className="text-neutral-3 text-lg font-semibold uppercase">subcircuits</div>
          </div>
          <div className="w-full">
            <div className="ml-4">
              <RecursiveExpandableTable
                key={queryKeyHash}
                id={queryKeyHash}
                circuits={records as Array<ICircuitEnriched>}
                columns={nestedTableColumns}
                dataType={dataType}
                dataScope={scope}
                workspace={{ virtualLabId, projectId }}
                onCellClick={onCellClick}
                view={view}
                level={1}
              />
            </div>
          </div>
        </div>
      );
    },
    expandIconColumnIndex: 3,
    expandIcon,
  });

  const { expandableConfig } = useExpandableTable<ICircuit>({
    ...expandableOptions,
    isNested: false,
  });

  useFilterStateWatcher({ dataType, dataKey });

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
    An error occurred while fetching circuit entities data for this region.
    We are sorry about the inconvenience. Please contact support
    `}
        icon={<WarningOutlined className="fill-current [font-size:inherit]" />}
      />
    );
  }

  return (
    <>
      <div
        id="circuit-table-container"
        data-testid="circuit-table-container"
        className={cn(
          'h-full max-h-[calc(100vh-11.8rem)] min-h-0 w-full min-w-0 overflow-hidden rounded-2xl [grid-area:body]',
          classNames?.container
        )}
      >
        <div id="circuit-listing-table-container" className={cn('h-full w-full')}>
          <CircuitTable
            showLoadingState
            sticky={{ offsetHeader: 75.5 }}
            isLoading={
              // eslint-disable-next-line no-nested-ternary
              view === CircuitView.Hierarchy
                ? loadingHierarchy
                : isPlaceholderData
                  ? isFetching
                  : isLoading
            }
            dataScope={scope!}
            dataSource={dataSource ?? []}
            dataType={dataType}
            workspace={{ virtualLabId, projectId }}
            dataKey={dataKey}
            columns={columns}
            facets={facets}
            onCellClick={onCellClick}
            resultPagination={{
              pagination: pagination!,
              totalData: dataSource?.length,
            }}
            cls={{
              table: cn(
                '[&_.ant-table]:bg-background! [&_.ant-table-header_th]:bg-background!',
                '[&_.ant-table-placeholder]:bg-background! [&_.ant-table-tbody_tr.ant-table-placeholder]:bg-background!'
              ),
            }}
            {...mainTableProps}
            view={view}
            queryKeyHash={view === CircuitView.Hierarchy ? queryKeyHash : defaultQueryHash}
            expandableConfig={expandableConfig}
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
          },
          classNames?.miniView
        )}
      >
        <MiniDetailView {...miniViewProps} dataType={dataType} />
      </div>
      <DownloadPanel />
    </>
  );
}
