import { ValidationStatus } from '@/api/entitycore/types/entities/me-model';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { FilterOptionsKind, OperatorId, SortDirection } from '../../../core';
import {
  brainRegionColumn,
  createdByColumn,
  etypeColumn,
  mtypeColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
} from '../columns/catalog';
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import {
  MEMODEL_MORPHOLOGY_PREVIEW_RENDERER,
  MEModelMorphologyPreview,
} from '../renderers/me-model-cells';
import { registerSharedRenderers } from '../renderers/register';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { IColumnModel, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * Shared ME-model column set. Both `memodel` and `me_model_circuit` list ME-model
 * rows (`IMEModel`) with the SAME columns (legacy `ViewDefForMemodel`), so the
 * column definitions live here once and are reused by both grid definitions.
 *
 * Per the legacy field-defs:
 *  - Two preview columns: "Morphology" previews the NESTED morphology sub-entity
 *    (bespoke renderer), "Trace" previews the ME-model row itself (shared renderer).
 *  - "Validated" is a display-only True/False derived from `validation_status`.
 *  - Brain region sorts on `brain_region__name` (no column filter — handled by the
 *    brain-region hierarchy selector).
 *  - Species is display + facet-filter (`species__name__in` / `species__name__ilike`)
 *    but NOT server-sortable for me-model (`species__name` is absent from
 *    MEModelFilter's ordering fields); the value is read from the top-level `species`,
 *    not `subject`.
 *  - M-type / E-type sort + facet-filter on `mtype__pref_label` / `etype__pref_label`.
 *  - Created by sorts + facet-filters on `created_by__pref_label`.
 */
export function buildMemodelColumns(): Array<IColumnModel<IMEModel>> {
  return [
    nameColumn<IMEModel>(),
    previewColumn<IMEModel>({
      id: 'meModelMorphologyPreview',
      header: 'Morphology',
      cellRenderer: MEMODEL_MORPHOLOGY_PREVIEW_RENDERER,
      width: { width: 196, minWidth: 120, resizable: true },
    }),
    previewColumn<IMEModel>({
      id: 'meModelTracePreview',
      header: 'Trace',
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    {
      id: 'validationStatus',
      header: 'Validated',
      getValue: (r) => (r.validation_status === ValidationStatus.Done ? 'True' : 'False'),
      width: { minWidth: 100 },
    },
    brainRegionColumn<IMEModel>(),
    {
      id: 'species',
      header: 'Species',
      getValue: (r) => r.species?.name ?? '',
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'species__name',
        facetKey: 'species',
        description: 'Species',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    mtypeColumn<IMEModel>(),
    etypeColumn<IMEModel>(),
    createdByColumn<IMEModel>({ sortable: true, sortField: 'created_by__pref_label' }),
    registrationDateColumn<IMEModel>(),
  ];
}

export const memodelSchema: IGridSchema<IMEModel> = {
  id: 'memodel',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  columns: buildMemodelColumns(),
};

export const memodelGridDefinition: IEntityGridDefinition<IMEModel> = {
  dataType: ExtendedEntitiesTypeDict.Memodel,
  schema: memodelSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
    registry.register(MEMODEL_MORPHOLOGY_PREVIEW_RENDERER, MEModelMorphologyPreview);
  },
};
