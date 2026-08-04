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
 * `ICellMorphology.cell_morphology_protocol` IS declared (and the backend's
 * `NestedCellMorphologyProtocolRead` really does carry `name`, `generation_type`,
 * `protocol_design` and `protocol_document`, via `CellMorphologyProtocolBaseMixin`),
 * but it is a DISCRIMINATED UNION whose Placeholder arm has neither
 * `protocol_design` nor `protocol_document`, and whose TS type omits `name`
 * altogether. Reading those four through the union needs narrowing at every call
 * site; this flat, all-optional view says the same thing once — the SAME local
 * augmentation `cell-morphology` and `universal-cell-morphology` already declare.
 *
 * Unlike `cell_morphology`, the Placeholder arm DOES reach rows here: this listing
 * pins `generation_type__in: [computationally_synthesized, modified_reconstruction,
 * placeholder]`, so `protocol_design` / `protocol_document` are genuinely absent on
 * some rows and their cells render the shared empty placeholder.
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
 * ADVANCED FILTERS — `GET /cell-morphology` params with no column in this grid: the
 * record's own `id` and the protocol's `id`. Both are ID-type fields with no useful
 * column to show.
 *
 * The rest of the `cell_morphology_protocol__*` family, both `subject__*` fields and
 * `has_segmented_spines` used to live here; they are AUXILIARY columns below, so each
 * field stays on exactly one surface.
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
        // `…__id__in`. The scalar `…__id` adds nothing over a one-element list.
        operators: [OperatorId.In],
        description: 'Exact protocol entity id',
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
    // `…__not_in` and `…` (exact) ONLY — deliberately NOT `…__in`. The entity domain
    // config pins `cell_morphology_protocol__generation_type__in` unconditionally for
    // this listing (`protocolTypeFilter` in
    // `entity-configuration/domain/model/synthesized-morphology.ts`) and host params
    // merge AFTER the user's filters, so a user's `__in` would be silently
    // overwritten. `__not_in` and the bare param are different param names and
    // compose with it correctly (intersection). See FILTERS.md.
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
 *
 * Then the AUXILIARY columns, hidden until ticked, each carrying the filter it took
 * over from the advanced-filters panel.
 */
export const synthesizedCellMorphologySchema: IGridSchema<Row> = {
  id: 'synthesized-cell-morphology',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
  advancedFilters: flatAdvancedFilters(synthesizedCellMorphologyAdvancedFilters),
  columns: [
    previewColumn<Row>({
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    brainRegionColumn<Row>(),
    speciesColumn<Row>(),
    mtypeColumn<Row>(),
    // the identifying column: the first column is a thumbnail, so Name is what the
    // chooser's bulk deselect must keep
    nameColumn<Row>({ essential: true }),
    contributionsColumn<Row>(),
    registrationDateColumn<Row>(),
    // AUXILIARY — hidden until ticked; each replaces an advanced filter one-for-one
    generationTypeColumn,
    protocolDesignColumn,
    protocolNameColumn,
    protocolDocumentColumn,
    // BOTH subject fields are in CellMorphologyFilter's ordering_model_fields — the
    // same endpoint `cell_morphology` sorts them on, so the catalog default (never
    // sortable for `subject__name`) is overridden deliberately here.
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
