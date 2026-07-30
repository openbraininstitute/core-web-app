'use client';

import { WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { dataBrowseListingUsesBrainRegionHierarchy } from '@/api/entitycore/types/extended-entity-type';
import { BrainRegionDirection } from '@/api/entitycore/types/shared/request';
import { ApiError } from '@/api/error';
import { DEFAULT_PAGE_SIZE, WorkspaceSection } from '@/constants';
import { mergeOrderByWithOverride } from '@/entity-configuration/definitions/types';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
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
import { buildCellRenderers } from '@/features/data-grid/bindings/entitycore/cell-renderers';
import { createEntitycorePagedDataSource } from '@/features/data-grid/bindings/entitycore/data-source.paged';
import { createDefaultOperatorRegistry, GridController } from '@/features/data-grid/core';
import { GridSearch } from '@/features/data-grid/host/grid-search';
import { createDefaultPersistence, DataGrid } from '@/features/data-grid/react';
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
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';
import { getWorkspaceScopeFilters } from '@/utils/workspace-scope';

import type { FC, ReactNode } from 'react';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { AnyEntityGridDefinition } from '@/features/data-grid/bindings/entitycore';
import type { Facets, GridDataSource } from '@/features/data-grid/core';
import type {
  DataGridToolbarSlots,
  DetailRuntime,
  ExpandColumnConfig,
} from '@/features/data-grid/react';
import type { BrowseEntityScopeProps } from '@/features/views/listing/browse-entity-legacy';

export interface BrowseEntityGridProps extends BrowseEntityScopeProps {
  definition: AnyEntityGridDefinition;
}

/**
 * Strategy overrides accepted by {@link EntityDataGrid} (Template Method). Each
 * defaults to the current shared behavior, so an `EntityDataGrid` rendered with NO
 * overrides is byte-for-byte equivalent to the pre-refactor grid. Custom entity
 * bodies (registered via `definition.plugin`) supply overrides to specialize the
 * shared template without leaking entity specifics into it. Row callbacks are typed
 * to the host's `EntityCoreIdentifiableNamed` row; plugins narrow via a cast (same
 * pattern the host already uses for `expandRow`).
 */
export interface EntityDataGridOverrides {
  /** replaces the default entitycore paged data source (e.g. a view-aware source). */
  dataSourceOverride?: GridDataSource<EntityCoreIdentifiableNamed>;
  /** merged into the request params → part of the query key, so changes refetch. */
  extraParams?: Record<string, unknown>;
  /** merged into the toolbar slots (e.g. a view toggle). */
  extraToolbarSlots?: Partial<DataGridToolbarSlots>;
  /** per-row css class hook (e.g. hierarchy gray-out). */
  getRowClass?: (row: EntityCoreIdentifiableNamed) => string | undefined;
  /** replaces the schema-derived detail runtime (e.g. a recursive detail). */
  detailOverride?: DetailRuntime<EntityCoreIdentifiableNamed>;
  /** places the expand control inside a data column instead of a leading column. */
  expandColumn?: ExpandColumnConfig;
  /** extra AND-ed enable gate on top of the shared species/scope gate. */
  extraEnabled?: boolean;
}

export type EntityDataGridProps = BrowseEntityGridProps & EntityDataGridOverrides;

/**
 * The reusable TEMPLATE body behind the AG Grid listing. Owns all SHARED workspace
 * integration — brain-region/species gating + reset, scope/params, `MiniDetailView`,
 * download/delete bulk actions, error UX, toolbar assembly, and the `<DataGrid>`
 * render — and hands the API-agnostic grid its request params + `enabled` gate.
 * Columns, filters, sort and paging live in the entity's authored `GridSchema`.
 *
 * Accepts optional {@link EntityDataGridOverrides}, all defaulting to today's
 * behavior, so with no overrides it is byte-for-byte equivalent to the previous
 * grid (every already-flipped entity is untouched). A custom-entity plugin body
 * wraps this with its own state + overrides; see {@link BrowseEntityGrid}.
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
  // strategy overrides (all optional; defaults preserve current behavior)
  dataSourceOverride,
  extraParams,
  extraToolbarSlots,
  getRowClass,
  detailOverride,
  expandColumn,
  extraEnabled,
}: EntityDataGridProps) {
  const { virtualLabId, projectId } = useWorkspace();
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

  const operators = useMemo(() => createDefaultOperatorRegistry(), []);
  const cellRenderers = useMemo(() => buildCellRenderers(definition), [definition]);

  const handleRowClick = useCallback(
    (row: EntityCoreIdentifiableNamed) => makeSelectEntityClickEvent({ display: true, data: row }),
    []
  );

  const speciesKey = isAllSpeciesMode ? 'all' : workspaceSpecies?.hierarchId;
  const controller = useMemo(
    () =>
      new GridController<EntityCoreIdentifiableNamed>({
        schema: definition.schema,
        context: { dataType, section, scope, species: speciesKey },
        instanceKey: dataKey,
        persistence: createDefaultPersistence(),
        defaultPageSize: DEFAULT_PAGE_SIZE,
      }),
    [definition, dataKey, dataType, section, scope, speciesKey]
  );
  useEffect(() => () => controller.dispose(), [controller]);

  const handleSearch = useCallback(
    (text: string) => controller.store.dispatch({ type: 'setQuickFilter', text }),
    [controller]
  );

  const extraOrderBy = extraQueryParams?.order_by;
  const defaultDataSource = useMemo(
    () =>
      createEntitycorePagedDataSource<EntityCoreIdentifiableNamed>({
        dataType,
        schema: definition.schema,
        context: { virtualLabId, projectId },
        listQueryFn,
        // when a loader-scoped facets override exists, facets come from it instead
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
  // A plugin may swap the data source entirely (e.g. circuit's view-aware source);
  // default is the shared entitycore paged source above.
  const dataSource = dataSourceOverride ?? defaultDataSource;

  // Parity with the legacy listing: reset grid state when the species identity
  // (`all` vs a hierarchy id) changes — but not on the initial mount, so a
  // persisted snapshot survives navigation.
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
      // plugin-supplied params (e.g. `__view`) participate in the query key so
      // changing them refetches; merged last so a plugin can override.
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

  // External facets. When a loader-scoped `facetsQueryFn` override is present the
  // data source runs with `withFacets: false` (facets are NOT in the list response),
  // so set/facet filters would otherwise show "No options". Mirror the legacy
  // listing by fetching facets separately and handing them to `<DataGrid facets>`.
  // Same request scope the grid uses (brain-region + scope + extra params, minus the
  // grid's own column filters — parity with `useQueryExtendedEntityTypeFacets`);
  // `order_by` is irrelevant to facet buckets so it stays out of `params`.
  const facetsQuery = useQuery({
    queryKey: ['data-grid', 'facets', dataType, dataKey, params],
    queryFn: () => facetsQueryFn?.({ filters: params, context: { virtualLabId, projectId } }),
    enabled: enabled && Boolean(facetsQueryFn),
  });
  // Only override when a `facetsQueryFn` exists; otherwise facets keep coming from
  // the list response and this stays `undefined` (unchanged behavior).
  const externalFacets = facetsQueryFn ? (facetsQuery.data as Facets | undefined) : undefined;

  const schemaDetail = useMemo<DetailRuntime<EntityCoreIdentifiableNamed> | undefined>(() => {
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
  // A plugin may supply a bespoke detail runtime (e.g. circuit's recursive
  // subcircuit grid); default is the schema-derived detail above.
  const detail = detailOverride ?? schemaDetail;

  const toolbarLeft = useMemo<ReactNode>(() => {
    if (!requireScopeSelector && !requireSpeciesSelector) return undefined;
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {requireScopeSelector ? <WorkflowScopeTabs className="max-w-max" /> : null}
        {requireSpeciesSelector ? (
          <PortalRegionBanner
            dataKey={dataKey}
            className={cn('w-110', classNames?.filterClassNames?.speciesSelector)}
          />
        ) : null}
      </div>
    );
  }, [requireScopeSelector, requireSpeciesSelector, dataKey, classNames?.filterClassNames]);

  return (
    <>
      <div
        id={`data-table-container-${dataType}`}
        data-testid="data-table-container"
        className={cn(
          'h-full max-h-[calc(100vh-10.8rem)] min-h-0 w-full min-w-0 overflow-hidden rounded-2xl [grid-area:body]',
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
          getRowClass={getRowClass}
          expandColumn={expandColumn}
          className="h-full"
          gridClassName={classNames?.tableClassNames?.container}
          onRowClick={handleRowClick}
          activeRowId={activeRowId}
          toolbarSlots={{
            left: toolbarLeft,
            search: allowSearch ? <GridSearch onSearch={handleSearch} openOnMount /> : undefined,
            right: requireEntityTypeSelector?.enabled ? (
              <EntityTypeSelector
                options={requireEntityTypeSelector.options}
                value={requireEntityTypeSelector.value}
                onSelect={requireEntityTypeSelector.onSelect}
              />
            ) : undefined,
            // plugin-contributed slots (e.g. the circuit view toggle) are merged
            // last so a plugin can add without disturbing the shared controls.
            ...extraToolbarSlots,
          }}
          renderBulkActions={({ selectedRows, clearSelection }) => (
            // Buttons only — the "N selected" count + Clear live in the footer. Sized
            // to the search-bar pill (h-10, compact) while keeping their own colors.
            <div className="flex items-center gap-2">
              {allowDownload && (
                <EntityDownloadButton<EntityCoreIdentifiableNamed>
                  selectedRows={selectedRows}
                  dataType={dataType}
                  clearSelectedRows={clearSelection}
                  workspace={{ virtualLabId, projectId }}
                  className="h-10 min-w-0 px-4 text-sm shadow-sm"
                />
              )}
              {allowDelete && (
                <EntityDeleteButton<EntityCoreIdentifiableNamed>
                  selectedRows={selectedRows}
                  dataType={dataType}
                  clearSelectedRows={clearSelection}
                  workspace={{ virtualLabId, projectId }}
                  className="h-10 min-w-0 px-4 text-sm shadow-sm"
                />
              )}
            </div>
          )}
          renderCount={({ total, loading }) => (
            <span className="text-xs text-gray-600">
              {loading ? 'Loading…' : `${total.toLocaleString()} results`}
            </span>
          )}
          renderError={(error) => renderListingError(error, entity?.title)}
        />
      </div>
      {requireMiniDetailView && (
        <div
          id="mini-detail-view-container"
          className={cn(
            'h-full max-h-[calc(100vh-10.8rem)] w-full min-w-0',
            '[grid-area:mini-view]',
            { hidden: !mdv },
            classNames?.miniView
          )}
        >
          <MiniDetailView section={section} {...miniViewProps} dataType={dataType} />
        </div>
      )}
      <DownloadPanel />
    </>
  );
}

/**
 * Router (registry-driven Strategy): renders the entity's PLUGIN body when its
 * definition registers one, else the shared {@link EntityDataGrid} template. The
 * component type is selected by the STABLE `definition.plugin` (fixed per dataType),
 * so there is no rules-of-hooks hazard and entities stay independent. A plugin body
 * (e.g. `CircuitGridBody`) owns its own state and wraps `EntityDataGrid` with
 * strategy overrides. This is the AG Grid replacement for `BrowseEntityScopeLegacy`.
 */
export function BrowseEntityGrid(props: BrowseEntityGridProps) {
  const Body: FC<BrowseEntityGridProps> = props.definition.plugin?.Body ?? EntityDataGrid;
  return <Body {...props} />;
}

/** Same error UX as the legacy listing, including the NOT_AUTHORIZED case. */
function renderListingError(error: unknown, entityTitle?: string): ReactNode {
  log('error', error);
  let content: ReactNode = `An error occurred while fetching "${entityTitle ?? 'entities'}" data for this region. We are sorry about the inconvenience. Please contact support.`;
  let shouldContactSupport = true;

  if (error instanceof ApiError && error.cause?.code === 'NOT_AUTHORIZED') {
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
