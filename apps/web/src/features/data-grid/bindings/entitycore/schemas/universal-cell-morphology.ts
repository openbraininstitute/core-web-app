import {
  CellMorphologyGenerationType,
  CellMorphologyProtocolDesign,
} from '@/api/entitycore/types/entities/cell-morphology-protocol';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import {
  brainRegionColumn,
  contributionsColumn,
  mtypeColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
  speciesColumn,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import { ENTITY_PREVIEW_RENDERER } from '@/features/data-grid/bindings/entitycore/renderers/entity-preview';
import { registerSharedRenderers } from '@/features/data-grid/bindings/entitycore/renderers/register';
import {
  flatAdvancedFilters,
  recordIdFilter,
  subjectAdvancedGroup,
} from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import {
  byContext,
  FilterOptionsKind,
  FreeEntryKind,
  OperatorId,
  SortDirection,
} from '@/features/data-grid/core';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { CellRendererRegistry } from '@/features/data-grid/react';
import type { IAdvancedFilterGroup, IGridSchema, TFilterOptionsSource } from '../../../core';

type UniversalRow = ICellMorphology & {
  cell_morphology_protocol?: {
    generation_type?: string | null;
    protocol_design?: string | null;
  } | null;
};

/** `{key → label}` plus static filter options from a `{ Foo: { key, label } }` dict. */
function dictEntries(dict: Record<string, { key: string; label: string }>) {
  const values = Object.values(dict);
  const labelByKey = new Map(values.map((v) => [v.key, v.label] as const));
  const options: TFilterOptionsSource = {
    kind: FilterOptionsKind.Static,
    items: values.map((v) => ({ id: v.key, label: v.label })),
  };
  return { labelByKey, options };
}

const generation = dictEntries(CellMorphologyGenerationType);
const protocol = dictEntries(CellMorphologyProtocolDesign);

/** Turns the generation-type / protocol-design columns on in the build-workflow section only. */
const availableInBuildWorkflow = byContext<boolean>({
  default: false,
  rules: [{ when: { section: WorkspaceSection.BuildWorkflow }, value: true }],
});

/**
 * The mirror of {@link availableInBuildWorkflow}: an advanced filter duplicating a
 * contextual column must disappear exactly where that column appears.
 */
const availableOutsideBuildWorkflow = byContext<boolean>({
  default: true,
  rules: [{ when: { section: WorkspaceSection.BuildWorkflow }, value: false }],
});

/**
 * `GET /cell-morphology` params with no column. Unlike the sibling morphology
 * listings, this one pins no narrow filter in its domain config, so the whole
 * `cell_morphology_protocol__generation_type` family is safe to offer, `__not_in`
 * included.
 */
const universalCellMorphologyAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'protocol',
    label: 'Protocol',
    description: 'How each morphology was produced.',
    filters: [
      {
        id: 'generationType',
        label: 'Generation type',
        field: 'cell_morphology_protocol__generation_type',
        operators: [OperatorId.In, OperatorId.NotIn, OperatorId.Eq],
        options: generation.options,
        // has its own column in the build workflow
        available: availableOutsideBuildWorkflow,
      },
      {
        id: 'protocolDesign',
        label: 'Protocol design',
        field: 'cell_morphology_protocol__protocol_design',
        operators: [OperatorId.In, OperatorId.NotIn, OperatorId.Eq],
        options: protocol.options,
        description: 'Experimental or computational design of the protocol',
        // has its own column in the build workflow
        available: availableOutsideBuildWorkflow,
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
      {
        id: 'protocolId',
        label: 'Protocol ID',
        field: 'cell_morphology_protocol__id',
        operators: [OperatorId.In],
        description: 'Exact protocol entity id',
      },
    ],
  },
  subjectAdvancedGroup('The animal the morphology was reconstructed from.'),
  {
    id: 'record',
    label: 'Record',
    filters: [
      recordIdFilter,
      {
        id: 'hasSegmentedSpines',
        label: 'Segmented spines',
        field: 'has_segmented_spines',
        operators: [OperatorId.Bool],
        description: 'Whether dendritic spines are segmented in the reconstruction',
      },
    ],
  },
];

/**
 * Universal cell morphology listing (`GET /cell-morphology`, unnarrowed). Adds two
 * build-workflow-only columns; see {@link availableInBuildWorkflow}.
 */
export const universalCellMorphologySchema: IGridSchema<UniversalRow> = {
  id: 'universal-cell-morphology',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  advancedFilters: flatAdvancedFilters(universalCellMorphologyAdvancedFilters),
  columns: [
    previewColumn<UniversalRow>({
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    brainRegionColumn<UniversalRow>(),
    speciesColumn<UniversalRow>(),
    // `mtype__pref_label` is in this endpoint's ordering fields, so M-type sorts.
    mtypeColumn<UniversalRow>(),
    nameColumn<UniversalRow>(),
    {
      id: 'generationType',
      header: 'Generation type',
      available: availableInBuildWorkflow,
      sortable: true,
      sortField: 'cell_morphology_protocol__generation_type',
      getValue: (r) =>
        generation.labelByKey.get(r.cell_morphology_protocol?.generation_type ?? '') ?? '',
      width: { minWidth: 160 },
      filter: {
        operators: [OperatorId.In, OperatorId.NotIn],
        field: 'cell_morphology_protocol__generation_type',
        options: generation.options,
      },
    },
    {
      id: 'protocolDesign',
      header: 'Protocol design',
      available: availableInBuildWorkflow,
      getValue: (r) =>
        protocol.labelByKey.get(r.cell_morphology_protocol?.protocol_design ?? '') ?? '',
      width: { minWidth: 160 },
      filter: {
        operators: [OperatorId.In, OperatorId.NotIn],
        field: 'cell_morphology_protocol__protocol_design',
        options: protocol.options,
      },
    },
    lifecycleStatusColumn<UniversalRow>(),
    contributionsColumn<UniversalRow>(),
    registrationDateColumn<UniversalRow>(),
  ],
};

export const universalCellMorphologyGridDefinition: IEntityGridDefinition<UniversalRow> = {
  dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
  schema: universalCellMorphologySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
