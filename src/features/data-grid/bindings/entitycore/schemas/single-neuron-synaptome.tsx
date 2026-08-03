import { ValidationStatus } from '@/api/entitycore/types/entities/me-model';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { FilterOptionsKind, FreeEntryKind, OperatorId, SortDirection } from '../../../core';
import {
  brainRegionColumn,
  createdByColumn,
  nameColumn,
  registrationDateColumn,
} from '../columns/catalog';
import { registerSharedRenderers } from '../renderers/register';
import { flatAdvancedFilters, recordIdFilter } from './common-filters';

import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * ADVANCED FILTERS — `GET /single-neuron-synaptome` params with no column here.
 *
 * Everything the synaptome can be filtered by beyond its own name lives under the
 * linked ME-model (`SingleNeuronSynaptomeFilter` nests `NestedMEModelFilter` with
 * the `me_model` prefix), so every param below is `me_model__…`. Each was checked
 * against the live OpenAPI spec and is named in a comment.
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
        id: 'validationStatus',
        label: 'ME-model validation status',
        // `me_model__validation_status` (exact) ONLY — no list form on this endpoint.
        field: 'me_model__validation_status',
        operators: [OperatorId.Eq],
        options: {
          kind: FilterOptionsKind.Static,
          items: [
            { id: ValidationStatus.Created, label: 'Created' },
            { id: ValidationStatus.Initialized, label: 'Initialized' },
            { id: ValidationStatus.Running, label: 'Running' },
            { id: ValidationStatus.Done, label: 'Done' },
            { id: ValidationStatus.Error, label: 'Error' },
          ],
        },
      },
      {
        id: 'strainName',
        label: 'Strain',
        // `me_model__strain__name__ilike`, `me_model__strain__name__in`
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
    description: "The reconstruction inside the synaptome's ME-model.",
    filters: [
      {
        id: 'name',
        label: 'Morphology name',
        // `me_model__morphology__name__ilike`, `…__name__in`, `…__name`
        field: 'me_model__morphology__name',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a morphology name',
      },
      {
        id: 'hasSegmentedSpines',
        label: 'Segmented spines',
        // `me_model__morphology__has_segmented_spines` (boolean)
        field: 'me_model__morphology__has_segmented_spines',
        operators: [OperatorId.Bool],
        description: 'Whether the morphology has segmented dendritic spines',
      },
    ],
  },
  {
    id: 'emodel',
    label: 'E-model',
    description: "The e-model inside the synaptome's ME-model.",
    filters: [
      {
        id: 'name',
        label: 'E-model name',
        // `me_model__emodel__name__ilike`, `…__name__in`, `…__name`
        field: 'me_model__emodel__name',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter an e-model name',
      },
      {
        id: 'score',
        label: 'E-model score',
        // `me_model__emodel__score__gte` / `…__score__lte`
        field: 'me_model__emodel__score',
        operators: [OperatorId.Range],
        description: 'Bounds on the e-model cumulated score',
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
    createdByColumn<ISingleNeuronSynaptome>({
      sortable: true,
      sortField: 'created_by__pref_label',
    }),
    registrationDateColumn<ISingleNeuronSynaptome>(),
  ],
};

export const singleNeuronSynaptomeGridDefinition: IEntityGridDefinition<ISingleNeuronSynaptome> = {
  dataType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
  schema: singleNeuronSynaptomeSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
