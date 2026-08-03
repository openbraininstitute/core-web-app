import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { Align, FilterOptionsKind, FreeEntryKind, OperatorId, SortDirection } from '../../../core';
import {
  brainRegionColumn,
  contributionsColumn,
  etypeColumn,
  mtypeColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
} from '../columns/catalog';
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import { registerSharedRenderers } from '../renderers/register';
import { flatAdvancedFilters, recordIdFilter } from './common-filters';

import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * ADVANCED FILTERS — `GET /emodel` params with no column in this grid.
 *
 * Every field/operator pair below was checked against the live OpenAPI spec; the
 * emitted param is named in each comment. Nothing here is inferred from a naming
 * convention.
 *
 * `EModelFilter` composes `SpeciesFilterMixin`, so strain sits at the TOP level
 * (`strain__*`), not under `subject__*` — the shared `subjectAdvancedGroup` would
 * emit params this endpoint does not accept, so the strain filter is spelled out
 * here instead.
 */
const emodelAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
  {
    id: 'exemplarMorphology',
    label: 'Exemplar morphology',
    description: 'The reconstruction the e-model was fitted on.',
    filters: [
      {
        id: 'hasSegmentedSpines',
        label: 'Segmented spines',
        // `exemplar_morphology__has_segmented_spines` (boolean)
        field: 'exemplar_morphology__has_segmented_spines',
        operators: [OperatorId.Bool],
        description: 'Whether the exemplar morphology has segmented dendritic spines',
      },
    ],
  },
  {
    id: 'ionChannelModel',
    label: 'Ion channel model',
    description: 'Ion channel models the e-model is built from. No column shows them.',
    filters: [
      {
        id: 'name',
        label: 'Ion channel model name',
        // `ion_channel_model__name__ilike`, `…__name__in`, `…__name` (exact)
        field: 'ion_channel_model__name',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter an ion channel model name',
      },
    ],
  },
  {
    id: 'strain',
    label: 'Strain',
    filters: [
      {
        id: 'name',
        label: 'Strain',
        // `strain__name__ilike`, `strain__name__in` (top level, NOT `subject__strain__*`)
        field: 'strain__name',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a strain name',
      },
    ],
  },
];

/**
 * E-model listing (curated). Column order mirrors the legacy `ViewDefForEmodel`
 * view-def: Name, Response (preview), Brain region, Species, M-type, E-type,
 * Exemplar morphology, Model score, Contributors, Registration date.
 *
 * Per the legacy field-defs:
 *  - Species facet-filters on `species__name__in` (plus `species__name__ilike`) and IS
 *    server-sortable — `species__name` is in EModelFilter's ordering fields. E-model
 *    carries species at the top level (`r.species`), not under `subject`, so the value
 *    accessor reads it directly.
 *  - M-type / E-type sort + facet-filter on `mtype__pref_label` / `etype__pref_label`.
 *  - Contributors ARE sortable for e-model (`contribution__pref_label`).
 *  - Response is a preview of the entity itself (shared entity-preview renderer).
 *  - Exemplar morphology sorts on `exemplar_morphology__name` and filters via the
 *    `exemplar_morphology` facet (`exemplar_morphology__name__in` / `__ilike`).
 *  - Model score sorts on `score` and range-filters to `score__gte` / `score__lte`.
 */
export const emodelSchema: IGridSchema<IEModel> = {
  id: 'emodel',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
  advancedFilters: flatAdvancedFilters(emodelAdvancedFilters),
  columns: [
    nameColumn<IEModel>(),
    previewColumn<IEModel>({
      id: 'eModelResponse',
      header: 'Response',
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    brainRegionColumn<IEModel>(),
    {
      id: 'species',
      header: 'Species',
      sortable: true,
      sortField: 'species__name',
      getValue: (r) => r.species?.name ?? '',
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'species__name',
        facetKey: 'species',
        description: 'Species',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    mtypeColumn<IEModel>(),
    etypeColumn<IEModel>(),
    {
      id: 'exemplarMorphology',
      header: 'Morphology',
      sortable: true,
      sortField: 'exemplar_morphology__name',
      getValue: (r) => r.exemplar_morphology?.name ?? '',
      width: { minWidth: 160, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'exemplar_morphology__name',
        facetKey: 'exemplar_morphology',
        description: 'Exemplar morphology',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    {
      id: 'eModelScore',
      header: 'Model cumulated score',
      sortable: true,
      sortField: 'score',
      getValue: (r) => (r.score == null ? '' : String(r.score)),
      align: Align.Right,
      width: { minWidth: 150 },
      filter: { operators: [OperatorId.Range], field: 'score' },
    },
    contributionsColumn<IEModel>({ sortable: true, sortField: 'contribution__pref_label' }),
    registrationDateColumn<IEModel>(),
  ],
};

export const emodelGridDefinition: IEntityGridDefinition<IEModel> = {
  dataType: ExtendedEntitiesTypeDict.Emodel,
  schema: emodelSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
