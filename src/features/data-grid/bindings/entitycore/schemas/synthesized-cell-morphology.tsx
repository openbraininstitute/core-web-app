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
  subjectNameColumn,
  subjectStrainColumn,
  yesNo,
} from '../columns/catalog';
import { lifecycleStatusColumn } from '../columns/lifecycle-status';
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import { registerSharedRenderers } from '../renderers/register';
import {
  dictLabelByKey,
  flatAdvancedFilters,
  recordIdFilter,
  staticOptions,
} from './common-filters';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IAdvancedFilterGroup, IColumnModel, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * `ICellMorphology.cell_morphology_protocol` is a discriminated union whose
 * Placeholder arm lacks `protocol_design`/`protocol_document`; this flat view avoids
 * narrowing at every accessor. Placeholder rows do reach this listing, so those two
 * cells are legitimately empty for some rows.
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
 * `GET /cell-morphology` params with no column: the record's own `id` and the
 * protocol's `id`.
 */
const synthesizedCellMorphologyAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
  {
    id: 'protocol',
    label: 'Protocol',
    filters: [
      {
        id: 'protocolId',
        label: 'Protocol ID',
        field: 'cell_morphology_protocol__id',
        operators: [OperatorId.In],
        description: 'Exact protocol entity id',
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
    // No `In`: the domain config pins `…__generation_type__in` as a host param, and
    // host params merge after the user's filters, so a user `In` would be overwritten.
    operators: [OperatorId.NotIn, OperatorId.Eq],
    field: 'cell_morphology_protocol__generation_type',
    targets: [
      {
        id: 'generationType',
        label: 'Generation type',
        field: 'cell_morphology_protocol__generation_type',
        operators: [OperatorId.NotIn, OperatorId.Eq],
        options: staticOptions(CellMorphologyGenerationType, [
          'digital_reconstruction',
          'placeholder',
        ]),
        description: 'This listing only ever contains synthesized, modified and placeholder cells',
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

/**
 * Synthesized cell morphology listing — a `cell_morphology` subtype narrowed
 * server-side to the synthesized generation types by the entity domain config, which
 * is why that narrowing is not restated here.
 */
export const synthesizedCellMorphologySchema: IGridSchema<Row> = {
  id: 'synthesized-cell-morphology',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  advancedFilters: flatAdvancedFilters(synthesizedCellMorphologyAdvancedFilters),
  columns: [
    previewColumn<Row>({
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    brainRegionColumn<Row>(),
    speciesColumn<Row>(),
    mtypeColumn<Row>(),
    nameColumn<Row>({ essential: true }),
    lifecycleStatusColumn<Row>(),
    contributionsColumn<Row>(),
    registrationDateColumn<Row>(),
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

export const synthesizedCellMorphologyGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.SynthesizedCellMorphology,
  schema: synthesizedCellMorphologySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
