import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { OperatorId } from '../../../core';
import {
  brainRegionColumn,
  createdByColumn,
  nameColumn,
  registrationDateColumn,
} from '../columns/catalog';
import { registerSharedRenderers } from '../renderers/register';

import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { GridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { EntityGridDefinition } from '../registry';

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
 *  - Description, ME-model name and Species are DISPLAY-ONLY here: description has no
 *    column filter (legacy `isFilterable: false`); ME-model name has `filter: null`;
 *    and Species has no `order_by`/facet binding for synaptome (its value is read
 *    from the linked ME-model for display).
 */
export const singleNeuronSynaptomeSchema: GridSchema<ISingleNeuronSynaptome> = {
  id: 'single-neuron-synaptome',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: 'desc' }],
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
    },
    {
      id: 'mtype',
      header: 'M-type',
      sortable: true,
      sortField: 'me_model__mtype__pref_label',
      getValue: (r) => labels(r.me_model?.mtypes),
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In],
        field: 'me_model__mtype__pref_label',
        facetKey: 'mtype',
        description: 'Morphological type',
        options: { kind: 'facets' },
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
        operators: [OperatorId.In],
        field: 'me_model__etype__pref_label',
        facetKey: 'etype',
        description: 'Electrical type',
        options: { kind: 'facets' },
      },
    },
    brainRegionColumn<ISingleNeuronSynaptome>(),
    {
      id: 'species',
      header: 'Species',
      getValue: (r) => r.me_model?.species?.name ?? '',
      width: { minWidth: 140, flex: 1 },
    },
    createdByColumn<ISingleNeuronSynaptome>({
      sortable: true,
      sortField: 'created_by__pref_label',
    }),
    registrationDateColumn<ISingleNeuronSynaptome>(),
  ],
};

export const singleNeuronSynaptomeGridDefinition: EntityGridDefinition<ISingleNeuronSynaptome> = {
  dataType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
  schema: singleNeuronSynaptomeSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
