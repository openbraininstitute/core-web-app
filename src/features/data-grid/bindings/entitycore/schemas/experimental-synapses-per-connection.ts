import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import {
  contributionsColumn,
  meanStdColumn,
  nameColumn,
  postSynapticCellTypeColumn,
  postSynapticRegionColumn,
  preSynapticCellTypeColumn,
  preSynapticRegionColumn,
  speciesColumn,
  subjectAgeColumn,
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

import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type {
  IHasContributions,
  IHasMeasurements,
  IHasName,
  IHasPostMtype,
  IHasPostRegion,
  IHasPreMtype,
  IHasPreRegion,
  IHasSpecies,
  IHasSubjectAge,
  IHasSubjectName,
  IHasSubjectStrain,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IAdvancedFilterGroup, IColumnModel, IGridSchema } from '@/features/data-grid/core';
import type { CellRendererRegistry } from '@/features/data-grid/react';

type Row = IExperimentalSynapsesPerConnection &
  IHasName &
  IHasPreRegion &
  IHasPostRegion &
  IHasPreMtype &
  IHasPostMtype &
  IHasSpecies &
  IHasSubjectAge &
  IHasSubjectName &
  IHasSubjectStrain &
  IHasMeasurements &
  IHasContributions;

/**
 * Filterable fields with no column: the record's own `id` and the brain region's `id`.
 * This is not a ScientificArtifact endpoint, so `experiment_date__*`, `published_in*`
 * and `contact_email` do not exist here.
 */
const experimentalSynapsesPerConnectionAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
  {
    id: 'brainRegion',
    label: 'Brain region',
    description: 'The region the measurement itself is annotated with.',
    filters: [
      {
        id: 'id',
        label: 'Brain region ID',
        field: 'brain_region__id',
        operators: [OperatorId.In],
      },
    ],
  },
];

/**
 * The record's own brain region, as opposed to the pre/post regions of the connection.
 * Free-entry, not the shared brain-region factory: the only facet buckets this listing
 * returns are the pre/post ones, so a facet picker would render empty.
 */
const brainRegionNameColumn: IColumnModel<Row> = {
  id: 'brainRegionName',
  header: 'Brain region',
  auxiliary: true,
  sortable: true,
  sortField: 'brain_region__name',
  getValue: (r) => r.brain_region?.name ?? '',
  width: { minWidth: 150 },
  filter: {
    operators: [OperatorId.Ilike, OperatorId.In],
    field: 'brain_region__name',
    targets: [
      {
        id: 'name',
        label: 'Brain region',
        field: 'brain_region__name',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a brain region name',
      },
    ],
  },
};

const brainRegionAcronymColumn: IColumnModel<Row> = {
  id: 'brainRegionAcronym',
  header: 'Brain region acronym',
  auxiliary: true,
  sortable: true,
  sortField: 'brain_region__acronym',
  getValue: (r) => r.brain_region?.acronym ?? '',
  width: { minWidth: 150 },
  filter: {
    operators: [OperatorId.In, OperatorId.Eq],
    field: 'brain_region__acronym',
    targets: [
      {
        id: 'acronym',
        label: 'Brain region acronym',
        field: 'brain_region__acronym',
        operators: [OperatorId.In, OperatorId.Eq],
        // Acronyms are not UUIDs; the free-entry editor would reject them.
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Paste one or more acronyms, like SSp-bfd',
      },
    ],
  },
};

/**
 * Experimental synapses-per-connection listing
 * (`GET /experimental-synapses-per-connection`).
 *
 * Mean ± STD is non-sortable — the measurement scalars are absent from the endpoint's
 * ordering fields — but Age (`subject__age_value`) is in them.
 */
export const experimentalSynapsesPerConnectionSchema: IGridSchema<Row> = {
  id: 'experimental-synapses-per-connection',
  getRowId: (row) => row.id,
  defaultSort: [],
  rowHeight: 56,
  selection: { enabled: true },
  advancedFilters: flatAdvancedFilters(experimentalSynapsesPerConnectionAdvancedFilters),
  columns: [
    preSynapticRegionColumn<Row>(),
    postSynapticRegionColumn<Row>(),
    preSynapticCellTypeColumn<Row>(),
    postSynapticCellTypeColumn<Row>(),
    meanStdColumn<Row>(),
    speciesColumn<Row>(),
    subjectAgeColumn<Row>({ sortable: true }),
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
    brainRegionNameColumn,
    brainRegionAcronymColumn,
    // Neither subject field is in this endpoint's ordering fields.
    subjectStrainColumn<Row>({ sortable: false }),
    subjectNameColumn<Row>(),
  ],
};

export const experimentalSynapsesPerConnectionGridDefinition: IEntityGridDefinition<Row> = {
  dataType: EntityTypeDict.ExperimentalSynapsesPerConnection,
  schema: experimentalSynapsesPerConnectionSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
