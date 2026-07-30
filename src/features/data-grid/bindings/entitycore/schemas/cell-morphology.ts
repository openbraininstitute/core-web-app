import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import {
  brainRegionColumn,
  contributionsColumn,
  mtypeColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
  speciesColumn,
} from '../columns/catalog';
import { CellMorphologyPreview } from '../renderers/cell-morphology-cells';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { GridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { EntityGridDefinition } from '../registry';

/**
 * Re-authored cell-morphology grid schema, composed from the shared column catalog.
 * Column order matches the legacy `viewDefForCellMorphology` exactly (Preview,
 * BrainRegion, Species, M-type, Name, Contributions, Registration date) for parity.
 * The narrow filter (`cell_morphology_protocol__generation_type__not_in`) lives in
 * the entity domain config's `api.query.list`, so it is applied automatically by the
 * delegating data source — not restated here.
 */
export const cellMorphologySchema: GridSchema<ICellMorphology> = {
  id: 'cell-morphology',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: 'desc' }],
  rowHeight: 118,
  selection: { enabled: true },
  columns: [
    previewColumn<ICellMorphology>({
      cellRenderer: 'cellMorphologyPreview',
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    brainRegionColumn<ICellMorphology>(),
    speciesColumn<ICellMorphology>(),
    mtypeColumn<ICellMorphology>(),
    nameColumn<ICellMorphology>(),
    contributionsColumn<ICellMorphology>(),
    registrationDateColumn<ICellMorphology>(),
  ],
};

export const cellMorphologyGridDefinition: EntityGridDefinition<ICellMorphology> = {
  dataType: ExtendedEntitiesTypeDict.CellMorphology,
  schema: cellMorphologySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registry.register('cellMorphologyPreview', CellMorphologyPreview);
  },
};
