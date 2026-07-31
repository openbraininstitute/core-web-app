import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { Align, FilterOptionsKind, OperatorId, SortDirection } from '../../../core';
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
import type { IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * E-model listing (curated). Column order mirrors the legacy `ViewDefForEmodel`
 * view-def: Name, Response (preview), Brain region, Species, M-type, E-type,
 * Exemplar morphology, Model score, Contributors, Registration date.
 *
 * Per the legacy field-defs:
 *  - Species facet-filters on `species__name__in` (plus `species__name__ilike`) and IS
 *    server-sortable — `species__name` is in EModelFilter's ordering fields. E-model
 *    carries species at the top level (`r.species`), not under `subject`, so the value
 *    accessor reads it directly.
 *  - M-type / E-type sort + facet-filter on `mtype__pref_label` / `etype__pref_label`.
 *  - Contributors ARE sortable for e-model (`contribution__pref_label`).
 *  - Response is a preview of the entity itself (shared entity-preview renderer).
 *  - Exemplar morphology sorts on `exemplar_morphology__name` and filters via the
 *    `exemplar_morphology` facet (`exemplar_morphology__name__in` / `__ilike`).
 *  - Model score sorts on `score` and range-filters to `score__gte` / `score__lte`.
 */
export const emodelSchema: IGridSchema<IEModel> = {
  id: 'emodel',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
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
      sortable: true,
      sortField: 'species__name',
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
    mtypeColumn<IEModel>(),
    etypeColumn<IEModel>(),
    {
      id: 'exemplarMorphology',
      header: 'Morphology',
      sortable: true,
      sortField: 'exemplar_morphology__name',
      getValue: (r) => r.exemplar_morphology?.name ?? '',
      width: { minWidth: 160, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'exemplar_morphology__name',
        facetKey: 'exemplar_morphology',
        description: 'Exemplar morphology',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    {
      id: 'eModelScore',
      header: 'Model cumulated score',
      sortable: true,
      sortField: 'score',
      getValue: (r) => (r.score == null ? '' : String(r.score)),
      align: Align.Right,
      width: { minWidth: 150 },
      filter: { operators: [OperatorId.Range], field: 'score' },
    },
    contributionsColumn<IEModel>({ sortable: true, sortField: 'contribution__pref_label' }),
    registrationDateColumn<IEModel>(),
  ],
};

export const emodelGridDefinition: IEntityGridDefinition<IEModel> = {
  dataType: ExtendedEntitiesTypeDict.Emodel,
  schema: emodelSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
