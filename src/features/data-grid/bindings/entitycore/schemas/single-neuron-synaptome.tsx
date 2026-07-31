import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { FilterOptionsKind, OperatorId, SortDirection } from '../../../core';
import {
  brainRegionColumn,
  createdByColumn,
  nameColumn,
  registrationDateColumn,
} from '../columns/catalog';
import { registerSharedRenderers } from '../renderers/register';

import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

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
