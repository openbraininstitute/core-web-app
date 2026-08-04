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
  yesNo,
} from '../columns/catalog';
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import { registerSharedRenderers } from '../renderers/register';
import { flatAdvancedFilters, recordIdFilter } from './common-filters';

import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { IAdvancedFilterGroup, IColumnModel, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * `IEModel` types `exemplar_morphology` with a hand-written shape that stops at
 * name/description/location/legacy_id, but the wire carries the whole
 * `CellMorphologyBaseMixin` — `ExemplarMorphology` in `app/schemas/emodel.py` extends
 * it, so `has_segmented_spines` really is on the row.
 *
 * `ion_channel_models` and `strain` need NO augmentation: both are already typed on
 * `IEModel`, and the list endpoint really returns them — `_read_many` in
 * `app/service/emodel.py` responds with `EModelReadExpanded` (which adds
 * `ion_channel_models`) and eager-loads `EModel.ion_channel_models` and `EModel.strain`.
 *
 * Optional on purpose, so `IEModel` stays assignable to `Row`.
 */
type Row = IEModel & {
  exemplar_morphology?: { has_segmented_spines?: boolean | null };
};

/**
 * ADVANCED FILTERS — `GET /emodel` params with no column in this grid: the record's
 * own `id`, which has no useful column to show.
 *
 * `exemplar_morphology__has_segmented_spines`, `ion_channel_model__name` and
 * `strain__name` used to live here; all three are AUXILIARY columns below (hidden
 * until ticked), so each field stays on exactly one surface and the panel still
 * offers it while it is hidden.
 */
const emodelAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
];

/**
 * AUXILIARY COLUMNS — each carries the operators, free-entry kind and placeholder of
 * the advanced filter it replaces.
 *
 * SORT SAFETY (`EModelFilter.Constants.ordering_model_fields`, `app/filters/emodel.py`
 * — a flat list, no parent spread): `ion_channel_model__name` IS in the allowlist and
 * sorts. `exemplar_morphology__has_segmented_spines` and `strain__name` are NOT, so
 * both are non-sortable; offering them would 422 the whole listing.
 */
const exemplarSegmentedSpinesColumn: IColumnModel<Row> = {
  id: 'exemplarHasSegmentedSpines',
  header: 'Segmented spines',
  auxiliary: true,
  sortable: false,
  getValue: (r) => yesNo(r.exemplar_morphology?.has_segmented_spines),
  width: { minWidth: 150 },
  filter: {
    // `exemplar_morphology__has_segmented_spines` (bare boolean, no `__op` suffix)
    operators: [OperatorId.Bool],
    field: 'exemplar_morphology__has_segmented_spines',
    targets: [
      {
        id: 'hasSegmentedSpines',
        label: 'Segmented spines',
        field: 'exemplar_morphology__has_segmented_spines',
        operators: [OperatorId.Bool],
        description: 'Whether the exemplar morphology has segmented dendritic spines',
      },
    ],
  },
};

/**
 * `ion_channel_model` is a TO-MANY relation: the filter is existential over the join
 * (one matching channel model qualifies the e-model), and the row carries the whole
 * `ion_channel_models` array — so the cell JOINS the names rather than reading a
 * scalar. Sorting is the backend's business (`ion_channel_model__name` sorts on the
 * joined column), which is why `sortField` differs in shape from what the cell shows.
 */
const ionChannelModelsColumn: IColumnModel<Row> = {
  id: 'ionChannelModels',
  header: 'Ion channel models',
  auxiliary: true,
  sortable: true,
  sortField: 'ion_channel_model__name',
  getValue: (r) =>
    (r.ion_channel_models ?? [])
      .map((m) => m?.name ?? '')
      .filter(Boolean)
      .join(', '),
  width: { minWidth: 180, flex: 1 },
  filter: {
    // `ion_channel_model__name__ilike`, `…__name__in`, `…__name` (exact)
    operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
    field: 'ion_channel_model__name',
    targets: [
      {
        id: 'name',
        label: 'Ion channel model name',
        field: 'ion_channel_model__name',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter an ion channel model name',
      },
    ],
  },
};

/**
 * Strain, spelled at the TOP level. `EModelFilter` composes `SpeciesFilterMixin`, not
 * `SubjectFilterMixin`, so the param is `strain__name*` and the catalog's
 * `subjectStrainColumn` (which emits `subject__strain__name*`) would send params this
 * endpoint does not accept.
 */
const strainNameColumn: IColumnModel<Row> = {
  id: 'strainName',
  header: 'Strain',
  auxiliary: true,
  sortable: false,
  getValue: (r) => r.strain?.name ?? '',
  width: { minWidth: 140 },
  filter: {
    // `strain__name__ilike`, `strain__name__in` (NOT `subject__strain__*`)
    operators: [OperatorId.Ilike, OperatorId.In],
    field: 'strain__name',
    targets: [
      {
        id: 'name',
        label: 'Strain',
        field: 'strain__name',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a strain name',
      },
    ],
  },
};

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
export const emodelSchema: IGridSchema<Row> = {
  id: 'emodel',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
  advancedFilters: flatAdvancedFilters(emodelAdvancedFilters),
  columns: [
    nameColumn<Row>(),
    previewColumn<Row>({
      id: 'eModelResponse',
      header: 'Response',
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    brainRegionColumn<Row>(),
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
    mtypeColumn<Row>(),
    etypeColumn<Row>(),
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
    contributionsColumn<Row>({ sortable: true, sortField: 'contribution__pref_label' }),
    registrationDateColumn<Row>(),
    // AUXILIARY — hidden until ticked; each replaces an advanced filter one-for-one
    exemplarSegmentedSpinesColumn,
    ionChannelModelsColumn,
    strainNameColumn,
  ],
};

export const emodelGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.Emodel,
  schema: emodelSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
