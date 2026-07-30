import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

import {
  brainRegionColumn,
  emDatasetColumn,
  nameColumn,
  registrationDateColumn,
  releaseVersionColumn,
  speciesColumn,
} from '../columns/catalog';
import { EM_DATASET_RENDERER, EmDatasetCell } from '../renderers/em-dataset-cell';
import { registerSharedRenderers } from '../renderers/register';

import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';
import type { GridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { HasEmDataset, HasReleaseVersion, HasSpecies } from '../columns/catalog';
import type { EntityGridDefinition } from '../registry';

type Row = IEMCellMesh & HasSpecies & HasReleaseVersion & HasEmDataset;

/**
 * EM cell mesh listing (curated). Column order matches the legacy `em-cell-mesh`
 * view-def (Name, Brain region, Species, Version, Dataset, Registration date).
 * Species has no backend order key in the Data section, so it is not sortable here.
 * The "Dataset" column resolves the dense-reconstruction dataset name lazily via
 * {@link EM_DATASET_RENDERER}.
 */
export const emCellMeshSchema: GridSchema<Row> = {
  id: 'em-cell-mesh',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: 'desc' }],
  rowHeight: 56,
  selection: { enabled: true },
  columns: [
    nameColumn<Row>(),
    brainRegionColumn<Row>(),
    // Species has no backend order key for em-cell-mesh in the Data section, so it is
    // not sortable. Legacy also gates the species *filter* to the Simulate/Process/
    // Extract workflows; we keep it filterable here — an additive, backend-supported
    // capability (subject__species__name__in), not a parity regression.
    speciesColumn<Row>({ sortable: false }),
    releaseVersionColumn<Row>(),
    emDatasetColumn<Row>(),
    registrationDateColumn<Row>(),
  ],
};

export const emCellMeshGridDefinition: EntityGridDefinition<Row> = {
  dataType: EntityTypeDict.EMCellMesh,
  schema: emCellMeshSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
    registry.register(EM_DATASET_RENDERER, EmDatasetCell);
  },
};
