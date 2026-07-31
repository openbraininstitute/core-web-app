import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { OperatorId } from '../../../core';
import {
  brainRegionColumn,
  contributionsColumn,
  etypeColumn,
  mtypeColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
} from '../columns/catalog';
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import { registerSharedRenderers } from '../renderers/register';

import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { GridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { EntityGridDefinition } from '../registry';

/**
 * E-model listing (curated). Column order mirrors the legacy `ViewDefForEmodel`
 * view-def: Name, Response (preview), Brain region, Species, M-type, E-type,
 * Exemplar morphology, Model score, Contributors, Registration date.
 *
 * Per the legacy field-defs:
 *  - Species is display + facet-filter (`species__name__in`) but NOT server-sortable
 *    for e-model (no `order_by` binding). E-model carries species at the top level
 *    (`r.species`), not under `subject`, so the value accessor reads it directly.
 *  - M-type / E-type sort + facet-filter on `mtype__pref_label` / `etype__pref_label`.
 *  - Contributors ARE sortable for e-model (`contribution__pref_label`).
 *  - Response is a preview of the entity itself (shared entity-preview renderer);
 *    Exemplar morphology (sort `exemplar_morphology__name`) and Model score
 *    (sort `score`) are display + sortable, with no column filter.
 */
export const emodelSchema: GridSchema<IEModel> = {
  id: 'emodel',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: 'desc' }],
  rowHeight: 118,
  selection: { enabled: true },
  columns: [
    nameColumn<IEModel>(),
    previewColumn<IEModel>({
      id: 'eModelResponse',
      header: 'Response',
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    brainRegionColumn<IEModel>(),
    {
      id: 'species',
      header: 'Species',
      getValue: (r) => r.species?.name ?? '',
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In],
        field: 'species__name',
        facetKey: 'species',
        description: 'Species',
        options: { kind: 'facets' },
      },
    },
    mtypeColumn<IEModel>(),
    etypeColumn<IEModel>(),
    {
      id: 'exemplarMorphology',
      header: 'Morphology',
      sortable: true,
      sortField: 'exemplar_morphology__name',
      getValue: (r) => r.exemplar_morphology?.name ?? '',
      width: { minWidth: 160, flex: 1 },
    },
    {
      id: 'eModelScore',
      header: 'Model cumulated score',
      sortable: true,
      sortField: 'score',
      getValue: (r) => (r.score == null ? '' : String(r.score)),
      align: 'right',
      width: { minWidth: 150 },
    },
    contributionsColumn<IEModel>({ sortable: true, sortField: 'contribution__pref_label' }),
    registrationDateColumn<IEModel>(),
  ],
};

export const emodelGridDefinition: EntityGridDefinition<IEModel> = {
  dataType: ExtendedEntitiesTypeDict.Emodel,
  schema: emodelSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
