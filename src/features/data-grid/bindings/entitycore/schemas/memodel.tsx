import { ValidationStatus } from '@/api/entitycore/types/entities/me-model';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { Align, FilterOptionsKind, FreeEntryKind, OperatorId, SortDirection } from '../../../core';
import {
  brainRegionColumn,
  contributionsColumn,
  createdByColumn,
  etypeColumn,
  mtypeColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
  yesNo,
} from '../columns/catalog';
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import {
  MEMODEL_MORPHOLOGY_PREVIEW_RENDERER,
  MEModelMorphologyPreview,
} from '../renderers/me-model-cells';
import { registerSharedRenderers } from '../renderers/register';
import { flatAdvancedFilters, recordIdFilter } from './common-filters';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { IAdvancedFilterGroup, IColumnModel, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * ADVANCED FILTERS — `GET /memodel` params with no column in this grid: the record's
 * own `id`, which has no useful column to show. Shared by `memodel` and
 * `me_model_circuit`, which list the same rows through the same endpoint with the
 * same columns (see {@link buildMemodelColumns}).
 *
 * The `morphology__*` and `emodel__*` pairs, `strain__name` and
 * `contribution__pref_label` used to live here; all six are AUXILIARY columns now
 * (see {@link buildMemodelColumns}), so each field stays on exactly one surface.
 */
export const memodelAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
];

/**
 * AUXILIARY COLUMNS shared by both ME-model listings — each carries the operators,
 * options and free-entry kind of the advanced filter it replaces.
 *
 * THE ROW REALLY CARRIES ALL SIX. `/memodel` list responds with `MEModelRead`
 * (`app/schemas/me_model.py`), which embeds the FULL `morphology: CellMorphologyRead`
 * and `emodel: EModelRead` — not a nested/minimal read — plus `strain` via
 * `SpeciesStrainReadMixin` and `contributions` via `EntityReadWoutAssets`. `_load` in
 * `app/service/memodel.py` eager-loads every one of them. So none of these is a blank
 * column over a filter-only field.
 *
 * SORT SAFETY: ALL SIX ARE NON-SORTABLE.
 * `MEModelFilter.Constants.ordering_model_fields` (`app/filters/memodel.py`) is a
 * short flat list — creation_date, update_date, brain_region__name,
 * brain_region__acronym, created_by__pref_label, name, mtype__pref_label,
 * etype__pref_label — and nothing below appears in it. An `order_by` outside that
 * allowlist is a hard 422 that fails the whole listing, not a bad sort.
 *
 * `MEModelFilter` composes `SpeciesFilterMixin`, so strain sits at the TOP level
 * (`strain__*`), not under `subject__*`: the catalog's `subjectStrainColumn` would
 * emit params this endpoint does not accept.
 */
function buildMemodelAuxiliaryColumns(): Array<IColumnModel<IMEModel>> {
  return [
    {
      id: 'morphologyName',
      // "Morphology" is already taken by the nested-morphology PREVIEW column
      header: 'Morphology name',
      auxiliary: true,
      sortable: false,
      getValue: (r) => r.morphology?.name ?? '',
      width: { minWidth: 160, flex: 1 },
      filter: {
        // `morphology__name__ilike`, `morphology__name__in`, `morphology__name`
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        field: 'morphology__name',
        targets: [
          {
            id: 'name',
            label: 'Morphology name',
            field: 'morphology__name',
            operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
            freeEntry: FreeEntryKind.Text,
            placeholder: 'Enter a morphology name',
          },
        ],
      },
    },
    {
      id: 'morphologyHasSegmentedSpines',
      header: 'Segmented spines',
      auxiliary: true,
      sortable: false,
      getValue: (r) => yesNo(r.morphology?.has_segmented_spines),
      width: { minWidth: 150 },
      filter: {
        // `morphology__has_segmented_spines` (bare boolean, no `__op` suffix)
        operators: [OperatorId.Bool],
        field: 'morphology__has_segmented_spines',
        targets: [
          {
            id: 'hasSegmentedSpines',
            label: 'Segmented spines',
            field: 'morphology__has_segmented_spines',
            operators: [OperatorId.Bool],
            description: 'Whether the morphology has segmented dendritic spines',
          },
        ],
      },
    },
    {
      id: 'emodelName',
      header: 'E-model name',
      auxiliary: true,
      sortable: false,
      getValue: (r) => r.emodel?.name ?? '',
      width: { minWidth: 160, flex: 1 },
      filter: {
        // `emodel__name__ilike`, `emodel__name__in`, `emodel__name`
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        field: 'emodel__name',
        targets: [
          {
            id: 'name',
            label: 'E-model name',
            field: 'emodel__name',
            operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
            freeEntry: FreeEntryKind.Text,
            placeholder: 'Enter an e-model name',
          },
        ],
      },
    },
    {
      id: 'emodelScore',
      header: 'E-model score',
      auxiliary: true,
      sortable: false,
      align: Align.Right,
      getValue: (r) => (r.emodel?.score == null ? '' : String(r.emodel.score)),
      width: { minWidth: 150 },
      filter: {
        // `emodel__score__gte` / `emodel__score__lte`
        operators: [OperatorId.Range],
        field: 'emodel__score',
        targets: [
          {
            id: 'score',
            label: 'E-model score',
            field: 'emodel__score',
            operators: [OperatorId.Range],
            description: 'Bounds on the e-model cumulated score',
          },
        ],
      },
    },
    {
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
    },
    // These listings show Created by as a regular column, not Contributors; auxiliary
    // keeps `contribution__pref_label` on one surface without changing the layout.
    contributionsColumn<IMEModel>({
      auxiliary: true,
      sortable: false,
      filter: {
        // `contribution__pref_label__ilike`, `contribution__pref_label__in`
        operators: [OperatorId.Ilike, OperatorId.In],
        field: 'contribution__pref_label',
        // explicit target: /memodel computes no `contribution` facet bucket, so the
        // synthesised "no options ⇒ use facets" target would be an empty picker
        targets: [
          {
            id: 'prefLabel',
            label: 'Contributor',
            field: 'contribution__pref_label',
            operators: [OperatorId.Ilike, OperatorId.In],
            freeEntry: FreeEntryKind.Text,
            placeholder: 'Enter a contributor name',
          },
        ],
      },
    }),
  ];
}

