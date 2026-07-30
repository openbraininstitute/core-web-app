import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

import {
  brainRegionColumn,
  contributionsColumn,
  meanStdColumn,
  mtypeColumn,
  numberOfMeasurementsColumn,
  speciesColumn,
  standardErrorColumn,
} from '../columns/catalog';
import { registerSharedRenderers } from '../renderers/register';

import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import type { GridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { HasContributions, HasMeasurements, HasSpecies } from '../columns/catalog';
import type { EntityGridDefinition } from '../registry';

type Row = IExperimentalBoutonDensity & HasSpecies & HasMeasurements & HasContributions;

/**
 * Experimental bouton density listing. Column order matches the legacy
 * `experimental-bouton-density` view-def (Brain region, Species, M-type, Mean ± STD,
 * SEM, N° of measurements, Contributors). The three measurement columns sort on the
 * backend's `measurement_*__value` scalars.
 */
export const experimentalBoutonDensitySchema: GridSchema<Row> = {
  id: 'experimental-bouton-density',
  getRowId: (row) => row.id,
  defaultSort: [],
  rowHeight: 56,
  selection: { enabled: true },
  columns: [
    brainRegionColumn<Row>(),
    speciesColumn<Row>(),
    mtypeColumn<Row>(),
    meanStdColumn<Row>({ sortable: true }),
    standardErrorColumn<Row>(),
    numberOfMeasurementsColumn<Row>({
      sortable: true,
      sortField: 'measurement_sample_size__value',
    }),
    contributionsColumn<Row>(),
  ],
};

export const experimentalBoutonDensityGridDefinition: EntityGridDefinition<Row> = {
  dataType: EntityTypeDict.ExperimentalBoutonDensity,
  schema: experimentalBoutonDensitySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
