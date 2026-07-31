import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import {
  brainRegionColumn,
  createdByColumn,
  nameColumn,
  registrationDateColumn,
} from '../columns/catalog';

import type { ISingleNeuronSynaptomeSimulation } from '@/api/entitycore/types/entities/single-neuron-synaptome-simulation';
import type { GridSchema } from '../../../core';
import type { EntityGridDefinition } from '../registry';

type Row = ISingleNeuronSynaptomeSimulation;

/**
 * Single-neuron synaptome simulation listing — a PLAIN listing (no expandable detail row).
 * Column order follows the legacy `view-defs/simulation/single-neuron-synaptome-simulation.ts`.
 *
 * Display-only columns (legacy field metadata):
 *  - Description: `isFilterable: false` (search-box constraint) → no column filter.
 *  - Stimulus / Response: preview-thumbnail cells in the legacy; the thumbnail renderer is
 *    deferred (renderers fence), so these are display-only placeholders preserving column
 *    identity/order. `filter: null` either way.
 *  - Synaptome name (SynaptomeModelName): `filter: null` → display-only; renders `synaptome.name`.
 *
 * Brain region (no filter; sortable — SingleNeuronSynaptomeSimulation is in `brain_region`'s
 * `order.types`), Created by (facet filter + server-sortable), and Registration date
 * (DateRange filter + sortable) carry the legacy filter/sort metadata.
 */
export const singleNeuronSynaptomeSimulationSchema: GridSchema<Row> = {
  id: 'single-neuron-synaptome-simulation',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: EntityCoreFields.RegistrationDate, direction: 'desc' }],
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
      id: EntityCoreFields.SynaptomeModelName,
      header: 'Synaptome name',
      align: 'left',
      getValue: (row) => row.synaptome?.name ?? '',
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

export const singleNeuronSynaptomeSimulationGridDefinition: EntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
  schema: singleNeuronSynaptomeSimulationSchema,
};
