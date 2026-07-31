import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

import { FreeEntryKind, OperatorId } from '../../../core';
import {
  contributionsColumn,
  meanStdColumn,
  postSynapticCellTypeColumn,
  postSynapticRegionColumn,
  preSynapticCellTypeColumn,
  preSynapticRegionColumn,
  speciesColumn,
  subjectAgeColumn,
} from '../columns/catalog';
import { registerSharedRenderers } from '../renderers/register';
import {
  lastUpdatedFilter,
  recordIdFilter,
  recordNameFilter,
  registrationDateFilter,
  subjectAdvancedGroup,
} from './common-filters';

import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type {
  IHasContributions,
  IHasMeasurements,
  IHasPostMtype,
  IHasPostRegion,
  IHasPreMtype,
  IHasPreRegion,
  IHasSpecies,
  IHasSubjectAge,
} from '../columns/catalog';
import type { IEntityGridDefinition } from '../registry';

type Row = IExperimentalSynapsesPerConnection &
  IHasPreRegion &
  IHasPostRegion &
  IHasPreMtype &
  IHasPostMtype &
  IHasSpecies &
  IHasSubjectAge &
  IHasMeasurements &
  IHasContributions;

/**
 * ADVANCED FILTERS — `GET /experimental-synapses-per-connection` params with no
 * column here.
 *
 * The grid shows the PRE/POST regions but not the record's own `brain_region`, and
 * shows neither a Name nor a Registration date column, so all four families belong
 * here. `brain_region__name` is offered as free text rather than facets: the facet
 * buckets this listing returns are the pre/post ones its columns use, and a facet
 * source with no bucket would render an empty picker.
 *
 * Not a ScientificArtifact (`app/filters/density.py`), so `experiment_date__*`,
 * `published_in*` and `contact_email` do not exist on this endpoint.
 */
const experimentalSynapsesPerConnectionAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'brainRegion',
    label: 'Brain region',
    description: 'The region the measurement itself is annotated with.',
    filters: [
      {
        id: 'name',
        label: 'Name',
        // `brain_region__name__ilike`, `brain_region__name__in`
        field: 'brain_region__name',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a brain region name',
      },
      {
        id: 'acronym',
        label: 'Acronym',
        // `brain_region__acronym__in`, `brain_region__acronym` (exact)
        field: 'brain_region__acronym',
        operators: [OperatorId.In, OperatorId.Eq],
        // Acronyms are not ids: without this every token is rejected as a bad UUID.
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Paste one or more acronyms, like SSp-bfd',
      },
      {
        id: 'id',
        label: 'ID',
        // `brain_region__id__in`
        field: 'brain_region__id',
        operators: [OperatorId.In],
      },
    ],
  },
  subjectAdvancedGroup('The animal the connections were measured in.'),
  {
    id: 'record',
    label: 'Record',
    filters: [recordNameFilter, recordIdFilter, registrationDateFilter, lastUpdatedFilter],
  },
];

/**
 * Experimental synapses-per-connection listing. Column order matches the legacy
 * view-def (Brain Region [From]/[To], Cell Type [From]/[To], Mean ± STD, Species,
 * Age, Contributors). Mean ± STD is not sortable here (the measurement scalars are
 * absent from ExperimentalSynapsesPerConnectionFilter's ordering fields), but Age IS
 * (`subject__age_value`).
 */
export const experimentalSynapsesPerConnectionSchema: IGridSchema<Row> = {
  id: 'experimental-synapses-per-connection',
  getRowId: (row) => row.id,
  defaultSort: [],
  rowHeight: 56,
  selection: { enabled: true },
  advancedFilters: experimentalSynapsesPerConnectionAdvancedFilters,
  columns: [
    preSynapticRegionColumn<Row>(),
    postSynapticRegionColumn<Row>(),
    preSynapticCellTypeColumn<Row>(),
    postSynapticCellTypeColumn<Row>(),
    meanStdColumn<Row>(),
    speciesColumn<Row>(),
    subjectAgeColumn<Row>({ sortable: true }),
    contributionsColumn<Row>(),
  ],
};

export const experimentalSynapsesPerConnectionGridDefinition: IEntityGridDefinition<Row> = {
  dataType: EntityTypeDict.ExperimentalSynapsesPerConnection,
  schema: experimentalSynapsesPerConnectionSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
