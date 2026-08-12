import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
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
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import { registerSharedRenderers } from '@/features/data-grid/bindings/entitycore/renderers/register';
import {
  flatAdvancedFilters,
  recordIdFilter,
} from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import { FreeEntryKind, OperatorId } from '@/features/data-grid/core';

import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import type {
  IHasContributions,
  IHasMeasurements,
  IHasName,
  IHasSpecies,
  IHasSubjectName,
  IHasSubjectStrain,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IAdvancedFilterGroup, IGridSchema } from '@/features/data-grid/core';
import type { CellRendererRegistry } from '@/features/data-grid/react';

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
    meanStdColumn<Row>({ sortable: true, width: { width: 160, minWidth: 155 } }),
    standardErrorColumn<Row>({
      width: { width: 100, minWidth: 100 },
    }),
    numberOfMeasurementsColumn<Row>({
      sortable: true,
      sortField: 'measurement_sample_size__value',
      width: { width: 152, minWidth: 152 },
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
