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
 * ADVANCED FILTERS — `GET /experimental-neuron-density` params with no column at all:
 * just the record's own `id`, which has nothing useful to show in a cell.
 *
 * `subject__strain__name` and `subject__name` are now AUXILIARY columns below, so the
 * panel offers them only while they are hidden. `name` was ALSO declared here, as a
 * `recordNameFilter`, while this listing has always had a visible Name column that
 * owns `name` — a duplicate of the same field on two surfaces. It is gone: the Name
 * column is the one representation of that field, and there is no auxiliary column
 * for it.
 *
 * A density is NOT a ScientificArtifact (`app/filters/density.py` composes
 * `EntityFilterMixin` + `SubjectFilterMixin`, not `ScientificArtifactFilter`), so
 * this endpoint accepts none of `experiment_date__*`, `published_in*` or
 * `contact_email` — they are absent here on purpose, not by oversight.
 */
const experimentalNeuronDensityAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
];

/**
 * Experimental neuron density listing. Column order matches the legacy
 * `experimental-neuron-density` view-def (Brain region, Species, M-type, E-type,
 * Density, N° of measurements, Name, Age, Contributors, Registration date). The
 * "Density" value is the mean of the `measurements` array (not a queryable scalar),
 * so it is neither sortable nor filterable — matching legacy.
 *
 * Then two AUXILIARY columns — Strain, Subject name — hidden until the user ticks
 * them under "More columns", each carrying the filter it took over from the
 * advanced-filters panel.
 *
 * SORT SAFETY (`ExperimentalNeuronDensityFilter.Constants.ordering_model_fields` in
 * entitycore's `app/filters/density.py`): `subject__strain__name` IS in the allowlist
 * and sorts; `subject__name` is NOT, so Subject name is non-sortable — offering it
 * would 422 the whole listing.
 */
export const experimentalNeuronDensitySchema: IGridSchema<Row> = {
  id: 'experimental-neuron-density',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 56,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
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
    // AUXILIARY — hidden until ticked; each replaces an advanced filter one-for-one
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
