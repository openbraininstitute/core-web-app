'use client';

import { WarningOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';

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
import {
  buildCellRenderers,
  createEntitycorePagedDataSource,
} from '@/features/data-grid/bindings/entitycore';
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

import type { ReactNode } from 'react';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { AnyEntityGridDefinition } from '@/features/data-grid/bindings/entitycore';
import type { DetailRuntime } from '@/features/data-grid/react';
import type { BrowseEntityScopeProps } from '@/features/views/listing/browse-entity-legacy';

export interface BrowseEntityGridProps extends BrowseEntityScopeProps {
  definition: AnyEntityGridDefinition;
}

/**
 * The AG Grid replacement for `BrowseEntityScopeLegacy`, honoring the same Props
 * surface. Owns the workspace integration — brain-region/species gating, scope
 * filters, loader overrides, MiniDetailView, download panel — and hands the
 * API-agnostic `<DataGrid>` its request params + `enabled` gate. Columns, filters,
 * sort and paging live in the entity's authored `GridSchema`.
 */
export function BrowseEntityGrid({
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
}: BrowseEntityGridProps) {
  const { virtualLabId, projectId } = useWorkspace();
  const { scope } = useScope({ defaultScope, clearOnDefault: false });
  const { selectedBrainRegion } = useWorkspaceHierarchyRegistry();
  const speciesSelectionMode = useAtomValue(speciesSelectionModeAtom);
  const workspaceSpecies = useAtomValue(workspaceHierarchySpeciesAtom);
  const entity = getEntityByExtendedType({ type: dataType });

  const { mdv, setMdv } = useMiniDetailView();
  useSelectEntityClickEvent((event) => setMdv(event.detail.display));
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
  const dataSource = useMemo(
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
  ]);

  const enabled = allowQuery && (isAllSpeciesMode || !requireBrainRegion || hasBrainRegion);

  const detail = useMemo<DetailRuntime<EntityCoreIdentifiableNamed> | undefined>(() => {
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
          detail={detail}
          className="h-full"
          gridClassName={classNames?.tableClassNames?.container}
          onRowClick={handleRowClick}
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
          }}
          renderBulkActions={({ selectedIds, selectedRows, clearSelection }) => (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-primary-8">
                {selectedIds.length} selected
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                Clear
              </button>
              {allowDownload && (
                <EntityDownloadButton<EntityCoreIdentifiableNamed>
                  selectedRows={selectedRows}
                  dataType={dataType}
                  clearSelectedRows={clearSelection}
                  workspace={{ virtualLabId, projectId }}
                />
              )}
              {allowDelete && (
                <EntityDeleteButton<EntityCoreIdentifiableNamed>
                  selectedRows={selectedRows}
                  dataType={dataType}
                  clearSelectedRows={clearSelection}
                  workspace={{ virtualLabId, projectId }}
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
