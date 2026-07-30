import {
  CellMorphologyGenerationType,
  CellMorphologyProtocolDesign,
} from '@/api/entitycore/types/entities/cell-morphology-protocol';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';

import { byContext, OperatorId } from '../../../core';
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

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { FilterOptionsSource, GridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { EntityGridDefinition } from '../registry';

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
  const options: FilterOptionsSource = {
    kind: 'static',
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
 * Universal cell morphology listing. Same base columns as cell_morphology (but
 * M-type is not server-sortable here, matching the legacy order binding, and there
 * is NO generation-type narrow filter). Adds the two build-workflow-only dropdown
 * columns.
 */
export const universalCellMorphologySchema: GridSchema<UniversalRow> = {
  id: 'universal-cell-morphology',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: 'desc' }],
  rowHeight: 118,
  selection: { enabled: true },
  columns: [
    previewColumn<UniversalRow>({
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    brainRegionColumn<UniversalRow>(),
    speciesColumn<UniversalRow>(),
    // M-type is not sortable for universal (no legacy order binding)
    mtypeColumn<UniversalRow>({ sortable: false, sortField: undefined }),
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
        operators: [OperatorId.In],
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
        operators: [OperatorId.In],
        field: 'cell_morphology_protocol__protocol_design',
        options: protocol.options,
      },
    },
    contributionsColumn<UniversalRow>(),
    registrationDateColumn<UniversalRow>(),
  ],
};

export const universalCellMorphologyGridDefinition: EntityGridDefinition<UniversalRow> = {
  dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
  schema: universalCellMorphologySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
