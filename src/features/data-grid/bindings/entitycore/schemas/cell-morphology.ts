import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { FilterOptionsKind, OperatorId, SortDirection } from '../../../core';
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
import { registerSharedRenderers } from '../renderers/register';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * Re-authored cell-morphology grid schema, composed from the shared column catalog.
 * Column order matches the legacy `viewDefForCellMorphology` exactly (Preview,
 * BrainRegion, Species, M-type, Name, Contributions, Registration date) for parity.
 * The narrow filter (`cell_morphology_protocol__generation_type__not_in`) lives in
 * the entity domain config's `api.query.list`, so it is applied automatically by the
 * delegating data source — not restated here.
 */
export const cellMorphologySchema: IGridSchema<ICellMorphology> = {
  id: 'cell-morphology',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  columns: [
    previewColumn<ICellMorphology>({
      cellRenderer: 'cellMorphologyPreview',
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    // ADVANCED targets are declared per-entity, not on the shared catalog factory:
    // the `__id__in` params below are confirmed on `GET /cell-morphology`, but the
    // same factories serve entities whose endpoints do not accept them. Each is
    // `advanced`, so it stays hidden until the grid enables advanced filters, and
    // `targets[0]` mirrors the factory's own filter so default behavior is unchanged.
    // `speciesColumn` already ships its own name/ID targets.
    brainRegionColumn<ICellMorphology>({
      filter: {
        targets: [
          {
            id: 'name',
            label: 'Name',
            field: 'brain_region__name',
            operators: [OperatorId.In, OperatorId.Ilike],
            facetKey: 'brain_region',
            description: 'Brain region',
            options: { kind: FilterOptionsKind.Facets },
          },
          {
            id: 'id',
            label: 'ID',
            field: 'brain_region__id',
            operators: [OperatorId.In],
            description: 'Brain region ID',
            advanced: true,
          },
        ],
      },
    }),
    speciesColumn<ICellMorphology>(),
    mtypeColumn<ICellMorphology>({
      filter: {
        targets: [
          {
            id: 'name',
            label: 'Name',
            field: 'mtype__pref_label',
            operators: [OperatorId.In, OperatorId.Ilike],
            facetKey: 'mtype',
            description: 'Morphological type',
            options: { kind: FilterOptionsKind.Facets },
          },
          {
            id: 'id',
            label: 'ID',
            field: 'mtype__id',
            operators: [OperatorId.In],
            description: 'M-type ID',
            advanced: true,
          },
        ],
      },
    }),
    // The Name column has no filter on the shared factory (free-text search is the
    // toolbar's job), so this adds one: match the morphology's own entity id — the
    // case that makes a pasted id from a link or a report resolvable in the listing.
    // The shared factory declares no filter, so the serializer falls back to the
    // column id (`name` → `name__ilike`). Declaring one here MUST keep that as
    // `targets[0]`, or the default changes wire params — the ID target is purely
    // additive, for resolving an id pasted from a link or a report.
    nameColumn<ICellMorphology>({
      filter: {
        operators: [OperatorId.Ilike],
        field: 'name',
        targets: [
          {
            id: 'name',
            label: 'Name',
            field: 'name',
            operators: [OperatorId.Ilike],
            description: 'Name',
          },
          {
            id: 'id',
            label: 'ID',
            field: 'id',
            operators: [OperatorId.In],
            description: 'Morphology ID',
            advanced: true,
          },
        ],
      },
    }),
    contributionsColumn<ICellMorphology>({
      filter: {
        targets: [
          {
            id: 'name',
            label: 'Name',
            field: 'contribution__pref_label',
            operators: [OperatorId.In, OperatorId.Ilike],
            facetKey: 'contribution',
            options: { kind: FilterOptionsKind.Facets },
          },
          {
            id: 'id',
            label: 'ID',
            field: 'contribution__id',
            operators: [OperatorId.In],
            description: 'Contributor ID',
            advanced: true,
          },
        ],
      },
    }),
    registrationDateColumn<ICellMorphology>(),
  ],
};

export const cellMorphologyGridDefinition: IEntityGridDefinition<ICellMorphology> = {
  dataType: ExtendedEntitiesTypeDict.CellMorphology,
  schema: cellMorphologySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
    registry.register('cellMorphologyPreview', CellMorphologyPreview);
  },
};
