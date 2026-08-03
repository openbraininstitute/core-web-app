import {
  CellMorphologyGenerationType,
  CellMorphologyProtocolDesign,
} from '@/api/entitycore/types/entities/cell-morphology-protocol';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { FilterOptionsKind, FreeEntryKind, OperatorId, SortDirection } from '../../../core';
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
import { flatAdvancedFilters, staticOptions } from './common-filters';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * ADVANCED FILTERS — `GET /cell-morphology` params with no column in this grid.
 *
 * Every field/operator pair below was checked against the live OpenAPI spec; the
 * emitted param is named in each comment. Nothing here is inferred from a naming
 * convention.
 */
const cellMorphologyAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [
      {
        id: 'id',
        label: 'ID',
        field: 'id',
        operators: [OperatorId.In, OperatorId.Eq],
      },
    ],
  },
  {
    id: 'protocol',
    label: 'Protocol',
    description: 'How each morphology was produced.',
    filters: [
      {
        id: 'generationType',
        label: 'Generation type',
        field: 'cell_morphology_protocol__generation_type',
        operators: [OperatorId.In, OperatorId.Eq],
        options: staticOptions(CellMorphologyGenerationType, [
          'computationally_synthesized',
          'modified_reconstruction',
        ]),
        description: 'This listing already excludes synthesized and modified morphologies',
      },
      {
        id: 'protocolDesign',
        label: 'Protocol design',
        field: 'cell_morphology_protocol__protocol_design',
        operators: [OperatorId.In, OperatorId.NotIn, OperatorId.Eq],
        options: staticOptions(CellMorphologyProtocolDesign),
        description: 'Experimental or computational design of the protocol',
      },
      {
        id: 'protocolName',
        label: 'Protocol name',
        field: 'cell_morphology_protocol__name',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a protocol name',
      },
      {
        id: 'protocolDocument',
        label: 'Protocol document',
        field: 'cell_morphology_protocol__protocol_document',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        description: 'Reference document describing the protocol',
        placeholder: 'Enter a document reference',
      },
    ],
  },
  {
    id: 'subject',
    label: 'Subject',
    description: 'The animal the morphology was reconstructed from.',
    filters: [
      {
        id: 'strainName',
        label: 'Strain',
        field: 'subject__strain__name',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a strain name',
      },
      {
        id: 'subjectName',
        label: 'Subject name',
        // `subject__name__ilike`, `subject__name__in`
        field: 'subject__name',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
      },
    ],
  },
  {
    id: 'record',
    label: 'Record',
    filters: [
      {
        id: 'hasSegmentedSpines',
        label: 'Segmented spines',
        // `has_segmented_spines` (boolean)
        field: 'has_segmented_spines',
        operators: [OperatorId.Bool],
        description: 'Whether dendritic spines are segmented in the reconstruction',
      },
    ],
  },
];

export const cellMorphologySchema: IGridSchema<ICellMorphology> = {
  id: 'cell-morphology',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
  advancedFilters: flatAdvancedFilters(cellMorphologyAdvancedFilters),
  columns: [
    previewColumn<ICellMorphology>({
      cellRenderer: 'cellMorphologyPreview',
      width: { width: 184, minWidth: 120, resizable: true },
    }),
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
          },
          {
            id: 'acronym',
            label: 'Acronym',
            field: 'brain_region__acronym',
            operators: [OperatorId.In],
            // Acronyms are not ids: without this the free-entry editor would reject
            // every token as a malformed UUID.
            freeEntry: FreeEntryKind.Text,
            description: 'Brain region acronym',
            placeholder: 'Paste one or more acronyms, like SSp-bfd',
          },
          {
            id: 'annotationValue',
            label: 'Annotation',
            field: 'brain_region__annotation_value',
            operators: [OperatorId.Eq],
            description: 'Brain region annotation value',
            placeholder: 'Enter an annotation value, like 329',
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
          },
        ],
      },
    }),
    nameColumn<ICellMorphology>({
      filter: {
        operators: [OperatorId.Ilike, OperatorId.In],
        field: 'name',
        targets: [
          {
            id: 'name',
            label: 'Name',
            field: 'name',
            operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
            description: 'Name',
            placeholder: 'Enter name',
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
