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
import type { GridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type {
  HasContributions,
  HasMeasurements,
  HasPostMtype,
  HasPostRegion,
  HasPreMtype,
  HasPreRegion,
  HasSpecies,
  HasSubjectAge,
} from '../columns/catalog';
import type { EntityGridDefinition } from '../registry';

type Row = IExperimentalSynapsesPerConnection &
  HasPreRegion &
  HasPostRegion &
  HasPreMtype &
  HasPostMtype &
  HasSpecies &
  HasSubjectAge &
  HasMeasurements &
  HasContributions;

/**
 * Experimental synapses-per-connection listing. Column order matches the legacy
 * view-def (Brain Region [From]/[To], Cell Type [From]/[To], Mean ± STD, Species,
 * Age, Contributors). Mean ± STD and Age are not sortable here (no backend order key
 * for this entity). NB: the post-region filter serializes to the single-underscore
 * `post_region__name_in` — see `postSynapticRegionColumn`.
 */
export const experimentalSynapsesPerConnectionSchema: GridSchema<Row> = {
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
    subjectAgeColumn<Row>(),
    contributionsColumn<Row>(),
  ],
};

export const experimentalSynapsesPerConnectionGridDefinition: EntityGridDefinition<Row> = {
  dataType: EntityTypeDict.ExperimentalSynapsesPerConnection,
  schema: experimentalSynapsesPerConnectionSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
