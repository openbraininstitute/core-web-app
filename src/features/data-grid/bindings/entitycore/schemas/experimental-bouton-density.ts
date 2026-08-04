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
 * ADVANCED FILTERS — what is left once every filterable field that CAN be a column
 * is one: the record's own `id`.
 *
 * `name`, `subject__strain__name` and `subject__name` used to live here; they are now
 * AUXILIARY columns below (hidden until ticked), which keeps each field on exactly
 * one surface — the panel still offers them for as long as they stay hidden. `id` has
 * no useful column to show, so it stays an advanced filter.
 *
 * A density is not a ScientificArtifact, so `experiment_date__*`, `published_in*`
 * and `contact_email` do not exist on this endpoint at all.
 */
const experimentalBoutonDensityAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
];

/**
 * Experimental bouton density listing. Column order matches the legacy
 * `experimental-bouton-density` view-def (Brain region, Species, M-type, Mean ± STD,
 * SEM, N° of measurements, Contributors). The three measurement columns sort on the
 * backend's `measurement_*__value` scalars.
 *
 * Then three AUXILIARY columns — Name, Strain, Subject name — hidden until the user
 * ticks them under "More columns", each carrying the filter it took over from the
 * advanced-filters panel. Name is legitimate here precisely because this listing has
 * no Name column of its own.
 *
 * SORT SAFETY (`ExperimentalBoutonDensityFilter.Constants.ordering_model_fields` in
 * entitycore's `app/filters/density.py`): `name` and `subject__strain__name` ARE in
 * the allowlist and sort; `subject__name` is NOT, so Subject name is non-sortable —
 * offering it would 422 the whole listing.
 */
export const experimentalBoutonDensitySchema: IGridSchema<Row> = {
  id: 'experimental-bouton-density',
  getRowId: (row) => row.id,
  defaultSort: [],
  rowHeight: 56,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
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
    // AUXILIARY — hidden until ticked; each replaces an advanced filter one-for-one
    nameColumn<Row>({
      auxiliary: true,
      filter: {
        // carried over from `recordNameFilter`: `name__ilike` / `name__in` / `name`
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
    // `subject__strain__name` IS in this endpoint's ordering_model_fields
    subjectStrainColumn<Row>({ sortable: true }),
    // `subject__name` is NOT — see the sort-safety note above
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
