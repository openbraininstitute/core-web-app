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
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import { registerSharedRenderers } from '../renderers/register';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { GridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { EntityGridDefinition } from '../registry';

/**
 * Synthesized cell morphology listing. A `cell_morphology` subtype (its rows ARE
 * `ICellMorphology`, narrowed server-side to the synthesized generation types by the
 * entity domain config), so its columns mirror the legacy
 * `ViewDefForSynthesizedCellMorphology` view-def exactly: Preview, Brain region,
 * Species, M-type, Name, Contributors, Registration date. Filters/sorts are the same
 * catalog bindings as `cell_morphology` (M-type IS server-sortable here, unlike
 * `universal_cell_morphology`). The synthesized narrow filter lives in the entity
 * domain config's `api.query.list`, so it is applied automatically by the delegating
 * data source — not restated here.
 */
export const synthesizedCellMorphologySchema: GridSchema<ICellMorphology> = {
  id: 'synthesized-cell-morphology',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: 'desc' }],
  rowHeight: 118,
  selection: { enabled: true },
  columns: [
    previewColumn<ICellMorphology>({
      cellRenderer: ENTITY_PREVIEW_RENDERER,
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

export const synthesizedCellMorphologyGridDefinition: EntityGridDefinition<ICellMorphology> = {
  dataType: ExtendedEntitiesTypeDict.SynthesizedCellMorphology,
  schema: synthesizedCellMorphologySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
