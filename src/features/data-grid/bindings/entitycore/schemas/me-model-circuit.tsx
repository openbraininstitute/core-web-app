import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { SortDirection } from '../../../core';
import {
  MEMODEL_MORPHOLOGY_PREVIEW_RENDERER,
  MEModelMorphologyPreview,
} from '../renderers/me-model-cells';
import { registerSharedRenderers } from '../renderers/register';
import { buildMemodelColumns } from './memodel';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * ME-model-circuit listing. `me_model_circuit` reuses the ME-model view-def
 * (`ViewDefForMemodel`) verbatim — same rows (`IMEModel`), same columns, filters and
 * sorts — differing only in `dataType`. The shared {@link buildMemodelColumns} keeps
 * the two in lockstep.
 */
export const meModelCircuitSchema: IGridSchema<IMEModel> = {
  id: 'me-model-circuit',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
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
