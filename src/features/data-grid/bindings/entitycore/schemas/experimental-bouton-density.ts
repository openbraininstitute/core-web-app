import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

import { FreeEntryKind, OperatorId } from '../../../core';
import {
  brainRegionColumn,
  contributionsColumn,
  meanStdColumn,
  mtypeColumn,
  nameColumn,
  numberOfMeasurementsColumn,
  speciesColumn,
  standardErrorColumn,
  subjectNameColumn,
  subjectStrainColumn,
} from '../columns/catalog';
import { lifecycleStatusColumn } from '../columns/lifecycle-status';
import { registerSharedRenderers } from '../renderers/register';
import { flatAdvancedFilters, recordIdFilter } from './common-filters';

import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type {
  IHasContributions,
  IHasMeasurements,
  IHasName,
  IHasSpecies,
  IHasSubjectName,
  IHasSubjectStrain,
} from '../columns/catalog';
import type { IEntityGridDefinition } from '../registry';

type Row = IExperimentalBoutonDensity &
  IHasName &
  IHasSpecies &
  IHasSubjectName &
  IHasSubjectStrain &
  IHasMeasurements &
  IHasContributions;

/**
 * Filterable fields with no column: just the record's own `id`. A density is not a
 * ScientificArtifact, so `experiment_date__*`, `published_in*` and `contact_email` do
 * not exist on this endpoint.
 */
const experimentalBoutonDensityAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
];

/**
 * Experimental bouton density listing (`GET /experimental-bouton-density`). The three
 * measurement columns sort on the backend's `measurement_*__value` scalars.
 */
export const experimentalBoutonDensitySchema: IGridSchema<Row> = {
  id: 'experimental-bouton-density',
  getRowId: (row) => row.id,
  defaultSort: [],
  rowHeight: 56,
  selection: { enabled: true },
  advancedFilters: flatAdvancedFilters(experimentalBoutonDensityAdvancedFilters),
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
    lifecycleStatusColumn<Row>(),
    contributionsColumn<Row>(),
    // Auxiliary — hidden until ticked; each replaces an advanced filter.
    nameColumn<Row>({
      auxiliary: true,
      filter: {
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        field: 'name',
        targets: [
          {
            id: 'name',
            label: 'Name',
            field: 'name',
            operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
            freeEntry: FreeEntryKind.Text,
            placeholder: 'Enter a name',
          },
        ],
      },
    }),
    // `subject__strain__name` is in this endpoint's ordering fields; `subject__name`
    // is not, so Subject name stays non-sortable.
    subjectStrainColumn<Row>({ sortable: true }),
    subjectNameColumn<Row>(),
  ],
};

export const experimentalBoutonDensityGridDefinition: IEntityGridDefinition<Row> = {
  dataType: EntityTypeDict.ExperimentalBoutonDensity,
  schema: experimentalBoutonDensitySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
