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
  subjectNameColumn,
  subjectStrainColumn,
} from '../columns/catalog';
import { lifecycleStatusColumn } from '../columns/lifecycle-status';
import { registerSharedRenderers } from '../renderers/register';
import { flatAdvancedFilters, recordIdFilter } from './common-filters';

import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';
import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type {
  IHasContributions,
  IHasMeasurements,
  IHasSpecies,
  IHasSubjectAge,
  IHasSubjectName,
  IHasSubjectStrain,
} from '../columns/catalog';
import type { IEntityGridDefinition } from '../registry';

// The hand-written entity type omits runtime-present contributions; augment locally.
type Row = IExperimentalNeuronDensity &
  IHasSpecies &
  IHasSubjectAge &
  IHasSubjectName &
  IHasSubjectStrain &
  IHasMeasurements &
  IHasContributions;

/**
 * `GET /experimental-neuron-density` params with no column: just the record's own `id`.
 * A density is not a ScientificArtifact, so this endpoint accepts none of
 * `experiment_date__*`, `published_in*` or `contact_email`.
 */
const experimentalNeuronDensityAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
];

/**
 * Experimental neuron density listing (`GET /experimental-neuron-density`). Density is
 * the mean of the `measurements` array, not a queryable scalar, so it is neither
 * sortable nor filterable.
 */
export const experimentalNeuronDensitySchema: IGridSchema<Row> = {
  id: 'experimental-neuron-density',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 56,
  selection: { enabled: true },
  advancedFilters: flatAdvancedFilters(experimentalNeuronDensityAdvancedFilters),
  columns: [
    brainRegionColumn<Row>(),
    speciesColumn<Row>(),
    mtypeColumn<Row>(),
    etypeColumn<Row>(),
    densityColumn<Row>(),
    numberOfMeasurementsColumn<Row>(),
    nameColumn<Row>(),
    subjectAgeColumn<Row>({ sortable: true }),
    lifecycleStatusColumn<Row>(),
    contributionsColumn<Row>(),
    registrationDateColumn<Row>(),
    // Auxiliary — hidden until ticked. `subject__strain__name` is in this endpoint's
    // ordering fields; `subject__name` is not.
    subjectStrainColumn<Row>({ sortable: true }),
    subjectNameColumn<Row>(),
  ],
};

export const experimentalNeuronDensityGridDefinition: IEntityGridDefinition<Row> = {
  dataType: EntityTypeDict.ExperimentalNeuronDensity,
  schema: experimentalNeuronDensitySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
