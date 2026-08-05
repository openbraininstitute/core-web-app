import { ValidationStatus } from '@/api/entitycore/types/entities/me-model';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  brainRegionColumn,
  contributionsColumn,
  createdByColumn,
  nameColumn,
  registrationDateColumn,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import { registerSharedRenderers } from '@/features/data-grid/bindings/entitycore/renderers/register';
import {
  flatAdvancedFilters,
  recordIdFilter,
} from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import {
  FilterOptionsKind,
  FreeEntryKind,
  OperatorId,
  SortDirection,
} from '@/features/data-grid/core';

import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type {
  IAdvancedFilterGroup,
  IColumnModel,
  IGridSchema,
  TFilterOptionsSource,
} from '@/features/data-grid/core';
import type { CellRendererRegistry } from '@/features/data-grid/react';

/**
 * Filterable ≠ returned. The endpoint accepts the full `NestedMEModelFilter` under the
 * `me_model` prefix, but the response only carries `NestedMEModel`: name, description,
 * validation_status, id, type, mtypes, etypes. `ISingleNeuronSynaptome` types
 * `me_model` as the full `IMEModel`, which overstates the wire — do not trust it when
 * deciding what a cell can read. Fields not on that list stay advanced filters.
 */
const VALIDATION_STATUS_OPTIONS: TFilterOptionsSource = {
  kind: FilterOptionsKind.Static,
  items: [
    { id: ValidationStatus.Created, label: 'Created' },
    { id: ValidationStatus.Initialized, label: 'Initialized' },
    { id: ValidationStatus.Running, label: 'Running' },
    { id: ValidationStatus.Done, label: 'Done' },
    { id: ValidationStatus.Error, label: 'Error' },
  ],
};

const VALIDATION_STATUS_LABELS: ReadonlyMap<string, string> = new Map(
  VALIDATION_STATUS_OPTIONS.kind === FilterOptionsKind.Static
    ? VALIDATION_STATUS_OPTIONS.items.map((i) => [i.id, i.label] as const)
    : []
);

/**
 * `GET /single-neuron-synaptome` params with no column. The
 * `me_model__{strain,morphology,emodel}__*` params stay here because the list response
 * does not carry those nested values — a column for any of them would render blank.
 */
const singleNeuronSynaptomeAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
  {
    id: 'meModel',
    label: 'ME-model',
    description: 'The ME-model the synaptome is built on.',
    filters: [
      {
        id: 'strainName',
        label: 'Strain',
        // No column: `NestedMEModel` carries no `strain`.
        field: 'me_model__strain__name',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a strain name',
      },
    ],
  },
  {
    id: 'morphology',
    label: 'Morphology',
    description: "The reconstruction inside the synaptome's ME-model. No column shows it.",
    filters: [
      {
        id: 'name',
        label: 'Morphology name',
        // No column: `NestedMEModel` carries no `morphology`.
        field: 'me_model__morphology__name',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a morphology name',
      },
      {
        id: 'hasSegmentedSpines',
        label: 'Segmented spines',
        field: 'me_model__morphology__has_segmented_spines',
        operators: [OperatorId.Bool],
        description: 'Whether the morphology has segmented dendritic spines',
      },
    ],
  },
  {
    id: 'emodel',
    label: 'E-model',
    description: "The e-model inside the synaptome's ME-model. No column shows it.",
    filters: [
      {
        id: 'name',
        label: 'E-model name',
        // No column: `NestedMEModel` carries no `emodel`.
        field: 'me_model__emodel__name',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter an e-model name',
      },
      {
        id: 'score',
        label: 'E-model score',
        field: 'me_model__emodel__score',
        operators: [OperatorId.Range],
        description: 'Bounds on the e-model cumulated score',
      },
    ],
  },
];

/**
 * ME-model validation status, as an auxiliary column. Not in the endpoint's
 * `ordering_model_fields`, hence `sortable: false` — entitycore 422s otherwise.
 */
