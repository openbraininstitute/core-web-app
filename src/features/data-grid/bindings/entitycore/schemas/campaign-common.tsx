import { Align, FilterOptionsKind, mergeColumnDef, OperatorId } from '../../../core';
import {
  createdByColumn,
  EMPTY_PLACEHOLDER,
  nameColumn,
  registrationDateColumn,
} from '../columns/catalog';
import { CAMPAIGN_STATUS_RENDERER, CampaignStatusCell } from '../renderers/campaign-status-cell';

import type { ReactNode } from 'react';
import type { ListExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/types';
import type { IColumnModel, IDetailSpec, TColumnOverride } from '../../../core';
import type { CellRendererRegistry, TDetailRenderFn } from '../../../react';

/**
 * Minimal row shape shared by the simulation-campaign listings flipped to AG Grid
 * detail rows (T-05). Every field is optional/nullable so a single set of column
 * factories works across the circuit-simulation variants regardless of which
 * columns a given entity's legacy view-def surfaces.
 */
export interface ICampaignRow {
  id: string;
  name?: string | null;
  description?: string | null;
  circuit?: { name?: string | null } | null;
  created_by?: { pref_label?: string | null } | null;
  /** memodel circuit simulations expose a top-level species array */
  species?: Array<{ name?: string | null }> | null;
  /** other entities expose species under the subject */
  subject?: { species?: { name?: string | null } | null } | null;
  creation_date?: string | null;
}

/**
 * "Circuit" column — the campaign's source circuit name (legacy
 * `EntityCoreFields.CircuitName`). The legacy field-def declared `filter: null`, but
 * `/simulation-campaign` exposes `circuit__name__in` / `circuit__name__ilike`, serves
 * a `circuit` facet bucket, and lists `circuit__name` in
 * SimulationCampaignFilter's ordering fields — so it is both filterable and sortable.
 */
export function circuitNameColumn<Row extends { circuit?: { name?: string | null } | null }>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'circuitName',
      header: 'Circuit',
      sortable: true,
      sortField: 'circuit__name',
      getValue: (r) => r.circuit?.name ?? EMPTY_PLACEHOLDER,
      width: { minWidth: 160, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'circuit__name',
        facetKey: 'circuit',
        description: 'Circuit',
        options: { kind: FilterOptionsKind.Facets },
      },
      essential: true,
    },
    o
  );
}

/**
 * "Description" column with NO filter — legacy `EntityCoreFields.Description` is
 * `isFilterable: false`, and no entitycore list endpoint exposes a `description`
 * query param either, so there is nothing to bind.
 */
export function campaignDescriptionColumn<Row extends { description?: string | null }>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'description',
      header: 'Description',
      getValue: (r) => r.description ?? '',
      width: { minWidth: 200, flex: 2 },
    },
    o
  );
}

/**
 * "Species" column for memodel circuit simulations. The row carries a top-level
 * `species` array (legacy renders `r.species`).
 *
 * DISPLAY-ONLY. The legacy field-def bound the default `species__name__in`
 * constraint, but `/simulation-campaign` exposes NO species query param at all
 * (nothing matching `species*`), `species` is not one of its facet keys, and
 * `species__name` is absent from SimulationCampaignFilter's ordering fields — so the
 * filter was silently dropped by the API and has been removed rather than reworded.
 */
export function campaignSpeciesColumn<Row extends ICampaignRow>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'species',
      header: 'Species',
      getValue: (r) => {
        const fromArray = (r.species ?? [])
          .map((s) => s?.name ?? '')
          .filter(Boolean)
          .join(', ');
        return fromArray || r.subject?.species?.name || '';
      },
      width: { minWidth: 130, flex: 1 },
    },
    o
  );
}

/**
 * "Status" column — the aggregated campaign activity status (legacy
 * `EntityCoreFields.LegacyActivityStatus`). Display-only, rendered by
 * {@link CampaignStatusCell}.
 */
export function campaignStatusColumn<Row extends { id: string }>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'status',
      header: 'Status',
      align: Align.Center,
      getValue: () => '',
      cellRenderer: CAMPAIGN_STATUS_RENDERER,
      width: { width: 120, minWidth: 100 },
    },
    o
  );
}

/** Reusable collapsed-row column factories, re-exported for schema authoring. */
export const campaignNameColumn = nameColumn;
export const campaignCreatedByColumn = createdByColumn;
export const campaignRegistrationDateColumn = registrationDateColumn;

/** Detail renderer key (informational — the host renders via `definition.renderDetail`). */
export const CAMPAIGN_DETAIL_RENDERER = 'campaignDetail';

/**
 * Presentation flag for the campaign "Status" column.
 *
 * - `false` (DEFAULT): popover-cards mode. The status cell shows a {@link CampaignStatusBadge}
 *   that reveals the scan-parameter sets as cards on hover; NO full-width detail row is wired,
 *   so the legacy nested-table expander is not shown.
 * - `true`: nested-table mode. Restores the full-width expandable detail row (scan-parameter
 *   table) alongside the badge — kept for parity/rollback. The nested table's status cell uses
 *   the new badge too (see {@link makeCampaignScanTableRenderDetail}).
 *
 * The badge-in-status-cell expander relocation for nested mode is DEFERRED: a cell renderer
 * receives no expand handle (`ICellRendererProps` has row/value/rowIndex/params only), so wiring
 * the expander into the status cell needs a shared-host `expandColumn` change (out of fence).
 */
export const CAMPAIGN_NESTED_MODE_DEFAULT = false;

/**
 * The `schema.detail` spec shared by every flipped simulation campaign: all rows are
 * expandable (parity with the legacy `isExpandable: () => true`), and the full-width
 * detail row starts at `minHeight` while the nested SimpleGrid measures itself.
 */
export function campaignDetailSpec<Row>(minHeight = 220): IDetailSpec<Row> {
  return {
    rendererKey: CAMPAIGN_DETAIL_RENDERER,
    isExpandable: () => true,
    minHeight,
  };
}

/**
 * Adapts a legacy {@link ListExpandedViewConfig} into a data-grid {@link TDetailRenderFn}.
 * The host's IDetailRuntime lazily fetches the expand payload via `entity.api.expandRow`
 * (the array of nested rows) and hands it back as `data`; we forward it to the legacy
 * `viewConfig.render(originalRecord, records)` — the SAME SimpleGrid content the legacy
 * expandable table drew — guaranteeing pixel/behaviour parity of the expanded view.
 */
export function makeCampaignRenderDetail(
  // biome-ignore lint/suspicious/noExplicitAny: viewConfig row type is entity-specific; the row is forwarded verbatim
  viewConfig: ListExpandedViewConfig<any>
): TDetailRenderFn<ICampaignRow> {
  return ({ row, data, loading, error }): ReactNode => {
    if (error) {
      return (
        <div className="px-12 py-4 text-sm text-red-500">Failed to load expanded details.</div>
      );
    }
    if (loading) {
      return <div className="px-12 py-4 text-sm text-gray-400">Loading…</div>;
    }
    const records = Array.isArray(data) ? (data as unknown[]) : [];
    return viewConfig.render(row, records);
  };
}

/** Register the collapsed-row cell renderers used by the campaign listings. */
export function registerCampaignRenderers(registry: CellRendererRegistry): void {
  registry.register(CAMPAIGN_STATUS_RENDERER, CampaignStatusCell);
}