/**
 * Shared ME-model column set. Both `memodel` and `me_model_circuit` list ME-model
 * rows (`IMEModel`) with the SAME columns (legacy `ViewDefForMemodel`), so the
 * column definitions live here once and are reused by both grid definitions.
 *
 * Per the legacy field-defs:
 *  - Two preview columns: "Morphology" previews the NESTED morphology sub-entity
 *    (bespoke renderer), "Trace" previews the ME-model row itself (shared renderer).
 *  - "Validated" is a display-only True/False derived from `validation_status`.
 *  - Brain region sorts on `brain_region__name` (no column filter — handled by the
 *    brain-region hierarchy selector).
 *  - Species is display + facet-filter (`species__name__in` / `species__name__ilike`)
 *    but NOT server-sortable for me-model (`species__name` is absent from
 *    MEModelFilter's ordering fields); the value is read from the top-level `species`,
 *    not `subject`.
 *  - M-type / E-type sort + facet-filter on `mtype__pref_label` / `etype__pref_label`.
 *  - Created by sorts + facet-filters on `created_by__pref_label`.
 */
export function buildMemodelColumns(): Array<IColumnModel<IMEModel>> {
  return [
    nameColumn<IMEModel>(),
    previewColumn<IMEModel>({
      id: 'meModelMorphologyPreview',
      header: 'Morphology',
      cellRenderer: MEMODEL_MORPHOLOGY_PREVIEW_RENDERER,
      width: { width: 196, minWidth: 120, resizable: true },
    }),
    previewColumn<IMEModel>({
      id: 'meModelTracePreview',
      header: 'Trace',
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    {
      id: 'validationStatus',
      header: 'Validated',
      getValue: (r) => (r.validation_status === ValidationStatus.Done ? 'True' : 'False'),
      width: { minWidth: 100 },
    },
    brainRegionColumn<IMEModel>(),
    {
      id: 'species',
      header: 'Species',
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
    mtypeColumn<IMEModel>(),
    etypeColumn<IMEModel>(),
    createdByColumn<IMEModel>({ sortable: true, sortField: 'created_by__pref_label' }),
    registrationDateColumn<IMEModel>(),
    // AUXILIARY — hidden until ticked; each replaces an advanced filter one-for-one
    ...buildMemodelAuxiliaryColumns(),
  ];
}

export const memodelSchema: IGridSchema<IMEModel> = {
  id: 'memodel',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
  advancedFilters: flatAdvancedFilters(memodelAdvancedFilters),
  columns: buildMemodelColumns(),
};

export const memodelGridDefinition: IEntityGridDefinition<IMEModel> = {
  dataType: ExtendedEntitiesTypeDict.Memodel,
  schema: memodelSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
    registry.register(MEMODEL_MORPHOLOGY_PREVIEW_RENDERER, MEModelMorphologyPreview);
  },
};
