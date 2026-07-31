import { AnalysisScaleDict } from '@/api/entitycore/types/entities/analysis-notebook-template';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { contributionsColumn, nameColumn, registrationDateColumn } from '../columns/catalog';
import { registerSharedRenderers } from '../renderers/register';

import type { IAnalysisNotebookTemplate } from '@/api/entitycore/types/entities/analysis-notebook-template';
import type { GridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { HasContributions } from '../columns/catalog';
import type { EntityGridDefinition } from '../registry';

// The hand-written template type omits `contributions` (present at runtime); augment
// locally so the shared contributions factory stays type-safe.
type Row = IAnalysisNotebookTemplate & HasContributions;

const SCALE_LABEL = new Map(Object.values(AnalysisScaleDict).map((s) => [s.key, s.label] as const));

/**
 * Analysis-notebook template listing. Column order mirrors the legacy
 * `viewDefForNotebook`: Name, Description, Scale, Contributors, Registration date.
 *
 * Per the legacy field-defs, Description (no column filter — `isFilterable: false`)
 * and Scale (`filter: null`) are DISPLAY-ONLY; Scale is also non-sortable. Name and
 * Registration date keep their standard filter+sort; Contributors facet-filters on
 * `contribution__pref_label__in` but is not server-sortable for notebooks.
 */
export const analysisNotebookTemplateSchema: GridSchema<Row> = {
  id: 'analysis-notebook-template',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: 'desc' }],
  rowHeight: 118,
  selection: { enabled: true },
  columns: [
    nameColumn<Row>(),
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
    contributionsColumn<Row>(),
    registrationDateColumn<Row>(),
  ],
};

export const analysisNotebookTemplateGridDefinition: EntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.AnalysisNotebookTemplate,
  schema: analysisNotebookTemplateSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
