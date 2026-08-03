import { ValidationStatus } from '@/api/entitycore/types/entities/me-model';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { FilterOptionsKind, FreeEntryKind, OperatorId, SortDirection } from '../../../core';
import {
  brainRegionColumn,
  createdByColumn,
  etypeColumn,
  mtypeColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
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
 * ADVANCED FILTERS — `GET /memodel` params with no column in this grid. Shared by
 * `memodel` and `me_model_circuit`, which list the same rows through the same
 * endpoint with the same columns (see {@link buildMemodelColumns}).
 *
 * Every field/operator pair below was checked against the live OpenAPI spec; the
 * emitted param is named in each comment.
 *
 * `MEModelFilter` composes `SpeciesFilterMixin`, so strain sits at the TOP level
 * (`strain__*`), not under `subject__*` — the shared `subjectAdvancedGroup` would
 * emit params this endpoint does not accept.
 */
export const memodelAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
  {
    id: 'morphology',
    label: 'Morphology',
    description: 'The reconstruction the ME-model combines. No column shows it.',
    filters: [
      {
        id: 'name',
        label: 'Morphology name',
        // `morphology__name__ilike`, `morphology__name__in`, `morphology__name`
        field: 'morphology__name',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a morphology name',
      },
      {
        id: 'hasSegmentedSpines',
        label: 'Segmented spines',
        // `morphology__has_segmented_spines` (boolean)
        field: 'morphology__has_segmented_spines',
        operators: [OperatorId.Bool],
        description: 'Whether the morphology has segmented dendritic spines',
      },
    ],
  },
  {
    id: 'emodel',
    label: 'E-model',
    description: 'The e-model the ME-model combines. No column shows it.',
    filters: [
      {
        id: 'name',
        label: 'E-model name',
        // `emodel__name__ilike`, `emodel__name__in`, `emodel__name`
        field: 'emodel__name',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter an e-model name',
      },
      {
        id: 'score',
        label: 'E-model score',
        // `emodel__score__gte` / `emodel__score__lte`
        field: 'emodel__score',
        operators: [OperatorId.Range],
        description: 'Bounds on the e-model cumulated score',
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
  {
    id: 'contribution',
    label: 'Contributors',
    filters: [
      {
        id: 'prefLabel',
        label: 'Contributor',
        // `contribution__pref_label__ilike`, `contribution__pref_label__in`. This
        // listing shows Created by, not Contributors, so the field has no column.
        field: 'contribution__pref_label',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a contributor name',
      },
    ],
  },
];

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
