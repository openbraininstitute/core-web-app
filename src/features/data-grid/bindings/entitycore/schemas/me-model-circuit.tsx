import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { SortDirection } from '../../../core';
import {
  MEMODEL_MORPHOLOGY_PREVIEW_RENDERER,
  MEModelMorphologyPreview,
} from '../renderers/me-model-cells';
import { registerSharedRenderers } from '../renderers/register';
import { flatAdvancedFilters } from './common-filters';
import { buildMemodelColumns, memodelAdvancedFilters } from './memodel';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * ME-model-circuit listing. Identical to the ME-model listing but for `dataType`, so it
 * reuses {@link buildMemodelColumns} and {@link memodelAdvancedFilters}.
 */
export const meModelCircuitSchema: IGridSchema<IMEModel> = {
  id: 'me-model-circuit',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  advancedFilters: flatAdvancedFilters(memodelAdvancedFilters),
  columns: buildMemodelColumns(),
};

export const meModelCircuitGridDefinition: IEntityGridDefinition<IMEModel> = {
  dataType: ExtendedEntitiesTypeDict.MemodelCircuit,
  schema: meModelCircuitSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
    registry.register(MEMODEL_MORPHOLOGY_PREVIEW_RENDERER, MEModelMorphologyPreview);
  },
};
