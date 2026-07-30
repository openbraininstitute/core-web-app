import { mergeColumnDef, OperatorId } from '../../../core';
import {
  createdByColumn,
  EMPTY_PLACEHOLDER,
  nameColumn,
  registrationDateColumn,
} from '../columns/catalog';
import { CAMPAIGN_STATUS_RENDERER, CampaignStatusCell } from '../renderers/campaign-status-cell';

import type { ReactNode } from 'react';
import type { ListExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/types';
import type { ColumnModel, ColumnOverride, DetailSpec } from '../../../core';
import type { CellRendererRegistry, DetailRenderFn } from '../../../react';

/**
 * Minimal row shape shared by the simulation-campaign listings flipped to AG Grid
 * detail rows (T-05). Every field is optional/nullable so a single set of column
 * factories works across the circuit-simulation variants regardless of which
 * columns a given entity's legacy view-def surfaces.
 */
export interface CampaignRow {
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
 * `EntityCoreFields.CircuitName`). Display-only: legacy `filter: null`,
 * not sortable.
 */
export function circuitNameColumn<Row extends { circuit?: { name?: string | null } | null }>(
  o?: ColumnOverride<Row>
): ColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'circuitName',
      header: 'Circuit',
      getValue: (r) => r.circuit?.name ?? EMPTY_PLACEHOLDER,
      width: { minWidth: 160, flex: 1 },
    },
    o
  );
}

/**
 * "Description" column with NO filter — legacy `EntityCoreFields.Description` is
 * `isFilterable: false` for these listings, unlike the shared `descriptionColumn`
 * factory (which declares an ilike filter for entities that support it).
 */
export function campaignDescriptionColumn<Row extends { description?: string | null }>(
  o?: ColumnOverride<Row>
): ColumnModel<Row> {
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
 * `species` array (legacy renders `r.species`), and the legacy filter constraint is
 * `species__name__in` (the default `SpeciesName` constraint — memodel has no
 * per-type override), so the field is `species__name`, NOT the `subject__…` path the
 * shared `speciesColumn` uses. Not sortable (memodel has no `species` order mapping).
 */
export function campaignSpeciesColumn<Row extends CampaignRow>(
  o?: ColumnOverride<Row>
): ColumnModel<Row> {
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
      filter: {
        operators: [OperatorId.In],
        field: 'species__name',
        facetKey: 'species',
        description: 'Species',
        options: { kind: 'facets' },
      },
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
  o?: ColumnOverride<Row>
): ColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'status',
      header: 'Status',
      align: 'center',
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
 * The `schema.detail` spec shared by every flipped simulation campaign: all rows are
 * expandable (parity with the legacy `isExpandable: () => true`), and the full-width
 * detail row starts at `minHeight` while the nested SimpleGrid measures itself.
 */
export function campaignDetailSpec<Row>(minHeight = 220): DetailSpec<Row> {
  return {
    rendererKey: CAMPAIGN_DETAIL_RENDERER,
    isExpandable: () => true,
    minHeight,
  };
}

/**
 * Adapts a legacy {@link ListExpandedViewConfig} into a data-grid {@link DetailRenderFn}.
 * The host's DetailRuntime lazily fetches the expand payload via `entity.api.expandRow`
 * (the array of nested rows) and hands it back as `data`; we forward it to the legacy
 * `viewConfig.render(originalRecord, records)` — the SAME SimpleGrid content the legacy
 * expandable table drew — guaranteeing pixel/behaviour parity of the expanded view.
 */
export function makeCampaignRenderDetail(
  // biome-ignore lint/suspicious/noExplicitAny: viewConfig row type is entity-specific; the row is forwarded verbatim
  viewConfig: ListExpandedViewConfig<any>
): DetailRenderFn<CampaignRow> {
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
