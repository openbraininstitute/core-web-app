import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

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

import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type { IGridSchema } from '../../../core';
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
