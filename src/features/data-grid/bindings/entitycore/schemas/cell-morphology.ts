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
  subjectNameColumn,
  subjectStrainColumn,
  yesNo,
} from '../columns/catalog';
import { CellMorphologyPreview } from '../renderers/cell-morphology-cells';
import { registerSharedRenderers } from '../renderers/register';
import { dictLabelByKey, flatAdvancedFilters, staticOptions } from './common-filters';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IAdvancedFilterGroup, IColumnModel, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * `ICellMorphology.cell_morphology_protocol` IS declared (and the backend's
 * `NestedCellMorphologyProtocolRead` really does carry `name`, `generation_type`,
 * `protocol_design` and `protocol_document`, via `CellMorphologyProtocolBaseMixin`),
 * but it is a DISCRIMINATED UNION whose Placeholder arm has neither
 * `protocol_design` nor `protocol_document`, and whose TS type omits `name`
 * altogether. Reading those four through the union needs narrowing at every call
 * site; this flat, all-optional view says the same thing once — the same local
 * augmentation `universal-cell-morphology` already declares for its two columns.
 *
 * (This listing pins `generation_type__not_in: [synthesized, modified, placeholder]`
 * in its domain config, so the Placeholder arm never actually reaches a row here.)
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

/**
 * ADVANCED FILTERS — what is left once every filterable field that CAN be a column is
 * one: the record's own `id`, which has no useful column to show.
 *
 * The whole `cell_morphology_protocol__*` family, both `subject__*` fields and
 * `has_segmented_spines` used to live here; they are AUXILIARY columns below, so
 * each field stays on exactly one surface.
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
];

/**
 * PROTOCOL — the `cell_morphology_protocol__*` family, each carrying the operators,
 * options and free-entry kind of the advanced filter it replaces.
 *
 * SORT SAFETY (`CellMorphologyFilter.Constants.ordering_model_fields`,
 * `app/filters/cell_morphology.py`): `cell_morphology_protocol__generation_type` and
 * `…__name` ARE in the allowlist; `…__protocol_design` and `…__protocol_document` are
 * NOT, so those two are non-sortable — an `order_by` outside the list is a 422.
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
    // `…__in` and `…` (exact) ONLY. The domain config pins `…__not_in` as a host
    // param and host params merge AFTER the user's filters, so a `NotIn` here would
    // collide on that param name and be silently overwritten; `__in` is a different
    // name and composes as an intersection. See FILTERS.md.
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
    // `…__in`, `…__not_in`, `…` (exact) — nothing pins protocol_design
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
    // `…__ilike`, `…__in`, `…` (exact)
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
    // `…__ilike`, `…__in`, `…` (exact)
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

/** `has_segmented_spines` — boolean, and IS in this endpoint's ordering fields. */
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
  // flat list, no group tabs — see `flatAdvancedFilters`
  advancedFilters: flatAdvancedFilters(cellMorphologyAdvancedFilters),
  columns: [
    previewColumn<Row>({
      cellRenderer: 'cellMorphologyPreview',
      width: { width: 184, minWidth: 120, resizable: true },
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
    // the identifying column: kept visible by the chooser's bulk deselect
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
    registrationDateColumn<Row>(),
    // AUXILIARY — hidden until ticked; each replaces an advanced filter one-for-one
    generationTypeColumn,
    protocolDesignColumn,
    protocolNameColumn,
    protocolDocumentColumn,
    // BOTH subject fields are in CellMorphologyFilter's ordering_model_fields — this
    // is the one endpoint so far that sorts `subject__name`, so the catalog default
    // (never sortable) is overridden deliberately here.
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
