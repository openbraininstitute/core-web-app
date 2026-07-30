import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

import {
  brainRegionColumn,
  contributionsColumn,
  densityColumn,
  etypeColumn,
  mtypeColumn,
  nameColumn,
  numberOfMeasurementsColumn,
  registrationDateColumn,
  speciesColumn,
  subjectAgeColumn,
} from '../columns/catalog';
import { registerSharedRenderers } from '../renderers/register';

import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';
import type { GridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type {
  HasContributions,
  HasMeasurements,
  HasSpecies,
  HasSubjectAge,
} from '../columns/catalog';
import type { EntityGridDefinition } from '../registry';

// The hand-written entity type omits runtime-present contributions; augment locally.
type Row = IExperimentalNeuronDensity &
  HasSpecies &
  HasSubjectAge &
  HasMeasurements &
  HasContributions;

/**
 * Experimental neuron density listing. Column order matches the legacy
 * `experimental-neuron-density` view-def (Brain region, Species, M-type, E-type,
 * Density, N° of measurements, Name, Age, Contributors, Registration date). The
 * "Density" value is the mean of the `measurements` array (not a queryable scalar),
 * so it is neither sortable nor filterable — matching legacy.
 */
export const experimentalNeuronDensitySchema: GridSchema<Row> = {
  id: 'experimental-neuron-density',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: 'desc' }],
  rowHeight: 56,
  selection: { enabled: true },
  columns: [
    brainRegionColumn<Row>(),
    speciesColumn<Row>(),
    mtypeColumn<Row>(),
    etypeColumn<Row>(),
    densityColumn<Row>(),
    numberOfMeasurementsColumn<Row>(),
    nameColumn<Row>(),
    subjectAgeColumn<Row>({ sortable: true }),
    contributionsColumn<Row>(),
    registrationDateColumn<Row>(),
  ],
};

export const experimentalNeuronDensityGridDefinition: EntityGridDefinition<Row> = {
  dataType: EntityTypeDict.ExperimentalNeuronDensity,
  schema: experimentalNeuronDensitySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
