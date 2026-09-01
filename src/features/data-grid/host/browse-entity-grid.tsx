'use client';

import { WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { dataBrowseListingUsesBrainRegionHierarchy } from '@/api/entitycore/types/extended-entity-type';
import { BrainRegionDirection } from '@/api/entitycore/types/shared/request';
import { isNotAuthorizedError } from '@/api/error';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { DEFAULT_PAGE_SIZE, FACETS_ONLY_PAGE, WorkspaceSection } from '@/constants';
import { mergeOrderByWithOverride } from '@/entity-configuration/definitions/types';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import {
  isEntitySelectableForWorkflow,
  isWorkflowPickerSection,
  workflowLifecycleRowClass,
} from '@/entity-configuration/domain/workflow-lifecycle-eligibility';
import { PortalRegionBanner } from '@/features/brain-region-hierarchy/components/region-banner';
import {
  speciesSelectionModeAtom,
  workspaceHierarchySpeciesAtom,
} from '@/features/brain-region-hierarchy/context';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
// NB: import these from their specific modules (NOT the entitycore barrel) — the
// barrel pulls in the registry, which statically imports the circuit plugin schema,
// whose body imports THIS host; going through the barrel would form a module-init
// cycle (the registry's definitions would see `undefined` for the circuit entry).
import { getCellRenderers } from '@/features/data-grid/bindings/entitycore/cell-renderers';
import { createEntitycorePagedDataSource } from '@/features/data-grid/bindings/entitycore/data-source.paged';
import {
  createDefaultOperatorRegistry,
  GridActionType,
  GridController,
  SelectionMode,
} from '@/features/data-grid/core';
import { GridSearch } from '@/features/data-grid/host/grid-search';
import { gridFilteredTotalAtom } from '@/features/data-grid/host/grid-total';
import {
  createDefaultPersistence,
  DataGrid,
  layoutKeyFor,
  useGridStateSlice,
} from '@/features/data-grid/react';
import { AgGridRenderer } from '@/features/data-grid/renderers/aggrid';
import { useScope } from '@/ui/hooks/use-scope';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { GenericError } from '@/ui/molecules/generic-error';
import { EntityDeleteButton } from '@/ui/segments/data-table/elements/delete-button';
import { EntityDownloadButton } from '@/ui/segments/data-table/elements/download-button';
import { EntityTypeSelector } from '@/ui/segments/data-table/elements/entity-selector';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';
import { DownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';
import { MiniDetailView } from '@/ui/segments/mini-detail-view';
import {
  makeSelectEntityClickEvent,
  useMiniDetailView,
  useSelectEntityClickEvent,
} from '@/ui/segments/mini-detail-view/event';
import { WorkflowScopeTabs } from '@/ui/segments/workflows/elements/scope-selector';
import { keyBuilder as workspaceKeyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';
import { getWorkspaceScopeFilters, isProjectPrivateRecord } from '@/utils/workspace-scope';

import type { FC, ReactNode } from 'react';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { TAnyEntityGridDefinition } from '@/features/data-grid/bindings/entitycore';
import type {
  IGridDataSource,
  IGridState,
  TFacets,
  TGridContextValue,
} from '@/features/data-grid/core';
import type {
  IDataGridSelection,
  IDataGridToolbarSlots,
  IDetailRuntime,
  IExpandColumnConfig,
} from '@/features/data-grid/react';
import type { BrowseEntityScopeProps } from '@/features/views/listing/browse-entity-legacy';

/** Module-level so the slice subscription's reader identity stays stable. */
const selectFreeTextSearch = (state: IGridState): string => state.freeTextSearch;

export interface IBrowseEntityGridProps extends BrowseEntityScopeProps {
  definition: TAnyEntityGridDefinition;
}

/**
 * Optional strategy overrides accepted by {@link EntityDataGrid}, supplied by custom
 * entity bodies (registered via `definition.plugin`) to specialize the shared
 * template. Row callbacks are typed to `EntityCoreIdentifiableNamed`; plugins narrow
 * via a cast.
 */
export interface IEntityDataGridOverrides {
  /** replaces the default entitycore paged data source (e.g. a view-aware source). */
  dataSourceOverride?: IGridDataSource<EntityCoreIdentifiableNamed>;
  /** merged into the request params → part of the query key, so changes refetch. */
  extraParams?: Record<string, unknown>;
  /** merged into the toolbar slots (e.g. a view toggle). */
  extraToolbarSlots?: Partial<IDataGridToolbarSlots>;
  /** per-row css class hook (e.g. hierarchy gray-out). */
  getRowClass?: (row: EntityCoreIdentifiableNamed) => string | undefined;
  /** replaces the schema-derived detail runtime (e.g. a recursive detail). */
  detailOverride?: IDetailRuntime<EntityCoreIdentifiableNamed>;
  /** places the expand control inside a data column instead of a leading column. */
  expandColumn?: IExpandColumnConfig;
  /** extra AND-ed enable gate on top of the shared species/scope gate. */
  extraEnabled?: boolean;
  /**
   * Extra host-defined factors merged into the controller's {@link IGridContext}, so a
   * schema can gate columns/filters on a plugin-only dimension. Memoise it: a new
   * object identity rebuilds the controller.
   */
  extraFactors?: Readonly<Record<string, TGridContextValue>>;
}

export type TEntityDataGridProps = IBrowseEntityGridProps & IEntityDataGridOverrides;

/**
 * The reusable template body behind the AG Grid listing. Owns the shared workspace
 * integration — brain-region/species gating + reset, scope/params, `MiniDetailView`,
 * bulk actions, error UX, toolbar assembly — and hands the grid its request params
 * and `enabled` gate. Columns, filters, sort and paging live in the entity's
 * `IGridSchema`; a plugin body wraps this with {@link IEntityDataGridOverrides}.
 */
export function EntityDataGrid({
  definition,
  id,
  classNames,
  section = WorkspaceSection.Data,
  requireBrainRegion: requireBrainRegionProp,
  requireMiniDetailView = true,
  defaultBrainRegion,
  dataType,
  scope: defaultScope,
  miniViewProps,
  mainTableProps,
  allowSearch = true,
  allowQuery = true,
  allowDownload,
  allowDelete,
  requireSpeciesSelector,
  requireScopeSelector,
  requireEntityTypeSelector,
  extraQueryParams,
  listQueryFn,
  facetsQueryFn,
  dataSourceOverride,
  extraParams,
  extraToolbarSlots,
  getRowClass,
  detailOverride,
  expandColumn,
  extraEnabled,
  extraFactors,
}: TEntityDataGridProps) {
  const { virtualLabId, projectId } = useWorkspace();
  const pathname = usePathname();
  const { scope } = useScope({ defaultScope, clearOnDefault: false });
  const { selectedBrainRegion } = useWorkspaceHierarchyRegistry();
  const speciesSelectionMode = useAtomValue(speciesSelectionModeAtom);
  const workspaceSpecies = useAtomValue(workspaceHierarchySpeciesAtom);
  const entity = getEntityByExtendedType({ type: dataType });

  const { mdv, setMdv } = useMiniDetailView();
  const [activeRowId, setActiveRowId] = useState<string | undefined>(undefined);
  useSelectEntityClickEvent<EntityCoreIdentifiableNamed>((event) => {
    setMdv(event.detail.display);
    setActiveRowId(event.detail.display ? (event.detail.data?.id ?? undefined) : undefined);
  });
  useEffect(() => {
    setMdv(false);
    return () => {
      makeSelectEntityClickEvent({ display: false, data: null });
      setMdv(false);
    };
  }, [setMdv]);

  const requireBrainRegion =
    requireBrainRegionProp ?? dataBrowseListingUsesBrainRegionHierarchy(dataType);
  const isAllSpeciesMode = speciesSelectionMode === SpeciesSelectionMode.All;
  const brainRegionId = defaultBrainRegion ?? selectedBrainRegion?.id;
  const hasBrainRegion = Boolean(brainRegionId);

  const { dataKey } = makeDataKey({ virtualLabId, projectId, section, dataType, scope, id });

  // Publish the grid's filtered total under this dataKey so the data sidebar's
  // "x of y" counters follow the grid's filters/search. Cleared on unmount so a
  // stale count never survives the listing it came from.
  const setGridTotal = useSetAtom(gridFilteredTotalAtom(dataKey));
  const handleTotalChange = useCallback(
    ({ total, loading }: { total: number; loading: boolean }) => {
      if (!loading) setGridTotal(total);
    },
    [setGridTotal]
  );
  useEffect(() => () => setGridTotal(undefined), [setGridTotal]);

  const operators = useMemo(() => createDefaultOperatorRegistry(), []);
  const cellRenderers = getCellRenderers(definition);

  // A picker supplying `onCellClick` navigates instead of opening the mini-detail panel.
  const onCellClick = mainTableProps?.onCellClick;
  const handleRowClick = useCallback(
    (row: EntityCoreIdentifiableNamed) => {
      if (onCellClick) {
        onCellClick(pathname, row, dataType);
        return;
      }
      makeSelectEntityClickEvent({ display: true, data: row });
    },
    [onCellClick, pathname, dataType]
  );

  // Picker selection is opt-in: only when `mainTableProps` supplies both a type and
  // an `onRowsSelected` callback. Otherwise selection stays schema-driven (bulk actions).
  const selectionType = mainTableProps?.selectionType;
  const onRowsSelected = mainTableProps?.onRowsSelected;
  const controlledSelectedRows = mainTableProps?.selectedRows;
  const applyLifecycleGating = isWorkflowPickerSection(section);
  const pickerSelection = useMemo<
    IDataGridSelection<EntityCoreIdentifiableNamed> | undefined
  >(() => {
    if (!selectionType || !onRowsSelected) return undefined;
    return {
      mode: selectionType === 'radio' ? SelectionMode.Single : SelectionMode.Multi,
      selectedRows: controlledSelectedRows,
      onChange: onRowsSelected,
      isRowSelectable: applyLifecycleGating ? isEntitySelectableForWorkflow : undefined,
    };
  }, [selectionType, onRowsSelected, controlledSelectedRows, applyLifecycleGating]);

  const composedGetRowClass = useCallback(
    (row: EntityCoreIdentifiableNamed) => {
      const pluginClass = getRowClass?.(row);
      const lifecycleClass = applyLifecycleGating ? workflowLifecycleRowClass(row) : undefined;
      return cn(pluginClass, lifecycleClass) || undefined;
    },
    [getRowClass, applyLifecycleGating]
  );
  const resolvedGetRowClass = getRowClass || applyLifecycleGating ? composedGetRowClass : undefined;

  const speciesKey = isAllSpeciesMode ? 'all' : workspaceSpecies?.hierarchId;
  const controller = useMemo(
    () =>
      new GridController<EntityCoreIdentifiableNamed>({
        schema: definition.schema,
        context: { dataType, section, scope, species: speciesKey, factors: extraFactors },
        instanceKey: dataKey,
        // The session slice is keyed by the full `dataKey`, but the layout slice by
        // section + entity type only, so a layout is shared across projects/scopes.
        persistence: createDefaultPersistence(layoutKeyFor(section, dataType)),
        defaultPageSize: DEFAULT_PAGE_SIZE,
      }),
    [definition, dataKey, dataType, section, scope, speciesKey, extraFactors]
  );
  useEffect(() => controller.connect(), [controller]);

  const handleSearch = useCallback(
    (text: string) => controller.store.dispatch({ type: GridActionType.SetFreeTextSearch, text }),
    [controller]
  );

  const freeTextSearch = useGridStateSlice(controller, selectFreeTextSearch);

  const extraOrderBy = extraQueryParams?.order_by;
  const defaultDataSource = useMemo(
    () =>
      createEntitycorePagedDataSource<EntityCoreIdentifiableNamed>({
        dataType,
        schema: definition.schema,
        context: { virtualLabId, projectId },
        listQueryFn,
        // when a loader-scoped facets override exists, facets come from it instead of
        // the source's own facets-only request
        withFacets: !facetsQueryFn,
        transformParams: extraOrderBy
          ? (params) => ({
              ...params,
              order_by: mergeOrderByWithOverride(extraOrderBy, params.order_by),
            })
          : undefined,
      }),
    [dataType, definition, virtualLabId, projectId, listQueryFn, facetsQueryFn, extraOrderBy]
  );
  const dataSource = dataSourceOverride ?? defaultDataSource;

  // Reset grid state when the species identity changes — but not on the initial
  // mount, so a persisted snapshot survives navigation.
  const prevSpeciesKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const speciesKey = isAllSpeciesMode
      ? SpeciesSelectionMode.All
      : (workspaceSpecies?.hierarchId ?? undefined);
    if (speciesKey === undefined) return;
    if (prevSpeciesKeyRef.current === undefined) {
      prevSpeciesKeyRef.current = speciesKey;
      return;
    }
    if (prevSpeciesKeyRef.current === speciesKey) return;
    prevSpeciesKeyRef.current = speciesKey;
    controller.resetState();
  }, [controller, isAllSpeciesMode, workspaceSpecies?.hierarchId]);

  const params = useMemo(() => {
    const brainRegionQuery =
      !isAllSpeciesMode && requireBrainRegion && hasBrainRegion
        ? {
            within_brain_region_brain_region_id: brainRegionId,
            within_brain_region_direction: BrainRegionDirection.ASCENDANTS_AND_DESCENDANTS,
          }
        : {};
    const { order_by: _orderByOverride, ...extras } = extraQueryParams ?? {};
    return {
      ...brainRegionQuery,
      ...extras,
      ...getWorkspaceScopeFilters(scope, { virtualLabId, projectId }),
      // Merged last so a plugin can override; these participate in the query key.
      ...extraParams,
    };
  }, [
    isAllSpeciesMode,
    requireBrainRegion,
    hasBrainRegion,
    brainRegionId,
    extraQueryParams,
    scope,
    virtualLabId,
    projectId,
    extraParams,
  ]);

  const enabled =
    allowQuery &&
    (isAllSpeciesMode || !requireBrainRegion || hasBrainRegion) &&
    (extraEnabled ?? true);

  // Per row, not per listing: a Combined listing mixes public and owned records.
  const resolveRowIsPrivate = useCallback(
    (record: EntityCoreObjectTypes) => isProjectPrivateRecord(record, projectId),
    [projectId]
  );

  // Gates `MiniDetailView`'s notebook delete and course-sync actions.
  const { data: virtualLabData } = useQuery({
    queryKey: workspaceKeyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab({ id: virtualLabId }),
    enabled: requireMiniDetailView && !!virtualLabId,
    staleTime: 1000 * 60 * 5,
  });

  // A loader-scoped override replaces the source's own facets-only request, so it has
  // to be fetched here or set filters show "No options". Same request scope as the
  // grid, minus the grid's own column filters.
  const facetsQuery = useQuery({
    queryKey: ['data-grid', 'facets', dataType, dataKey, params],
    queryFn: () =>
      facetsQueryFn?.({
        filters: { ...params, ...FACETS_ONLY_PAGE },
        context: { virtualLabId, projectId },
      }),
    enabled: enabled && Boolean(facetsQueryFn),
  });
  const externalFacets = facetsQueryFn ? (facetsQuery.data as TFacets | undefined) : undefined;

  const schemaDetail = useMemo<IDetailRuntime<EntityCoreIdentifiableNamed> | undefined>(() => {
    if (!definition.schema.detail || !definition.renderDetail) return undefined;
    const isExpandable = definition.schema.detail.isExpandable;
    return {
      provider: {
        canExpand: (row) => isExpandable?.(row) ?? true,
        fetch: entity?.api?.expandRow
          ? (row) =>
              // biome-ignore lint/suspicious/noExplicitAny: expandRow's param is an intersection of all entity types (same cast as the legacy listing)
              entity.api.expandRow?.(row as any, { virtualLabId, projectId }) ??
              Promise.resolve(null)
          : undefined,
      },
      render: definition.renderDetail,
    };
  }, [definition, entity, virtualLabId, projectId]);
  const detail = detailOverride ?? schemaDetail;

  // `compact` is the grid-scoped height opt-in: both pickers are taller than the
  // h-10 search pill elsewhere, and inside one toolbar row they must agree with it.
  const toolbarScope = useMemo<ReactNode>(
    () => (requireScopeSelector ? <WorkflowScopeTabs iconOnly className="max-w-max" /> : undefined),
    [requireScopeSelector]
  );
  const toolbarBrainRegion = useMemo<ReactNode>(
    () =>
      requireSpeciesSelector ? (
        <PortalRegionBanner
          compact
          dataKey={dataKey}
          className={cn('w-110', classNames?.filterClassNames?.speciesSelector)}
        />
      ) : undefined,
    [requireSpeciesSelector, dataKey, classNames?.filterClassNames]
  );

  return (
    <>
      <div
        id={`data-table-container-${dataType}`}
        data-testid="data-table-container"
        className={cn(
          'h-full min-h-0 w-full min-w-0 overflow-hidden rounded-2xl [grid-area:body]',
          classNames?.container
        )}
      >
        <DataGrid<EntityCoreIdentifiableNamed>
          controller={controller}
          dataSource={dataSource}
          renderer={AgGridRenderer}
          operators={operators}
          cellRenderers={cellRenderers}
          queryKey={['data-grid', dataType, dataKey]}
          params={params}
          enabled={enabled}
          facets={externalFacets}
          detail={detail}
          getRowClass={resolvedGetRowClass}
          expandColumn={expandColumn}
          className="h-full"
          gridClassName={classNames?.tableClassNames?.container}
          onRowClick={handleRowClick}
          activeRowId={activeRowId}
          selection={pickerSelection}
          toolbarSlots={{
            scope: toolbarScope,
            brainRegion: toolbarBrainRegion,
            entityType: requireEntityTypeSelector?.enabled ? (
              <EntityTypeSelector
                compact
                options={requireEntityTypeSelector.options}
                value={requireEntityTypeSelector.value}
                onSelect={requireEntityTypeSelector.onSelect}
              />
            ) : undefined,
            search: allowSearch ? (
              <GridSearch onSearch={handleSearch} openOnMount value={freeTextSearch} />
            ) : undefined,
            // Merged last so a plugin adds without disturbing the shared controls.
            ...extraToolbarSlots,
          }}
          renderBulkActions={({ selectedRows, clearSelection }) => (
            // Buttons only — the "N selected" count and Clear live in the footer.
            <div className="flex items-center gap-2">
              {allowDownload && (
                <EntityDownloadButton<EntityCoreIdentifiableNamed>
                  expanding
                  selectedRows={selectedRows}
                  dataType={dataType}
                  clearSelectedRows={clearSelection}
                  workspace={{ virtualLabId, projectId }}
                />
              )}
              {allowDelete && (
                <EntityDeleteButton<EntityCoreIdentifiableNamed>
                  expanding
                  selectedRows={selectedRows}
                  dataType={dataType}
                  clearSelectedRows={clearSelection}
                  workspace={{ virtualLabId, projectId }}
                />
              )}
            </div>
          )}
          renderCount={({ total, loading }) =>
            loading ? (
              <span
                role="status"
                aria-label="Loading results count"
                className="flex items-center gap-1.5"
              >
                <span className="inline-block h-4 w-8 animate-pulse rounded-full bg-gray-200" />
                <span className="inline-block h-4 w-14 animate-pulse rounded-full bg-gray-200" />
              </span>
            ) : (
              <span className="text-xs text-gray-600">{`${total.toLocaleString()} results`}</span>
            )
          }
          renderError={(error) => renderListingError(error, entity?.title)}
          onTotalChange={handleTotalChange}
          queryOptions={{
            refetchOnWindowFocus: false,
          }}
        />
      </div>
      {requireMiniDetailView && (
        <div
          id="mini-detail-view-container"
          className={cn(
            'h-full min-h-0 w-full min-w-0',
            '[grid-area:mini-view]',
            { hidden: !mdv },
            classNames?.miniView
          )}
        >
          <MiniDetailView
            section={section}
            dataType={dataType}
            isPrivate={resolveRowIsPrivate}
            virtualLabData={virtualLabData}
            {...miniViewProps}
          />
        </div>
      )}
      <DownloadPanel />
    </>
  );
}

/**
 * Renders the entity's plugin body when its definition registers one, else the shared
 * {@link EntityDataGrid} template. The component type is selected by stable per-mount
 * inputs, so there is no rules-of-hooks hazard.
 *
 * A plugin mounts only on the Data browse listing (section `data`, no picker
 * selection); workflow surfaces and pickers get the plain shared template.
 */
export function BrowseEntityGrid(props: IBrowseEntityGridProps) {
  const { plugin } = props.definition;
  const isExplore =
    (props.section ?? WorkspaceSection.Data) === WorkspaceSection.Data &&
    !props.mainTableProps?.selectionType;
  const Body: FC<IBrowseEntityGridProps> = plugin && isExplore ? plugin.Body : EntityDataGrid;
  return <Body {...props} />;
}

/** Listing-level error UX, with a dedicated NOT_AUTHORIZED message. */
function renderListingError(error: unknown, entityTitle?: string): ReactNode {
  log('error', error);
  let content: ReactNode = `An error occurred while fetching "${entityTitle ?? 'entities'}" data for this region. We are sorry about the inconvenience. Please contact support.`;
  let shouldContactSupport = true;

  if (isNotAuthorizedError(error)) {
    shouldContactSupport = false;
    content = (
      <>
        You don&apos;t have permission to access{' '}
        <strong className="lowercase">{`${entityTitle ?? 'these'} entities`}</strong> in this
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
