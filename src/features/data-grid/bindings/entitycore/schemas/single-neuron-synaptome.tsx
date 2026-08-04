import { ValidationStatus } from '@/api/entitycore/types/entities/me-model';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { FilterOptionsKind, FreeEntryKind, OperatorId, SortDirection } from '../../../core';
import {
  brainRegionColumn,
  contributionsColumn,
  createdByColumn,
  nameColumn,
  registrationDateColumn,
} from '../columns/catalog';
import { lifecycleStatusColumn } from '../columns/lifecycle-status';
import { registerSharedRenderers } from '../renderers/register';
import { flatAdvancedFilters, recordIdFilter } from './common-filters';

import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type {
  IAdvancedFilterGroup,
  IColumnModel,
  IGridSchema,
  TFilterOptionsSource,
} from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * FILTERABLE ≠ RETURNED — the rule that decides this schema's shape.
 *
 * `SingleNeuronSynaptomeFilter` nests the FULL `NestedMEModelFilter` under the
 * `me_model` prefix, so the endpoint accepts `me_model__strain__name*`,
 * `me_model__morphology__*` and `me_model__emodel__*`. The RESPONSE is far smaller:
 * `SingleNeuronSynaptomeRead.me_model` is typed `NestedMEModel`
 * (`app/schemas/me_model.py`) = `MEModelBaseMixin` + `NestedEntityRead` + `mtypes` +
 * `etypes`. That is name, description, validation_status, id, type, mtypes, etypes —
 * and NOTHING else. `_load` in `app/service/single_neuron_synaptome.py` confirms it:
 * it joinedloads only `me_model → mtypes` and `me_model → etypes`, then `raiseload("*")`.
 *
 * So of the seven candidates, only TWO can become columns without rendering blank for
 * every row: `me_model__validation_status` and `contribution__pref_label`. The other
 * five stay advanced filters below — the filter works, the value is simply not on the
 * row, and a shipped blank column is worse than a filter left where it is.
 *
 * (`ISingleNeuronSynaptome` types `me_model` as the full `IMEModel`, which OVERSTATES
 * the wire. Do not trust it when deciding what a cell can read.)
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
 * ADVANCED FILTERS — `GET /single-neuron-synaptome` params with no column here.
 *
 * `me_model__validation_status` and `contribution__pref_label` moved onto AUXILIARY
 * columns. What is left is the record's own `id` (an ID-type field with no useful
 * column) and the five `me_model__{strain,morphology,emodel}__*` params, which stay
 * HERE deliberately: the list response does not carry those nested values, so a
 * column for any of them would be empty on every row. See the note above.
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
        // `me_model__strain__name__ilike`, `me_model__strain__name__in`.
        // NO COLUMN: `NestedMEModel` carries no `strain`.
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
        // `me_model__morphology__name__ilike`, `…__name__in`, `…__name`.
        // NO COLUMN: `NestedMEModel` carries no `morphology`.
        field: 'me_model__morphology__name',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a morphology name',
      },
      {
        id: 'hasSegmentedSpines',
        label: 'Segmented spines',
        // `me_model__morphology__has_segmented_spines` (boolean). NO COLUMN, same reason.
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
        // `me_model__emodel__name__ilike`, `…__name__in`, `…__name`.
        // NO COLUMN: `NestedMEModel` carries no `emodel`.
        field: 'me_model__emodel__name',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter an e-model name',
      },
      {
        id: 'score',
        label: 'E-model score',
        // `me_model__emodel__score__gte` / `…__score__lte`. NO COLUMN, same reason.
        field: 'me_model__emodel__score',
        operators: [OperatorId.Range],
        description: 'Bounds on the e-model cumulated score',
      },
    ],
  },
];

/**
 * The two candidates the row DOES carry, as AUXILIARY columns.
 *
 * SORT SAFETY: BOTH ARE NON-SORTABLE.
 * `SingleNeuronSynaptomeFilter.Constants.ordering_model_fields`
 * (`app/filters/single_neuron_synaptome.py`) is creation_date, update_date, name,
 * brain_region__name, brain_region__acronym, created_by__pref_label,
 * me_model__etype__pref_label, me_model__mtype__pref_label — neither
 * `me_model__validation_status` nor `contribution__pref_label` is in it, and an
 * `order_by` outside that allowlist is a hard 422.
 */
const meModelValidationStatusColumn: IColumnModel<ISingleNeuronSynaptome> = {
  id: 'meModelValidationStatus',
  header: 'ME-model validation status',
  auxiliary: true,
  sortable: false,
  // `validation_status` IS on `NestedMEModel` (via `MEModelBaseMixin`)
  getValue: (r) => VALIDATION_STATUS_LABELS.get(r.me_model?.validation_status ?? '') ?? '',
  width: { minWidth: 180 },
  filter: {
    // `me_model__validation_status` (exact) ONLY — no list form on this endpoint.
    operators: [OperatorId.Eq],
    field: 'me_model__validation_status',
    // an explicit TARGET, not flat props alone: the synthesised legacy target reads
    // "no options" as "use the grid's facets", and pinning the static source here
    // keeps the picker the advanced filter had
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
 * Single-neuron synaptome listing. Column order mirrors the legacy
 * `ViewDefForSingleNeuronSynaptome`: Name, Description, ME-model, M-type, E-type,
 * Brain region, Species, Created by, Registration date.
 *
 * Per the legacy field-defs:
 *  - M-type / E-type are sourced from the linked ME-model, so both sort AND filter
 *    on the `me_model__…` relation keys (`me_model__mtype__pref_label` /
 *    `me_model__etype__pref_label`) — the synaptome-specific `perTypeConstraint`.
 *  - Created by sorts + facet-filters on `created_by__pref_label`.
 *  - ME-model name filters via the `me_model` facet (`me_model__name__in` /
 *    `me_model__name__ilike`); it is not server-sortable (absent from
 *    SingleNeuronSynaptomeFilter's ordering fields).
 *  - Species reads from the linked ME-model and filters on `me_model__species__name`.
 *    `me_model.species` is a filter key but NOT a facet key server-side, so this is a
 *    free-text ilike filter with no option list; it is not server-sortable either.
 *  - Description is DISPLAY-ONLY: no entitycore endpoint accepts a `description` param.
 */
export const singleNeuronSynaptomeSchema: IGridSchema<ISingleNeuronSynaptome> = {
  id: 'single-neuron-synaptome',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
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
    // AUXILIARY — hidden until ticked; each replaces an advanced filter one-for-one
    meModelValidationStatusColumn,
    // This listing shows Created by, not Contributors, so `contribution__pref_label`
    // gets an auxiliary column rather than the visible one. The row DOES carry the
    // list: `SingleNeuronSynaptomeRead` extends `EntityRead`, and `_load` eager-loads
    // `contributions → agent`.
    contributionsColumn<ISingleNeuronSynaptome>({
      auxiliary: true,
      sortable: false,
      filter: {
        // `contribution__pref_label__ilike`, `contribution__pref_label__in`
        operators: [OperatorId.Ilike, OperatorId.In],
        field: 'contribution__pref_label',
        // explicit target: this endpoint computes no `contribution` facet bucket, so
        // the synthesised "no options ⇒ use facets" target would be an empty picker
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
