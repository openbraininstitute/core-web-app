import {
  CellMorphologyGenerationType,
  CellMorphologyProtocolDesign,
} from '@/api/entitycore/types/entities/cell-morphology-protocol';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';

import {
  byContext,
  FilterOptionsKind,
  FreeEntryKind,
  OperatorId,
  SortDirection,
} from '../../../core';
import {
  brainRegionColumn,
  contributionsColumn,
  mtypeColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
  speciesColumn,
} from '../columns/catalog';
import { lifecycleStatusColumn } from '../columns/lifecycle-status';
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import { registerSharedRenderers } from '../renderers/register';
import { flatAdvancedFilters, recordIdFilter, subjectAdvancedGroup } from './common-filters';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IAdvancedFilterGroup, IGridSchema, TFilterOptionsSource } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

type UniversalRow = ICellMorphology & {
  cell_morphology_protocol?: {
    generation_type?: string | null;
    protocol_design?: string | null;
  } | null;
};

/** {key → label} from a `{ Foo: { key, label } }` dict, for value display + static filter options. */
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

/**
 * The generation-type / protocol-design columns are contextual: the legacy listing
 * only shows them for `universal_cell_morphology` in the build-workflow section, so
 * they are dropped from the data-browse listing. Modelled here with the contextual
 * `available` rule — the data section resolves them away, matching legacy.
 */
const availableInBuildWorkflow = byContext<boolean>({
  default: false,
  rules: [{ when: { section: WorkspaceSection.BuildWorkflow }, value: true }],
});

/**
 * The mirror image of {@link availableInBuildWorkflow}: an advanced filter that
 * duplicates a contextual COLUMN must disappear exactly where that column appears,
 * or the same field would be offered twice in the same view.
 */
const availableOutsideBuildWorkflow = byContext<boolean>({
  default: true,
  rules: [{ when: { section: WorkspaceSection.BuildWorkflow }, value: false }],
});

/**
 * ADVANCED FILTERS — `GET /cell-morphology` params with no column in this grid.
 * Every field/operator pair was checked against the live OpenAPI spec; the emitted
 * param is named in each comment.
 *
 * Unlike the `cell_morphology` and `synthesized_cell_morphology` listings, the
 * universal one applies NO narrow filter in its entity domain config
 * (`UniversalCellMorphology.api.query.list` forwards `filters` untouched), so the
 * whole `cell_morphology_protocol__generation_type` family is safe to offer,
 * `__not_in` included — nothing pins it as a host param.
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
        // `…__in`, `…__not_in`, `…` (exact)
        operators: [OperatorId.In, OperatorId.NotIn, OperatorId.Eq],
        options: generation.options,
        // has its own column in the build workflow
        available: availableOutsideBuildWorkflow,
      },
      {
        id: 'protocolDesign',
        label: 'Protocol design',
        field: 'cell_morphology_protocol__protocol_design',
        // `…__in`, `…__not_in`, `…` (exact)
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
  subjectAdvancedGroup('The animal the morphology was reconstructed from.'),
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
    ],
  },
];

/**
 * Universal cell morphology listing. Same base columns as cell_morphology (but
 * M-type is not server-sortable here, matching the legacy order binding, and there
 * is NO generation-type narrow filter). Adds the two build-workflow-only dropdown
 * columns.
 */
export const universalCellMorphologySchema: IGridSchema<UniversalRow> = {
  id: 'universal-cell-morphology',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
  advancedFilters: flatAdvancedFilters(universalCellMorphologyAdvancedFilters),
  columns: [
    previewColumn<UniversalRow>({
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    brainRegionColumn<UniversalRow>(),
    speciesColumn<UniversalRow>(),
    // `mtype__pref_label` is in CellMorphologyFilter.Constants.ordering_model_fields,
    // which /cell-morphology serves for universal too — so it IS server-sortable.
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
