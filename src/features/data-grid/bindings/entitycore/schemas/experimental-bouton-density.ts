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
import {
  lastUpdatedFilter,
  recordIdFilter,
  recordNameFilter,
  registrationDateFilter,
  subjectAdvancedGroup,
} from './common-filters';

import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IHasContributions, IHasMeasurements, IHasSpecies } from '../columns/catalog';
import type { IEntityGridDefinition } from '../registry';

type Row = IExperimentalBoutonDensity & IHasSpecies & IHasMeasurements & IHasContributions;

/**
 * ADVANCED FILTERS — `GET /experimental-bouton-density` params with no column here.
 *
 * This listing shows neither a Name nor a Registration date column, so `name*` and
 * `creation_date__gte/__lte` genuinely have no home on a column and belong here.
 * A density is not a ScientificArtifact, so `experiment_date__*`, `published_in*`
 * and `contact_email` do not exist on this endpoint at all.
 */
const experimentalBoutonDensityAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  subjectAdvancedGroup('The animal the density was measured in.'),
  {
    id: 'record',
    label: 'Record',
    filters: [recordNameFilter, recordIdFilter, registrationDateFilter, lastUpdatedFilter],
  },
];

/**
 * Experimental bouton density listing. Column order matches the legacy
 * `experimental-bouton-density` view-def (Brain region, Species, M-type, Mean ± STD,
 * SEM, N° of measurements, Contributors). The three measurement columns sort on the
 * backend's `measurement_*__value` scalars.
 */
export const experimentalBoutonDensitySchema: IGridSchema<Row> = {
  id: 'experimental-bouton-density',
  getRowId: (row) => row.id,
  defaultSort: [],
  rowHeight: 56,
  selection: { enabled: true },
  advancedFilters: experimentalBoutonDensityAdvancedFilters,
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

export const experimentalBoutonDensityGridDefinition: IEntityGridDefinition<Row> = {
  dataType: EntityTypeDict.ExperimentalBoutonDensity,
  schema: experimentalBoutonDensitySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
