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
  CircuitRepresentationView,
  circuitRepresentationViewAtom,
} from '@/ui/segments/explore/circuit/helpers';
import { makeSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';

import { EntityDataGrid } from './browse-entity-grid';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { GridDataSource } from '@/features/data-grid/core';
import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { DetailRuntime } from '@/features/data-grid/react';
import type { ICircuitEnriched } from '@/ui/segments/explore/circuit/helpers';
import type { BrowseEntityGridProps } from './browse-entity-grid';

/** Subcircuits attached to an enriched hierarchy node, or `undefined`. */
function subCircuitsOf(row: EntityCoreIdentifiableNamed): ICircuitEnriched[] | undefined {
  const enriched = row as ICircuitEnriched;
  return enriched.sub_circuits && enriched.sub_circuits.length > 0
    ? enriched.sub_circuits
    : undefined;
}

/**
 * The circuit PLUGIN body (registered on `circuitGridDefinition.plugin`). Owns the
 * flat↔hierarchy view atom and wraps the shared {@link EntityDataGrid} template with
 * circuit-only strategy overrides:
 *
 * - `dataSourceOverride` — the view-aware source (flat delegates to the shared paged
 *   source; hierarchy runs the imperative 3-fetch tree build).
 * - `extraParams={{ __view }}` — makes the view part of the query key so toggling
 *   refetches through the same store-driven pipeline as a filter change.
 * - `extraToolbarSlots` — contributes the `CircuitViewToggle`.
 * - `getRowClass` — hierarchy gray-out (reusing `circuitListingRowClass`).
 * - `detailOverride` — a recursive detail that mounts `CircuitRecursiveGrid` for the
 *   row's `sub_circuits` (data already in hand; no per-level round-trip), threading
 *   the parent's hidden columns so nested levels stay column-consistent.
 * - `expandColumn` — hosts the chevron inside the Subcircuits column, right-aligned.
 *
 * All circuit specifics live here; the shared template stays circuit-agnostic.
 */
export function CircuitGridBody(props: BrowseEntityGridProps) {
  const { definition, dataType, section = WorkspaceSection.Data, id, scope: defaultScope } = props;
  const { virtualLabId, projectId } = useWorkspace();
  const queryClient = useQueryClient();
  const view = useAtomValue(circuitRepresentationViewAtom);
  const { scope } = useScope({ defaultScope, clearOnDefault: false });

  const { dataKey } = makeDataKey({ virtualLabId, projectId, section, dataType, scope, id });

  // Subcircuit expansion is a HIERARCHY-view concept only. In flat view the listing
  // is a plain server page (no tree, no expander) — so the plugin simply withholds
  // the detail runtime + expand column. Generic: EntityDataGrid renders an expander
  // iff a `detailOverride`/`expandColumn` is supplied; nothing circuit-specific leaks
  // into the shared host.
  const isHierarchy = view === CircuitRepresentationView.Hierarchy;

  const workspace = useMemo(() => ({ virtualLabId, projectId }), [virtualLabId, projectId]);
  const dataSource = useMemo(
    () =>
      createCircuitDataSource({
        schema: definition.schema,
        workspace,
        queryClient,
      }) as unknown as GridDataSource<EntityCoreIdentifiableNamed>,
    [definition.schema, workspace, queryClient]
  );

  // Columns for the NESTED recursive grid = the SAME schema columns the parent server
  // grid renders (SimpleColumn extends ColumnModel, so schema columns pass straight
  // through). This is what keeps the expanded subcircuit rows column-identical to the
  // parent — no separate antd column set.
  const schemaColumns = definition.schema.columns as unknown as SimpleColumn<ICircuit>[];

  const onCellClick = useCallback(
    (_: string, record: ICircuit) => makeSelectEntityClickEvent({ display: true, data: record }),
    []
  );

  const getRowClass = useCallback(
    (row: EntityCoreIdentifiableNamed) => circuitListingRowClass(row as ICircuit, view),
    [view]
  );

  const detailOverride = useMemo<DetailRuntime<EntityCoreIdentifiableNamed>>(
    () => ({
      provider: {
        canExpand: (row) => Boolean(subCircuitsOf(row)),
        // no async fetch: subcircuits ride along on the hierarchy row.
      },
      render: ({ row, state }) => {
        const children = subCircuitsOf(row);
        if (!children) return null;
        // Thread the parent's hidden columns onto the nested grid (by column id) so
        // every depth stays column-consistent with the chooser.
        const hidden = new Set(state?.hiddenColumns ?? []);
        const visibleColumns = schemaColumns.filter((c) => !hidden.has(c.id));
        return (
          <SubcircuitsDetail>
            <CircuitRecursiveGrid
              key={row.id}
              circuits={children}
              simpleColumns={visibleColumns}
              expandColumnId={EntityCoreFields.CircuitSubCircuit}
              dataType={dataType}
              onCellClick={onCellClick}
              rowClassName={(record) => circuitListingRowClass(record, view)}
              // top server grid is level 0; the first expanded subcircuit grid is level 1
              depth={1}
              parentId={row.id}
            />
          </SubcircuitsDetail>
        );
      },
    }),
    [schemaColumns, dataType, onCellClick, view]
  );

  const toolbarSlots = useMemo(
    () => ({ right: <CircuitViewToggle dataKey={dataKey} /> }),
    [dataKey]
  );

  return (
    <EntityDataGrid
      {...props}
      allowDownload
      dataSourceOverride={dataSource}
      extraParams={{ [CIRCUIT_VIEW_PARAM]: view }}
      extraToolbarSlots={toolbarSlots}
      getRowClass={getRowClass}
      detailOverride={isHierarchy ? detailOverride : undefined}
      expandColumn={
        isHierarchy ? { columnId: EntityCoreFields.CircuitSubCircuit, align: 'right' } : undefined
      }
    />
  );
}
