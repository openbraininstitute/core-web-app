import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  MEMODEL_MORPHOLOGY_PREVIEW_RENDERER,
  MEModelMorphologyPreview,
} from '@/features/data-grid/bindings/entitycore/renderers/me-model-cells';
import { registerSharedRenderers } from '@/features/data-grid/bindings/entitycore/renderers/register';
import { flatAdvancedFilters } from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import {
  buildMemodelColumns,
  memodelAdvancedFilters,
} from '@/features/data-grid/bindings/entitycore/schemas/memodel';
import { SortDirection } from '@/features/data-grid/core';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IGridSchema } from '@/features/data-grid/core';
import type { CellRendererRegistry } from '@/features/data-grid/react';

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
