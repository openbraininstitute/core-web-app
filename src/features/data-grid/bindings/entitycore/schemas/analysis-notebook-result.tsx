import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { OperatorId, SortDirection } from '../../../core';
import { contributionsColumn, formatDate, nameColumn, previewColumn } from '../columns/catalog';
import { NOTEBOOK_IMAGE_PREVIEW_RENDERER, NotebookImagePreview } from '../renderers/notebook-cells';
import { registerSharedRenderers } from '../renderers/register';

import type { IAnalysisNotebookResult } from '@/api/entitycore/types/entities/analysis-notebook-result';
import type { IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * Analysis-notebook result listing. Column order mirrors the legacy
 * `viewDefForNotebookResult`: Preview (image), Name, Description, Contributors,
 * Update date. Notebook results surface the last-update date instead of the
 * registration date.
 *
 * Per the legacy field-defs: the preview renders notebook figures via the shared
 * `NotebookPreviewThumbnail`; Description is DISPLAY-ONLY (no entitycore endpoint
 * accepts a `description` param); Update date sorts on `update_date` (the backend
 * ordering field — `updated_at` is rejected as an invalid ordering field) and
 * date-range-filters to `update_date__gte` / `update_date__lte`; Contributors
 * facet-filters on `contribution__pref_label__in` (plus `__ilike`) but is not
 * server-sortable for notebooks.
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
    nameColumn<IAnalysisNotebookResult>(),
    {
      id: 'description',
      header: 'Description',
      getValue: (r) => r.description ?? '',
      width: { minWidth: 200, flex: 2 },
    },
    contributionsColumn<IAnalysisNotebookResult>(),
    {
      id: 'updateDate',
      header: 'Update date',
      sortable: true,
      sortField: 'update_date',
      getValue: (r) => formatDate(r.update_date),
      width: { minWidth: 150 },
      filter: { operators: [OperatorId.DateRange], field: 'update_date' },
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
