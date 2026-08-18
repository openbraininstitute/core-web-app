'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';

import { WorkspaceSection } from '@/constants';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  CIRCUIT_VIEW_PARAM,
  createCircuitDataSource,
} from '@/features/data-grid/bindings/circuit/data-source';
import { getCellRenderers } from '@/features/data-grid/bindings/entitycore/cell-renderers';
import { Align } from '@/features/data-grid/core';
import { EntityDataGrid } from '@/features/data-grid/host/browse-entity-grid';
import { useScope } from '@/ui/hooks/use-scope';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';
import { circuitListingRowClass } from '@/ui/segments/explore/circuit/elements/circuit-listing-grid';
import {
  CircuitRecursiveGrid,
  SubcircuitsDetail,
} from '@/ui/segments/explore/circuit/elements/circuit-recursive-grid';
import { CircuitViewToggle } from '@/ui/segments/explore/circuit/elements/view-toggle';
import {
  CIRCUIT_VIEW_FACTOR,
  CircuitRepresentationView,
  circuitRepresentationViewAtom,
} from '@/ui/segments/explore/circuit/helpers';
import { makeSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { IGridDataSource } from '@/features/data-grid/core';
import type { IBrowseEntityGridProps } from '@/features/data-grid/host/browse-entity-grid';
import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { IDetailRuntime } from '@/features/data-grid/react';
import type { ICircuitEnriched } from '@/ui/segments/explore/circuit/helpers';

/** Subcircuits attached to an enriched hierarchy node, or `undefined`. */
function subCircuitsOf(row: EntityCoreIdentifiableNamed): ICircuitEnriched[] | undefined {
  const enriched = row as ICircuitEnriched;
  return enriched.sub_circuits && enriched.sub_circuits.length > 0
    ? enriched.sub_circuits
    : undefined;
}

/**
 * The circuit plugin body (registered on `circuitGridDefinition.plugin`). Owns the
 * flat↔hierarchy view atom and wraps the shared {@link EntityDataGrid} template with
 * circuit-only overrides: a view-aware data source, the view as an `extraParams` key
 * so toggling refetches, the view toggle slot, hierarchy row gray-out, and a
 * recursive detail rendering the row's already-fetched `sub_circuits`.
 */
export function CircuitGridBody(props: IBrowseEntityGridProps) {
  const { definition, dataType, section = WorkspaceSection.Data, id, scope: defaultScope } = props;
  const { virtualLabId, projectId } = useWorkspace();
  const queryClient = useQueryClient();
  const view = useAtomValue(circuitRepresentationViewAtom);
  const { scope } = useScope({ defaultScope, clearOnDefault: false });

  const { dataKey } = makeDataKey({ virtualLabId, projectId, section, dataType, scope, id });

  // Subcircuit expansion is hierarchy-only; in flat view the plugin withholds the
  // detail runtime and expand column, and EntityDataGrid renders no expander.
  const isHierarchy = view === CircuitRepresentationView.Hierarchy;

  const workspace = useMemo(() => ({ virtualLabId, projectId }), [virtualLabId, projectId]);
  const dataSource = useMemo(
    () =>
      createCircuitDataSource({
        schema: definition.schema,
        workspace,
        queryClient,
      }) as unknown as IGridDataSource<EntityCoreIdentifiableNamed>,
    [definition.schema, workspace, queryClient]
  );

  // The nested recursive grid reuses the parent's schema columns (ISimpleColumn
  // extends IColumnModel), keeping expanded rows column-identical to the parent.
  const schemaColumns = definition.schema.columns as unknown as ISimpleColumn<ICircuit>[];
  // Those columns name their renderers by key, so the nested grid needs the same
  // registry the top-level grid uses or its cells fall back to plain text.
  const cellRenderers = getCellRenderers(definition);

  const onCellClick = useCallback(
    (_: string, record: ICircuit) => makeSelectEntityClickEvent({ display: true, data: record }),
    []
  );

  const getRowClass = useCallback(
    (row: EntityCoreIdentifiableNamed) => circuitListingRowClass(row as ICircuit, view),
    [view]
  );

  const detailOverride = useMemo<IDetailRuntime<EntityCoreIdentifiableNamed>>(
    () => ({
      provider: {
        canExpand: (row) => Boolean(subCircuitsOf(row)),
        // No async fetch: subcircuits ride along on the hierarchy row.
      },
      render: ({ row, state }) => {
        const children = subCircuitsOf(row);
        if (!children) return null;
        // Thread the parent's hidden columns down so every depth stays consistent
        // with the chooser.
        const hidden = new Set(state?.hiddenColumns ?? []);
        const visibleColumns = schemaColumns.filter((c) => !hidden.has(c.id));
        return (
          <SubcircuitsDetail>
            <CircuitRecursiveGrid
              key={row.id}
              circuits={children}
              simpleColumns={visibleColumns}
              cellRenderers={cellRenderers}
              expandColumnId={EntityCoreFields.CircuitSubCircuit}
              dataType={dataType}
              onCellClick={onCellClick}
              rowClassName={(record) => circuitListingRowClass(record, view)}
              // the top server grid is level 0
              depth={1}
              parentId={row.id}
            />
          </SubcircuitsDetail>
        );
      },
    }),
    [schemaColumns, cellRenderers, dataType, onCellClick, view]
  );

  const toolbarSlots = useMemo(
    () => ({ left: <CircuitViewToggle dataKey={dataKey} /> }),
    [dataKey]
  );

  // Publish the view as a grid-context factor so the schema can gate hierarchy-only
  // columns. Only this plugin supplies it, so other mounts get the rule's default.
  const gridFactors = useMemo(() => ({ [CIRCUIT_VIEW_FACTOR]: view }), [view]);

  return (
    <EntityDataGrid
      {...props}
      allowDownload
      dataSourceOverride={dataSource}
      extraParams={{ [CIRCUIT_VIEW_PARAM]: view }}
      extraToolbarSlots={toolbarSlots}
      extraFactors={gridFactors}
      getRowClass={getRowClass}
      detailOverride={isHierarchy ? detailOverride : undefined}
      expandColumn={
        isHierarchy
          ? { columnId: EntityCoreFields.CircuitSubCircuit, align: Align.Right }
          : undefined
      }
    />
  );
}