const meModelValidationStatusColumn: IColumnModel<ISingleNeuronSynaptome> = {
  id: 'meModelValidationStatus',
  header: 'ME-model validation status',
  auxiliary: true,
  sortable: false,
  getValue: (r) => VALIDATION_STATUS_LABELS.get(r.me_model?.validation_status ?? '') ?? '',
  width: { minWidth: 180 },
  filter: {
    // Exact only — no list form on this endpoint.
    operators: [OperatorId.Eq],
    field: 'me_model__validation_status',
    // Explicit target: a flat filter with no options falls back to facets.
    targets: [
      {
        id: 'validationStatus',
        label: 'ME-model validation status',
        field: 'me_model__validation_status',
        operators: [OperatorId.Eq],
        options: VALIDATION_STATUS_OPTIONS,
      },
    ],
  },
};

function labels(values: Array<{ pref_label?: string | null } | undefined> | null | undefined) {
  return (values ?? [])
    .map((v) => v?.pref_label ?? '')
    .filter(Boolean)
    .join(', ');
}

/**
 * Single-neuron synaptome listing (`GET /single-neuron-synaptome`).
 *
 * M-type/E-type come from the linked ME-model, so they sort and filter on the
 * `me_model__…` keys. ME-model name and Species are not in the endpoint's ordering
 * fields, hence non-sortable. Description is display-only — no endpoint accepts a
 * `description` param.
 */
export const singleNeuronSynaptomeSchema: IGridSchema<ISingleNeuronSynaptome> = {
  id: 'single-neuron-synaptome',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  advancedFilters: flatAdvancedFilters(singleNeuronSynaptomeAdvancedFilters),
  columns: [
    nameColumn<ISingleNeuronSynaptome>(),
    {
      id: 'description',
      header: 'Description',
      getValue: (r) => r.description ?? '',
      width: { minWidth: 200, flex: 2 },
    },
    {
      id: 'me_model',
      header: 'ME-model',
      getValue: (r) => r.me_model?.name ?? '',
      width: { minWidth: 160, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'me_model__name',
        facetKey: 'me_model',
        description: 'ME-model',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    {
      id: 'mtype',
      header: 'M-type',
      sortable: true,
      sortField: 'me_model__mtype__pref_label',
      getValue: (r) => labels(r.me_model?.mtypes),
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'me_model__mtype__pref_label',
        facetKey: 'mtype',
        description: 'Morphological type',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    {
      id: 'etype',
      header: 'E-type',
      sortable: true,
      sortField: 'me_model__etype__pref_label',
      getValue: (r) => labels(r.me_model?.etypes),
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'me_model__etype__pref_label',
        facetKey: 'etype',
        description: 'Electrical type',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    brainRegionColumn<ISingleNeuronSynaptome>(),
    {
      id: 'species',
      header: 'Species',
      // Known-empty value, working filter — open question for the listing's owner.
      // `me_model__species__name` is a real filter key, but `NestedMEModel` carries no
      // `species`, so every cell renders the empty placeholder. Kept for parity with
      // the legacy view-def until the backend nests `species` or the column is dropped.
      getValue: (r) => r.me_model?.species?.name ?? '',
      width: { minWidth: 140, flex: 1 },
      filter: { operators: [OperatorId.Ilike], field: 'me_model__species__name' },
    },
    lifecycleStatusColumn<ISingleNeuronSynaptome>(),
    createdByColumn<ISingleNeuronSynaptome>({
      sortable: true,
      sortField: 'created_by__pref_label',
    }),
    registrationDateColumn<ISingleNeuronSynaptome>(),
    // Auxiliary — hidden until ticked; each replaces an advanced filter.
    meModelValidationStatusColumn,
    contributionsColumn<ISingleNeuronSynaptome>({
      auxiliary: true,
      sortable: false,
      filter: {
        operators: [OperatorId.Ilike, OperatorId.In],
        field: 'contribution__pref_label',
        // Explicit target: this endpoint computes no `contribution` facet bucket.
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
  ],
};

export const singleNeuronSynaptomeGridDefinition: IEntityGridDefinition<ISingleNeuronSynaptome> = {
  dataType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
  schema: singleNeuronSynaptomeSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
