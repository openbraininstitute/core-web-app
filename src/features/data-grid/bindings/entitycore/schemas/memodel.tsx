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
import { lifecycleStatusColumn } from '../columns/lifecycle-status';
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
 * `GET /memodel` params with no column: just the record's own `id`. Shared by `memodel`
 * and `me_model_circuit`, which list the same rows through the same endpoint.
 */
export const memodelAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
];

/**
 * Auxiliary columns shared by both ME-model listings. The list response embeds the
 * full `morphology` and `emodel` reads plus `strain` and `contributions`, so none of
 * these renders blank.
 *
 * All six are `sortable: false` — none is in `MEModelFilter.ordering_model_fields`,
 * and an `order_by` outside that allowlist 422s the whole listing.
 *
 * `MEModelFilter` composes `SpeciesFilterMixin`, so strain sits at the top level
 * (`strain__*`), not under `subject__*`.
 */
function buildMemodelAuxiliaryColumns(): Array<IColumnModel<IMEModel>> {
  return [
    {
      id: 'morphologyName',
      // "Morphology" is already taken by the nested-morphology preview column.
      header: 'Morphology name',
      auxiliary: true,
      sortable: false,
      getValue: (r) => r.morphology?.name ?? '',
      width: { minWidth: 160, flex: 1 },
      filter: {
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
        // Bare boolean, no `__op` suffix.
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
    contributionsColumn<IMEModel>({
      auxiliary: true,
      sortable: false,
      filter: {
        operators: [OperatorId.Ilike, OperatorId.In],
        field: 'contribution__pref_label',
        // Explicit target: /memodel computes no `contribution` facet bucket.
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
 * Shared ME-model column set, reused by both `memodel` and `me_model_circuit`.
 *
 * Species is read from the top-level `species`, not `subject`, and is non-sortable —
 * `species__name` is absent from `MEModelFilter`'s ordering fields.
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
    lifecycleStatusColumn<IMEModel>(),
    createdByColumn<IMEModel>({ sortable: true, sortField: 'created_by__pref_label' }),
    registrationDateColumn<IMEModel>(),
    // Auxiliary — hidden until ticked; each replaces an advanced filter.
    ...buildMemodelAuxiliaryColumns(),
  ];
}

export const memodelSchema: IGridSchema<IMEModel> = {
  id: 'memodel',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
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
