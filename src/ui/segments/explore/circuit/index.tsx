'use client';

import { WarningOutlined } from '@ant-design/icons';
import { get } from 'es-toolkit/compat';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { RESET } from 'jotai/utils';
import dynamic from 'next/dynamic';
import { type ComponentProps, type ReactNode, useEffect, useRef } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import ApiError from '@/api/error';
import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import { DEFAULT_PAGE_NUMBER, WorkspaceSection } from '@/constants';
import { Circuit } from '@/entity-configuration/domain/model/circuit';
import {
  speciesSelectionModeAtom,
  workspaceHierarchySpeciesAtom,
} from '@/features/brain-region-hierarchy/context';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import {
  useQueryExtendedEntityType,
  useQueryExtendedEntityTypeFacets,
  useQueryParameters,
} from '@/ui/hooks/use-query-extended-entity-type';
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
import { expandIcon } from '@/ui/segments/explore/circuit/elements/expand-icon';
import { createExpandableTableConfig } from '@/ui/segments/explore/circuit/elements/expandable-base-table';
import { RecursiveExpandableTable } from '@/ui/segments/explore/circuit/elements/recursive-expandable-table';
import { useExpandableTable } from '@/ui/segments/explore/circuit/elements/use-expandable-table';
import {
  CircuitRepresentationView,
  circuitRepresentationViewAtom,
  type ICircuitEnriched,
} from '@/ui/segments/explore/circuit/helpers';
import { useFilterStateWatcher } from '@/ui/segments/explore/circuit/use-filter-state-watcher';
import { useHierarchy } from '@/ui/segments/explore/circuit/use-hierarchy';
import { MiniDetailView } from '@/ui/segments/mini-detail-view';
import {
  makeSelectEntityClickEvent,
  useMiniDetailView,
  useSelectEntityClickEvent,
} from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';
import { getWorkspaceScopeFilters } from '@/utils/workspace-scope';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { Pagination, TFacets } from '@/api/entitycore/types/shared/response';
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
  const view = useAtomValue(circuitRepresentationViewAtom);
  const { scope } = useScope({ defaultScope, clearOnDefault: false });

  const { dataKey } = makeDataKey({
    virtualLabId,
    projectId,
    section,
    dataType,
    scope,
    id,
  });
  const resetFilterOnExit = useSetAtom(coreFiltersAtom({ dataType, key: dataKey }));
  const activeColumns = useAtomValue(coreActiveColumnsAtom({ dataType, key: dataKey }));
  const setPageNumber = useSetAtom(corePageNumberAtom(dataKey));
  const [sortState, setSortState] = useAtom(coreSortStateAtom({ key: dataKey }));

  const speciesSelectionMode = useAtomValue(speciesSelectionModeAtom);
  const workspaceSpecies = useAtomValue(workspaceHierarchySpeciesAtom);
  const isAllSpeciesMode = speciesSelectionMode === SpeciesSelectionMode.All;

  // track stable species identity (`all` vs hierarchy id).
  // used to detect user-driven species/mode
  // changes without resetting listing state on the initial mount (after snapshot restore)
  const prevSpeciesKeyRef = useRef<string | undefined>(undefined);

  const {
    sync: runStorageSync,
    restore: runStorageRestore,
    reset: resetDataListState,
  } = useDataListStateSnapshotActions({
    dataKey,
    dataType,
    section,
  });

  // when species or "all species" mode changes, reset table filters/search/sort/page for this listing
  // skips while `workspaceSpecies` is briefly null during a focused-mode hierarchy switch
  useEffect(() => {
    const speciesKey =
      speciesSelectionMode === SpeciesSelectionMode.All
        ? SpeciesSelectionMode.All
        : workspaceSpecies?.hierarchId
          ? workspaceSpecies.hierarchId
          : undefined;

    if (speciesKey === undefined) return;

    if (prevSpeciesKeyRef.current === undefined) {
      prevSpeciesKeyRef.current = speciesKey;
      return;
    }
    if (prevSpeciesKeyRef.current === speciesKey) return;

    prevSpeciesKeyRef.current = speciesKey;
    resetDataListState();
  }, [speciesSelectionMode, workspaceSpecies?.hierarchId, resetDataListState]);

  const onSortChange = (newSortState: any) => {
    setPageNumber(DEFAULT_PAGE_NUMBER);
    setSortState(newSortState);
    runStorageSync({ Sort: newSortState, Page: DEFAULT_PAGE_NUMBER });
  };

  // Disable column sorting in hierarchy view: row order is determined by the derivation tree
  // structure, not by a sortable field. Omitting sortState/setSortState hides sort arrows and
  // prevents sort clicks from triggering unnecessary API refetches.
  const isHierarchyView = view === CircuitRepresentationView.Hierarchy;
  const allColumns = useDataTableColumns<ICircuit>({
    dataType,
    sortState: isHierarchyView ? undefined : sortState,
    setSortState: isHierarchyView ? undefined : onSortChange,
  });
  const columns = allColumns.filter(({ key }) => (activeColumns || []).includes(key as string));

  useEffect(() => {
    // allow restoring the data table state snapshot when the section is "Data" only.
    if (section === WorkspaceSection.Data) {
      runStorageRestore();
    }
  }, [section, runStorageRestore]);

  const {
    queryKeyHash,
    isLoading: loadingHierarchy,
    dataSource: hierarchyDataSource,
    pagination: hierarchyPagination,
  } = useHierarchy({
    scope,
    dataKey,
    view,
  });
  const scopeFilter = getWorkspaceScopeFilters(scope, {
    virtualLabId,
    projectId,
  });

  const queryParameters = useQueryParameters(
    {
      context: {
        key: dataKey,
        workspaceScope: scope,
        extendedEntityType: dataType as TExtendedEntitiesTypeDict,
      },
      workspace: { virtualLabId, projectId },
    },
    { requireBrainRegion, defaultBrainRegion }
  );

  const queryFilters = {
    ...queryParameters,
    ...extraQueryParams,
    ...scopeFilter,
  };
  const shouldUseBrainRegion =
    !isAllSpeciesMode &&
    requireBrainRegion &&
    !get(queryParameters, 'within_brain_region_brain_region_id', null);

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
    queryFn: async () => {
      return await Circuit.api.query.list?.({
        withFacets: false,
        filters: queryFilters,
        context: { virtualLabId, projectId },
      });
    },
    requireBrainRegion,
    defaultBrainRegion,
    useKeepPreviousData: true,
    extraQueryParams,
    enabled: () => !shouldUseBrainRegion,
  });

  const {
    data: facetsResults,
    error: facetsError,
    isPending: facetsLoading,
  } = useQueryExtendedEntityTypeFacets({
    dataKey,
    section,
    scope,
    dataType,
    workspace: { virtualLabId, projectId },
    queryFilters,
    extraQueryKey: { view },
    enabled: () => !shouldUseBrainRegion,
  });

  let dataSource: Array<ICircuit> = [];

  const facets: TFacets | undefined = facetsResults;
  let pagination: Pagination | undefined;

  if (view === CircuitRepresentationView.Flat) {
    dataSource = data?.data ?? [];
    pagination = data?.pagination;
  } else if (view === CircuitRepresentationView.Hierarchy) {
    dataSource = hierarchyDataSource;
    pagination = hierarchyPagination;
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
    let content: ReactNode = `An error occurred while fetching circuit entities data for this region. We are sorry about the inconvenience. Please contact support.`;
    let shouldContactSupport = true;

    if (error instanceof ApiError && error.cause?.code === 'NOT_AUTHORIZED') {
      shouldContactSupport = false;
      content = (
        <>
          You don&apos;t have permission to access{' '}
          <strong className="lowercase">circuit entities</strong> in this project.
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
        id="circuit-table-container"
        data-testid="circuit-table-container"
        className={cn(
          'h-full max-h-[calc(100vh-10.8rem)] min-h-0 w-full min-w-0 overflow-hidden rounded-2xl [grid-area:body]',
          classNames?.container
        )}
      >
        <div id="circuit-listing-table-container" className={cn('h-full w-full')}>
          <CircuitTable
            showLoadingState
            sticky={{ offsetHeader: 75.5 }}
            isLoading={
              // eslint-disable-next-line no-nested-ternary
              view === CircuitRepresentationView.Hierarchy
                ? loadingHierarchy
                : isPlaceholderData
                  ? isFetching
                  : isLoading
            }
            section={section}
            dataScope={scope!}
            dataSource={dataSource ?? []}
            dataType={dataType}
            workspace={{ virtualLabId, projectId }}
            dataKey={dataKey}
            columns={columns}
            facets={{
              data: facets,
              error: facetsError,
              loading: facetsLoading,
            }}
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
            queryKeyHash={
              view === CircuitRepresentationView.Hierarchy ? queryKeyHash : defaultQueryHash
            }
            expandableConfig={expandableConfig}
          />
        </div>
      </div>
      <div
        id="mini-detail-view-container"
        className={cn(
          'h-full max-h-[calc(100vh-10.8rem)] w-full min-w-0',
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
