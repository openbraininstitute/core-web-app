import {
  CellMorphologyGenerationType,
  CellMorphologyProtocolDesign,
} from '@/api/entitycore/types/entities/cell-morphology-protocol';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { FreeEntryKind, OperatorId, SortDirection } from '../../../core';
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
import {
  lastUpdatedFilter,
  recordIdFilter,
  staticOptions,
  subjectAdvancedGroup,
} from './common-filters';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * ADVANCED FILTERS — `GET /cell-morphology` params with no column in this grid.
 * Every field/operator pair was checked against the live OpenAPI spec; the emitted
 * param is named in each comment.
 */
const synthesizedCellMorphologyAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'protocol',
    label: 'Protocol',
    description: 'How each morphology was synthesized.',
    filters: [
      {
        id: 'generationType',
        label: 'Generation type',
        field: 'cell_morphology_protocol__generation_type',
        // `…__not_in` + `…` (exact). `…__in` is deliberately NOT offered: the entity
        // domain config pins `cell_morphology_protocol__generation_type__in`
        // unconditionally for this listing (see `protocolTypeFilter`) and host params
        // are merged AFTER filters, so a user's `__in` would be silently overwritten.
        // `__not_in` and the bare param are different param names and compose with it
        // correctly (intersection).
        operators: [OperatorId.NotIn, OperatorId.Eq],
        options: staticOptions(CellMorphologyGenerationType),
        description: 'This listing only ever contains synthesized, modified and placeholder cells',
      },
      {
        id: 'protocolDesign',
        label: 'Protocol design',
        field: 'cell_morphology_protocol__protocol_design',
        // `…__in`, `…__not_in`, `…` (exact)
        operators: [OperatorId.In, OperatorId.NotIn, OperatorId.Eq],
        options: staticOptions(CellMorphologyProtocolDesign),
        description: 'Experimental or computational design of the protocol',
      },
      {
        id: 'protocolName',
        label: 'Protocol name',
        field: 'cell_morphology_protocol__name',
        // `…__ilike`, `…__in`, `…` (exact)
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a protocol name',
      },
      {
        id: 'protocolDocument',
        label: 'Protocol document',
        field: 'cell_morphology_protocol__protocol_document',
        // `…__ilike`, `…__in`, `…` (exact)
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        description: 'Reference document describing the protocol',
        placeholder: 'Enter a document reference',
      },
      {
        id: 'protocolId',
        label: 'Protocol ID',
        field: 'cell_morphology_protocol__id',
        // `…__id__in`
        operators: [OperatorId.In],
        description: 'Exact protocol entity id',
      },
    ],
  },
  subjectAdvancedGroup('The animal the source morphology was reconstructed from.'),
  {
    id: 'record',
    label: 'Record',
    filters: [
      recordIdFilter,
      {
        id: 'hasSegmentedSpines',
        label: 'Segmented spines',
        // `has_segmented_spines` (boolean)
        field: 'has_segmented_spines',
        operators: [OperatorId.Bool],
        description: 'Whether dendritic spines are segmented in the reconstruction',
      },
      lastUpdatedFilter,
    ],
  },
];

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
export const synthesizedCellMorphologySchema: IGridSchema<ICellMorphology> = {
  id: 'synthesized-cell-morphology',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  advancedFilters: synthesizedCellMorphologyAdvancedFilters,
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

export const synthesizedCellMorphologyGridDefinition: IEntityGridDefinition<ICellMorphology> = {
  dataType: ExtendedEntitiesTypeDict.SynthesizedCellMorphology,
  schema: synthesizedCellMorphologySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
