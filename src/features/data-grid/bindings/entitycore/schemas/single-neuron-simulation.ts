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

import type { ISingleNeuronSimulation } from '@/api/entitycore/types/entities/single-neuron-simulation';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IGridSchema } from '@/features/data-grid/core';

type Row = ISingleNeuronSimulation;

/** Join a string-array location field. */
function joinLocations(values: Array<string> | null | undefined): string {
  return (values ?? []).filter(Boolean).join(', ');
}

/**
 * Single-neuron simulation listing (`GET /single-neuron-simulation`), with no
 * expandable detail row.
 *
 * ME-model filters via the `me_model` facet but is not sortable — `me_model__name` is
 * absent from this endpoint's ordering fields. Stimulus and Response are placeholders
 * pending a thumbnail renderer; the location columns are display-only.
 */
export const singleNeuronSimulationSchema: IGridSchema<Row> = {
  id: 'single-neuron-simulation',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: EntityCoreFields.RegistrationDate, direction: SortDirection.Desc }],
  // No selection: parity with legacy listing (no checkbox column).
  selection: { enabled: false },
  columns: [
    nameColumn<Row>({ id: EntityCoreFields.Name }),
    {
      id: EntityCoreFields.SimulationModel,
      header: 'ME-model',
      getValue: (row) => row.me_model?.name ?? '',
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
      id: EntityCoreFields.InjectionLocation,
      header: 'Injection location',
      align: Align.Left,
      getValue: (row) =>
        joinLocations(
          (row as unknown as { injection_location?: Array<string> }).injection_location
        ),
      width: { minWidth: 160, flex: 1 },
    },
    {
      id: EntityCoreFields.RecordingLocation,
      header: 'Recording location',
      align: Align.Left,
      getValue: (row) =>
        joinLocations(
          (row as unknown as { recording_location?: Array<string> }).recording_location
        ),
      width: { minWidth: 160, flex: 1 },
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

export const singleNeuronSimulationGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
  schema: singleNeuronSimulationSchema,
};
