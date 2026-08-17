import {
  CellMorphologyGenerationType,
  CellMorphologyProtocolDesign,
} from '@/api/entitycore/types/entities/cell-morphology-protocol';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  brainRegionColumn,
  contributionsColumn,
  mtypeColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
  speciesColumn,
  subjectNameColumn,
  subjectStrainColumn,
  yesNo,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import { CellMorphologyPreview } from '@/features/data-grid/bindings/entitycore/renderers/cell-morphology-cells';
import { registerSharedRenderers } from '@/features/data-grid/bindings/entitycore/renderers/register';
import {
  dictLabelByKey,
  flatAdvancedFilters,
  staticOptions,
} from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import {
  FilterOptionsKind,
  FreeEntryKind,
  OperatorId,
  SortDirection,
} from '@/features/data-grid/core';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IAdvancedFilterGroup, IColumnModel, IGridSchema } from '@/features/data-grid/core';
import type { CellRendererRegistry } from '@/features/data-grid/react';

/**
 * `ICellMorphology.cell_morphology_protocol` is a discriminated union whose
 * Placeholder arm lacks `protocol_design`/`protocol_document` and whose TS type omits
 * `name`; this flat view avoids narrowing at every accessor.
 */
type Row = ICellMorphology & {
  cell_morphology_protocol?: {
    name?: string | null;
    generation_type?: string | null;
    protocol_design?: string | null;
    protocol_document?: string | null;
  } | null;
};

const GENERATION_TYPE_LABELS = dictLabelByKey(CellMorphologyGenerationType);
const PROTOCOL_DESIGN_LABELS = dictLabelByKey(CellMorphologyProtocolDesign);

/** `GET /cell-morphology` params with no column: just the record's own `id`. */
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
];

/**
 * The `cell_morphology_protocol__*` family as auxiliary columns. `generation_type` and
 * `name` are in this endpoint's ordering fields; `protocol_design` and
 * `protocol_document` are not, hence `sortable: false` on those two.
 */
const generationTypeColumn: IColumnModel<Row> = {
  id: 'generationType',
  header: 'Generation type',
  auxiliary: true,
  sortable: true,
  sortField: 'cell_morphology_protocol__generation_type',
  getValue: (r) =>
    GENERATION_TYPE_LABELS.get(r.cell_morphology_protocol?.generation_type ?? '') ?? '',
  width: { minWidth: 160 },
  filter: {
    // No `NotIn`: the domain config pins `…__not_in` as a host param, and host params
    // merge after the user's filters, so a user `NotIn` would be overwritten.
    operators: [OperatorId.In, OperatorId.Eq],
    field: 'cell_morphology_protocol__generation_type',
    targets: [
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
    ],
  },
};

const protocolDesignColumn: IColumnModel<Row> = {
  id: 'protocolDesign',
  header: 'Protocol design',
  auxiliary: true,
  sortable: false,
  getValue: (r) =>
    PROTOCOL_DESIGN_LABELS.get(r.cell_morphology_protocol?.protocol_design ?? '') ?? '',
  width: { minWidth: 160 },
  filter: {
    operators: [OperatorId.In, OperatorId.NotIn, OperatorId.Eq],
    field: 'cell_morphology_protocol__protocol_design',
    targets: [
      {
        id: 'protocolDesign',
        label: 'Protocol design',
        field: 'cell_morphology_protocol__protocol_design',
        operators: [OperatorId.In, OperatorId.NotIn, OperatorId.Eq],
        options: staticOptions(CellMorphologyProtocolDesign),
        description: 'Experimental or computational design of the protocol',
      },
    ],
  },
};

const protocolNameColumn: IColumnModel<Row> = {
  id: 'protocolName',
  header: 'Protocol name',
  auxiliary: true,
  sortable: true,
  sortField: 'cell_morphology_protocol__name',
  getValue: (r) => r.cell_morphology_protocol?.name ?? '',
  width: { minWidth: 160 },
  filter: {
    operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
    field: 'cell_morphology_protocol__name',
    targets: [
      {
        id: 'protocolName',
        label: 'Protocol name',
        field: 'cell_morphology_protocol__name',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a protocol name',
      },
    ],
  },
};

const protocolDocumentColumn: IColumnModel<Row> = {
  id: 'protocolDocument',
  header: 'Protocol document',
  auxiliary: true,
  sortable: false,
  getValue: (r) => r.cell_morphology_protocol?.protocol_document ?? '',
  width: { minWidth: 180 },
  filter: {
    operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
    field: 'cell_morphology_protocol__protocol_document',
    targets: [
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
};

/** `has_segmented_spines`. In this endpoint's ordering fields, so it sorts. */
const hasSegmentedSpinesColumn: IColumnModel<Row> = {
  id: 'hasSegmentedSpines',
  header: 'Segmented spines',
  auxiliary: true,
  sortable: true,
  sortField: 'has_segmented_spines',
  getValue: (r) => yesNo(r.has_segmented_spines),
  width: { minWidth: 150 },
  filter: {
    operators: [OperatorId.Bool],
    field: 'has_segmented_spines',
    targets: [
      {
        id: 'hasSegmentedSpines',
        label: 'Segmented spines',
        field: 'has_segmented_spines',
        operators: [OperatorId.Bool],
        description: 'Whether dendritic spines are segmented in the reconstruction',
      },
    ],
  },
};

export const cellMorphologySchema: IGridSchema<Row> = {
  id: 'cell-morphology',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  advancedFilters: flatAdvancedFilters(cellMorphologyAdvancedFilters),
  columns: [
    previewColumn<Row>({
      cellRenderer: 'cellMorphologyPreview',
      width: { width: 184, minWidth: 120, resizable: true },
      essential: true,
    }),
    brainRegionColumn<Row>({
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
            // Acronyms are not UUIDs; the free-entry editor would reject them.
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
    speciesColumn<Row>(),
    mtypeColumn<Row>({
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
    nameColumn<Row>({
      essential: true,
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
    lifecycleStatusColumn<Row>(),
    contributionsColumn<Row>({
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
    registrationDateColumn<Row>({ essential: true }),
    // Auxiliary — hidden until ticked; each replaces an advanced filter.
    generationTypeColumn,
    protocolDesignColumn,
    protocolNameColumn,
    protocolDocumentColumn,
    // Both subject fields are in this endpoint's ordering fields, so the catalog's
    // never-sortable default for `subject__name` is overridden here.
    subjectStrainColumn<Row>({ sortable: true }),
    subjectNameColumn<Row>({ sortable: true, sortField: 'subject__name' }),
    hasSegmentedSpinesColumn,
  ],
};

export const cellMorphologyGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.CellMorphology,
  schema: cellMorphologySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
    registry.register('cellMorphologyPreview', CellMorphologyPreview);
  },
};
