import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

import { FreeEntryKind, OperatorId } from '../../../core';
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
} from '../columns/catalog';
import { lifecycleStatusColumn } from '../columns/lifecycle-status';
import { registerSharedRenderers } from '../renderers/register';
import { flatAdvancedFilters, recordIdFilter } from './common-filters';

import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type { IAdvancedFilterGroup, IColumnModel, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
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
} from '../columns/catalog';
import type { IEntityGridDefinition } from '../registry';

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
 * ADVANCED FILTERS — what is left once every filterable field that CAN be a column is
 * one: the record's own `id` and the brain region's `id`. Neither has a useful column
 * to show.
 *
 * `name`, `brain_region__name`, `brain_region__acronym`, `subject__strain__name` and
 * `subject__name` used to live here; they are AUXILIARY columns below, so each field
 * stays on exactly one surface — the panel still offers them while they are hidden.
 *
 * Not a ScientificArtifact (`app/filters/density.py`), so `experiment_date__*`,
 * `published_in*` and `contact_email` do not exist on this endpoint.
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
        // `brain_region__id__in`
        field: 'brain_region__id',
        operators: [OperatorId.In],
      },
    ],
  },
];

/**
 * The record's OWN brain region — the one the measurement is annotated with, as
 * opposed to the pre/post regions of the connection, which have their own columns.
 *
 * Free-entry rather than a facet picker, exactly as the advanced filter it replaces:
 * the facet buckets this listing returns are the pre/post ones, so a facet source
 * here would render an empty picker. That is also why these are declared inline
 * rather than built from the shared brain-region factory, whose whole point is the
 * facet bucket.
 */
const brainRegionNameColumn: IColumnModel<Row> = {
  id: 'brainRegionName',
  header: 'Brain region',
  auxiliary: true,
  // `brain_region__name` IS in ExperimentalSynapsesPerConnectionFilter's ordering fields
  sortable: true,
  sortField: 'brain_region__name',
  getValue: (r) => r.brain_region?.name ?? '',
  width: { minWidth: 150 },
  filter: {
    // `brain_region__name__ilike`, `brain_region__name__in`
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
  // `brain_region__acronym` IS in the ordering fields
  sortable: true,
  sortField: 'brain_region__acronym',
  getValue: (r) => r.brain_region?.acronym ?? '',
  width: { minWidth: 150 },
  filter: {
    // `brain_region__acronym__in`, `brain_region__acronym` (exact)
    operators: [OperatorId.In, OperatorId.Eq],
    field: 'brain_region__acronym',
    targets: [
      {
        id: 'acronym',
        label: 'Brain region acronym',
        field: 'brain_region__acronym',
        operators: [OperatorId.In, OperatorId.Eq],
        // Acronyms are not ids: without this every token is rejected as a bad UUID.
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Paste one or more acronyms, like SSp-bfd',
      },
    ],
  },
};

/**
 * Experimental synapses-per-connection listing. Column order matches the legacy
 * view-def (Brain Region [From]/[To], Cell Type [From]/[To], Mean ± STD, Species,
 * Age, Contributors). Mean ± STD is not sortable here (the measurement scalars are
 * absent from ExperimentalSynapsesPerConnectionFilter's ordering fields), but Age IS
 * (`subject__age_value`).
 *
 * Then five AUXILIARY columns, each carrying the filter it took over from the panel.
 * Name is legitimate as a column precisely because this listing has no Name column.
 *
 * SORT SAFETY (`ExperimentalSynapsesPerConnectionFilter.Constants.ordering_model_fields`,
 * `app/filters/density.py`): `name`, `brain_region__name` and `brain_region__acronym`
 * are in the allowlist; `subject__strain__name` and `subject__name` are NOT, so both
 * subject columns stay non-sortable — an `order_by` outside the list is a 422 that
 * fails the whole listing.
 */
export const experimentalSynapsesPerConnectionSchema: IGridSchema<Row> = {
  id: 'experimental-synapses-per-connection',
  getRowId: (row) => row.id,
  defaultSort: [],
  rowHeight: 56,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
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
    brainRegionNameColumn,
    brainRegionAcronymColumn,
    // neither subject field is in this endpoint's ordering_model_fields
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
