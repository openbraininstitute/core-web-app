import {
  createdByColumn,
  descriptionColumn,
  nameColumn,
  registrationDateColumn,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { Align, FilterOptionsKind, mergeColumnDef, OperatorId } from '@/features/data-grid/core';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';

import { CAMPAIGN_STATUS_RENDERER, CampaignStatusCell } from '../renderers/campaign-status-cell';

import type { ReactNode } from 'react';
import type { ListExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/types';
import type { IColumnModel, IDetailSpec, TColumnOverride } from '@/features/data-grid/core';
import type { CellRendererRegistry, TDetailRenderFn } from '@/features/data-grid/react';

/**
 * Row shape shared by the simulation-campaign listings. Every field is optional so one
 * set of column factories works across all circuit-simulation variants.
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
 * The campaign's source circuit name. `/simulation-campaign` serves a `circuit` facet
 * bucket and lists `circuit__name` in its ordering fields, so it filters and sorts.
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

export function campaignDescriptionColumn<Row extends { description?: string | null }>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return descriptionColumn<Row>(o);
}

/**
 * Species column for memodel circuit simulations. Display-only:
 * `/simulation-campaign` exposes no species query param, facet key, or ordering field.
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

/** Aggregated campaign activity status. Display-only, rendered by {@link CampaignStatusCell}. */
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
 * Presentation flag for the campaign Status column. `false` (default) shows scan
 * parameters as hover cards with no detail row; `true` also wires the full-width
 * expandable scan-parameter table.
 */
export const CAMPAIGN_NESTED_MODE_DEFAULT = false;

/** The `schema.detail` spec shared by every simulation campaign; all rows are expandable. */
export function campaignDetailSpec<Row>(minHeight = 220): IDetailSpec<Row> {
  return {
    rendererKey: CAMPAIGN_DETAIL_RENDERER,
    isExpandable: () => true,
    minHeight,
  };
}

/**
 * Adapts a {@link ListExpandedViewConfig} into a {@link TDetailRenderFn}. The host
 * lazily fetches the nested rows via `entity.api.expandRow` and passes them as `data`.
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
