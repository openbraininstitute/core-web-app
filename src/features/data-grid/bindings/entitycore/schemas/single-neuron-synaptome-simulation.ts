import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  brainRegionColumn,
  createdByColumn,
  nameColumn,
  registrationDateColumn,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import { Align, FilterOptionsKind, OperatorId, SortDirection } from '@/features/data-grid/core';

import type { ISingleNeuronSynaptomeSimulation } from '@/api/entitycore/types/entities/single-neuron-synaptome-simulation';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IGridSchema } from '@/features/data-grid/core';

type Row = ISingleNeuronSynaptomeSimulation;

/**
 * Single-neuron synaptome simulation listing
 * (`GET /single-neuron-synaptome-simulation`), with no expandable detail row.
 *
 * Synaptome name filters via the `synaptome` facet but is not sortable —
 * `synaptome__name` is absent from this endpoint's ordering fields. Description,
 * Stimulus and Response are display-only.
 */
export const singleNeuronSynaptomeSimulationSchema: IGridSchema<Row> = {
  id: 'single-neuron-synaptome-simulation',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: EntityCoreFields.RegistrationDate, direction: SortDirection.Desc }],
  selection: { enabled: true },
  columns: [
    nameColumn<Row>({ id: EntityCoreFields.Name }),
    {
      id: EntityCoreFields.Description,
      header: 'Description',
      getValue: (row) => row.description ?? '',
      width: { minWidth: 200, flex: 2 },
    },
    {
      id: EntityCoreFields.SimulationStimulus,
      header: 'Stimulus',
      align: Align.Left,
      getValue: () => '',
      width: { width: 184, minWidth: 120 },
    },
    {
      id: EntityCoreFields.SimulationResponse,
      header: 'Response',
      align: Align.Left,
      getValue: () => '',
      width: { width: 184, minWidth: 120 },
    },
    {
      id: EntityCoreFields.SynaptomeModelName,
      header: 'Synaptome name',
      align: Align.Left,
      getValue: (row) => row.synaptome?.name ?? '',
      width: { minWidth: 160, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'synaptome__name',
        facetKey: 'synaptome',
        description: 'Synaptome',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    brainRegionColumn<Row>({ id: EntityCoreFields.BrainRegion }),
    lifecycleStatusColumn<Row>(),
    createdByColumn<Row>({
      id: EntityCoreFields.CreatedBy,
      sortable: true,
      sortField: 'created_by__pref_label',
    }),
    registrationDateColumn<Row>({ id: EntityCoreFields.RegistrationDate }),
  ],
};

export const singleNeuronSynaptomeSimulationGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
  schema: singleNeuronSynaptomeSimulationSchema,
};
