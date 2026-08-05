import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  contributionsColumn,
  formatDate,
  nameColumn,
  previewColumn,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import {
  NOTEBOOK_IMAGE_PREVIEW_RENDERER,
  NotebookImagePreview,
} from '@/features/data-grid/bindings/entitycore/renderers/notebook-cells';
import { registerSharedRenderers } from '@/features/data-grid/bindings/entitycore/renderers/register';
import { OperatorId, SortDirection } from '@/features/data-grid/core';

import type { IAnalysisNotebookResult } from '@/api/entitycore/types/entities/analysis-notebook-result';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IGridSchema } from '@/features/data-grid/core';
import type { CellRendererRegistry } from '@/features/data-grid/react';

/**
 * Analysis-notebook result listing (`GET /analysis-notebook-result`). Results surface
 * the last-update date instead of the registration date. Description is display-only:
 * no entitycore endpoint accepts a `description` param. The sort field is
 * `update_date` — `updated_at` is rejected as an invalid ordering field.
 */
export const analysisNotebookResultSchema: IGridSchema<IAnalysisNotebookResult> = {
  id: 'analysis-notebook-result',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'updateDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  columns: [
    previewColumn<IAnalysisNotebookResult>({
      id: 'notebook_image_preview',
      cellRenderer: NOTEBOOK_IMAGE_PREVIEW_RENDERER,
      width: { width: 194, minWidth: 120, resizable: true },
    }),
    nameColumn<IAnalysisNotebookResult>({ essential: true }),
    {
      id: 'description',
      header: 'Description',
      getValue: (r) => r.description ?? '',
      width: { minWidth: 200, flex: 2 },
    },
    lifecycleStatusColumn<IAnalysisNotebookResult>(),
    contributionsColumn<IAnalysisNotebookResult>(),
    {
      id: 'updateDate',
      header: 'Update date',
      sortable: true,
      sortField: 'update_date',
      getValue: (r) => formatDate(r.update_date),
      width: { minWidth: 150 },
      filter: { operators: [OperatorId.DateRange], field: 'update_date' },
      essential: true,
    },
  ],
};

export const analysisNotebookResultGridDefinition: IEntityGridDefinition<IAnalysisNotebookResult> =
  {
    dataType: ExtendedEntitiesTypeDict.AnalysisNotebookResult,
    schema: analysisNotebookResultSchema,
    registerCellRenderers: (registry: CellRendererRegistry) => {
      registerSharedRenderers(registry);
      registry.register(NOTEBOOK_IMAGE_PREVIEW_RENDERER, NotebookImagePreview);
    },
  };
