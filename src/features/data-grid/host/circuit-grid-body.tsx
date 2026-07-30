'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';

import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import ChevronRight from '@/components/icons/ChevronRight';
import { WorkspaceSection } from '@/constants';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  CIRCUIT_VIEW_PARAM,
  createCircuitDataSource,
} from '@/features/data-grid/bindings/circuit/data-source';
import { useScope } from '@/ui/hooks/use-scope';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';
import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { circuitListingRowClass } from '@/ui/segments/explore/circuit/elements/circuit-listing-grid';
import { CircuitRecursiveGrid } from '@/ui/segments/explore/circuit/elements/circuit-recursive-grid';
import { CircuitViewToggle } from '@/ui/segments/explore/circuit/elements/view-toggle';
import { circuitRepresentationViewAtom } from '@/ui/segments/explore/circuit/helpers';
import { makeSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { classNames } from '@/util/utils';

import { EntityDataGrid } from './browse-entity-grid';

import type { ColumnProps } from 'antd/es/table';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { GridDataSource } from '@/features/data-grid/core';
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

  // antd columns for the NESTED recursive grid (hierarchy: no sort — tree order fixed).
  const antdColumns = useDataTableColumns<ICircuit>({ dataType });

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
        // Thread the parent's hidden columns onto the nested grid (by antd key ===
        // schema column id) so every depth stays column-consistent with the chooser.
        const hidden = new Set(state?.hiddenColumns ?? []);
        const visibleColumns: ColumnProps<ICircuit>[] = antdColumns.filter(
          (c) => !hidden.has(String(c.key ?? ''))
        );
        return (
          <div className="my-5 flex flex-col items-start gap-5">
            <div className="ml-7 flex flex-row items-center gap-2">
              <ArrowReturnRight className="text-neutral-3 text-3xl" />
              <div className="text-neutral-3 text-lg font-semibold uppercase">subcircuits</div>
            </div>
            <div className="w-full">
              <div className="ml-4">
                <CircuitRecursiveGrid
                  key={row.id}
                  circuits={children}
                  columns={visibleColumns}
                  dataType={dataType}
                  onCellClick={onCellClick}
                  rowClassName={(record) => circuitListingRowClass(record, view)}
                />
              </div>
            </div>
          </div>
        );
      },
    }),
    [antdColumns, dataType, onCellClick, view]
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
      detailOverride={detailOverride}
      expandColumn={{
        columnId: EntityCoreFields.CircuitSubCircuit,
        align: 'right',
        renderExpander: (open) => (
          <ChevronRight
            fill="#003a8c"
            className={classNames(
              'transform transition-transform duration-200 ease-in-out',
              open ? 'rotate-90' : 'rotate-0'
            )}
          />
        ),
      }}
    />
  );
}
