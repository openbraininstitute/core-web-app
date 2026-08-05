import { AnalysisScaleDict } from '@/api/entitycore/types/entities/analysis-notebook-template';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  contributionsColumn,
  nameColumn,
  registrationDateColumn,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import { registerSharedRenderers } from '@/features/data-grid/bindings/entitycore/renderers/register';
import { SortDirection } from '@/features/data-grid/core';

import type { IAnalysisNotebookTemplate } from '@/api/entitycore/types/entities/analysis-notebook-template';
import type { IHasContributions } from '@/features/data-grid/bindings/entitycore/columns/catalog';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IGridSchema } from '@/features/data-grid/core';
import type { CellRendererRegistry } from '@/features/data-grid/react';

// The hand-written template type omits `contributions` (present at runtime); augment
// locally so the shared contributions factory stays type-safe.
type Row = IAnalysisNotebookTemplate & IHasContributions;

const SCALE_LABEL = new Map(Object.values(AnalysisScaleDict).map((s) => [s.key, s.label] as const));

/**
 * Analysis-notebook template listing (`GET /analysis-notebook-template`). Description
 * and Scale are display-only; Contributors is not server-sortable for notebooks.
 */
export const analysisNotebookTemplateSchema: IGridSchema<Row> = {
  id: 'analysis-notebook-template',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  columns: [
    nameColumn<Row>({ essential: true }),
    {
      id: 'description',
      header: 'Description',
      getValue: (r) => r.description ?? '',
      width: { minWidth: 200, flex: 2 },
    },
    {
      id: 'notebook_scale',
      header: 'Scale',
      getValue: (r) => (r.scale ? (SCALE_LABEL.get(r.scale) ?? '') : ''),
      width: { minWidth: 120 },
    },
    lifecycleStatusColumn<Row>(),
    contributionsColumn<Row>(),
    registrationDateColumn<Row>({ essential: true }),
  ],
};

export const analysisNotebookTemplateGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.AnalysisNotebookTemplate,
  schema: analysisNotebookTemplateSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
