import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import {
  brainRegionColumn,
  createdByColumn,
  nameColumn,
  registrationDateColumn,
} from '../columns/catalog';

import type { ISingleNeuronSimulation } from '@/api/entitycore/types/entities/single-neuron-simulation';
import type { GridSchema } from '../../../core';
import type { EntityGridDefinition } from '../registry';

type Row = ISingleNeuronSimulation;

/** Join a string-array location field, matching the legacy `renderArray`. */
function joinLocations(values: Array<string> | null | undefined): string {
  return (values ?? []).filter(Boolean).join(', ');
}

/**
 * Single-neuron simulation listing — a PLAIN listing (no expandable detail row; unlike the
 * circuit-simulation campaigns, an individual simulation has no nested scan table). Column
 * order follows the legacy `view-defs/simulation/single-neuron-simulation.ts`.
 *
 * Every simulation-specific column is display-only (all `fields-defs/experiment.tsx` entries
 * are `filter: null`):
 *  - ME-model (SimulationModel): renders `me_model.name`.
 *  - Stimulus / Response: the legacy renders preview thumbnails; the thumbnail cell renderer
 *    is deferred (out of the renderers fence), so these are display-only placeholders that
 *    preserve column identity/order. No filter/sort either way.
 *  - Injection / Recording location: joined string arrays, display-only.
 *
 * Brain region (no filter; sortable — SingleNeuronSimulation is in `brain_region`'s
 * `order.types`), Created by (facet filter + server-sortable), and Registration date
 * (DateRange filter + sortable) carry the legacy filter/sort metadata.
 */
export const singleNeuronSimulationSchema: GridSchema<Row> = {
  id: 'single-neuron-simulation',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: EntityCoreFields.RegistrationDate, direction: 'desc' }],
  selection: { enabled: true },
  columns: [
    nameColumn<Row>({ id: EntityCoreFields.Name }),
    {
      id: EntityCoreFields.SimulationModel,
      header: 'ME-model',
      getValue: (row) => row.me_model?.name ?? '',
      width: { minWidth: 160, flex: 1 },
    },
    {
      id: EntityCoreFields.SimulationStimulus,
      header: 'Stimulus',
      align: 'left',
      getValue: () => '',
      width: { width: 184, minWidth: 120 },
    },
    {
      id: EntityCoreFields.SimulationResponse,
      header: 'Response',
      align: 'left',
      getValue: () => '',
      width: { width: 184, minWidth: 120 },
    },
    {
      id: EntityCoreFields.InjectionLocation,
      header: 'Injection location',
      align: 'left',
      getValue: (row) =>
        joinLocations(
          (row as unknown as { injection_location?: Array<string> }).injection_location
        ),
      width: { minWidth: 160, flex: 1 },
    },
    {
      id: EntityCoreFields.RecordingLocation,
      header: 'Recording location',
      align: 'left',
      getValue: (row) =>
        joinLocations(
          (row as unknown as { recording_location?: Array<string> }).recording_location
        ),
      width: { minWidth: 160, flex: 1 },
    },
    brainRegionColumn<Row>({ id: EntityCoreFields.BrainRegion }),
    createdByColumn<Row>({
      id: EntityCoreFields.CreatedBy,
      sortable: true,
      sortField: 'created_by__pref_label',
    }),
    registrationDateColumn<Row>({ id: EntityCoreFields.RegistrationDate }),
  ],
};

export const singleNeuronSimulationGridDefinition: EntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
  schema: singleNeuronSimulationSchema,
};
