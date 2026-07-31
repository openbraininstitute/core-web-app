import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { contributionsColumn, formatDate, nameColumn, previewColumn } from '../columns/catalog';
import { NOTEBOOK_IMAGE_PREVIEW_RENDERER, NotebookImagePreview } from '../renderers/notebook-cells';
import { registerSharedRenderers } from '../renderers/register';

import type { IAnalysisNotebookResult } from '@/api/entitycore/types/entities/analysis-notebook-result';
import type { GridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { EntityGridDefinition } from '../registry';

/**
 * Analysis-notebook result listing. Column order mirrors the legacy
 * `viewDefForNotebookResult`: Preview (image), Name, Description, Contributors,
 * Update date. Notebook results surface the last-update date instead of the
 * registration date.
 *
 * Per the legacy field-defs: the preview renders notebook figures via the shared
 * `NotebookPreviewThumbnail`; Description is DISPLAY-ONLY (`isFilterable: false`);
 * Update date is display + sortable on `updated_at` (legacy `order.value`) with NO
 * column filter (`isFilterable: false`); Contributors facet-filters on
 * `contribution__pref_label__in` but is not server-sortable for notebooks.
 */
export const analysisNotebookResultSchema: GridSchema<IAnalysisNotebookResult> = {
  id: 'analysis-notebook-result',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'updateDate', direction: 'desc' }],
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
      sortField: 'updated_at',
      getValue: (r) => formatDate(r.update_date),
      width: { minWidth: 150 },
    },
  ],
};

export const analysisNotebookResultGridDefinition: EntityGridDefinition<IAnalysisNotebookResult> = {
  dataType: ExtendedEntitiesTypeDict.AnalysisNotebookResult,
  schema: analysisNotebookResultSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
    registry.register(NOTEBOOK_IMAGE_PREVIEW_RENDERER, NotebookImagePreview);
  },
};
