import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

import { SortDirection } from '../../../core';
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
import { lastUpdatedFilter, recordIdFilter, subjectAdvancedGroup } from './common-filters';

import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';
import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type {
  IHasContributions,
  IHasMeasurements,
  IHasSpecies,
  IHasSubjectAge,
} from '../columns/catalog';
import type { IEntityGridDefinition } from '../registry';

// The hand-written entity type omits runtime-present contributions; augment locally.
type Row = IExperimentalNeuronDensity &
  IHasSpecies &
  IHasSubjectAge &
  IHasMeasurements &
  IHasContributions;

/**
 * ADVANCED FILTERS — `GET /experimental-neuron-density` params with no column here.
 *
 * A density is NOT a ScientificArtifact (`app/filters/density.py` composes
 * `EntityFilterMixin` + `SubjectFilterMixin`, not `ScientificArtifactFilter`), so
 * this endpoint accepts none of `experiment_date__*`, `published_in*` or
 * `contact_email` — they are absent here on purpose, not by oversight.
 */
const experimentalNeuronDensityAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  subjectAdvancedGroup('The animal the density was measured in.'),
  {
    id: 'record',
    label: 'Record',
    filters: [recordIdFilter, lastUpdatedFilter],
  },
];

/**
 * Experimental neuron density listing. Column order matches the legacy
 * `experimental-neuron-density` view-def (Brain region, Species, M-type, E-type,
 * Density, N° of measurements, Name, Age, Contributors, Registration date). The
 * "Density" value is the mean of the `measurements` array (not a queryable scalar),
 * so it is neither sortable nor filterable — matching legacy.
 */
export const experimentalNeuronDensitySchema: IGridSchema<Row> = {
  id: 'experimental-neuron-density',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 56,
  selection: { enabled: true },
  advancedFilters: experimentalNeuronDensityAdvancedFilters,
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

export const experimentalNeuronDensityGridDefinition: IEntityGridDefinition<Row> = {
  dataType: EntityTypeDict.ExperimentalNeuronDensity,
  schema: experimentalNeuronDensitySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
