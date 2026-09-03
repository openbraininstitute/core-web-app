import {
  EntityLifecycleStatus,
  EntityLifecycleStatusLabel,
} from '@/api/entitycore/types/shared/global';
import { CAMPAIGN_STATUS_COLUMN_MIN_WIDTH } from '@/features/data-grid/bindings/entitycore/renderers/campaign-status-badge';
import {
  Align,
  FilterOptionsKind,
  FreeEntryKind,
  OperatorId,
  SortDirection,
} from '@/features/data-grid/core';
import {
  WORKFLOW_ACTIVITY_ACTIONS_COLUMN_WIDTH,
  WORKFLOW_ACTIVITY_ACTIONS_RENDERER,
  WORKFLOW_ACTIVITY_DATE_RENDERER,
  WORKFLOW_ACTIVITY_STATUS_RENDERER,
  WORKFLOW_ACTIVITY_TYPE_RENDERER,
} from '@/ui/segments/workflows/elements/workflow-activity-cells';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IAdvancedFilterGroup, IGridSchema } from '@/features/data-grid/core';
import type { WorkspaceContext } from '@/types/common';
import type { TActivityValue } from '@/ui/segments/workflows/config';

/**
 * ORDERING SAFETY — every activity type is listed either from its own entity endpoint
 * (`/memodel`, `/circuit`, `/simulation`, …) or, for campaigns, from `/task-config`.
 * `/task-config` is the narrowest: its `ordering_model_fields` are exactly
 * `name`, `creation_date` and `update_date`, and entitycore 422s on anything else.
 * So only those three fields may carry `sortable: true` here — `created_by__pref_label`
 * sorts on `/memodel` but NOT on `/task-config`, which is why Created by is display-only.
 */

/**
 * ADVANCED FILTERS — `/task-config` params with no column in this grid. Each field was
 * checked against the live OpenAPI spec; every listing endpoint the activity table can
 * reach accepts all of them.
 */
const workflowActivityAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'record',
    label: 'Filters',
    filters: [
      {
        id: 'id',
        label: 'ID',
        // `id__in`; the scalar `id` adds nothing over a one-element list.
        field: 'id',
        operators: [OperatorId.In, OperatorId.Eq],
        description: 'The entity id of the activity itself',
      },
      {
        id: 'lifecycleStatus',
        label: 'Lifecycle status',
        // `lifecycle_status__in` / `lifecycle_status`. NOT the Status column, which
        // shows the campaign's aggregated *execution* status and has no wire filter.
        field: 'lifecycle_status',
        operators: [OperatorId.In, OperatorId.Eq],
        options: {
          kind: FilterOptionsKind.Static,
          items: Object.values(EntityLifecycleStatus).map((status) => ({
            id: status,
            label: EntityLifecycleStatusLabel[status],
          })),
        },
        description: 'Whether the record is a draft, active or disqualified',
      },
    ],
  },
];

export interface IWorkflowActivitySchemaArgs {
  /** the selected activity, forwarded to the actions cell to build its hrefs */
  activity: TActivityValue;
  /** activity label shown verbatim in every Category cell (Build, Simulation, …) */
  activityName: string;
  /** the listing's selected entity type, used as the Type cell's fallback title */
  entityType: TExtendedEntitiesTypeDict | undefined;
  /** workspace the Status cell runs its per-campaign status queries against */
  workspace: WorkspaceContext;
}

/**
 * The workflow-activity listing schema. Built per (activity, type, workspace) rather
 * than declared statically: Category, Type and Status all render from values the host
 * owns, and a column's `cellRendererParams` is the only channel into a keyed renderer.
 */
export function buildWorkflowActivitySchema({
  activity,
  activityName,
  entityType,
  workspace,
}: IWorkflowActivitySchemaArgs): IGridSchema<EntityCoreObjectTypes> {
  return {
    id: 'workflow-activity',
    getRowId: (row) => row.id,
    defaultSort: [{ columnId: 'creation_date', direction: SortDirection.Desc }],
    advancedFilters: workflowActivityAdvancedFilters,
    columns: [
      {
        id: 'name',
        header: 'Name',
        sortable: true,
        sortField: 'name',
        getValue: (row) => row.name ?? '',
        width: { minWidth: 160, flex: 2 },
        essential: true,
        filter: {
          operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
          targets: [
            {
              id: 'name',
              label: 'Name',
              // `name__ilike`, `name__in`, `name` — names, not UUIDs, so free entry is text.
              field: 'name',
              operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
              freeEntry: FreeEntryKind.Text,
              placeholder: 'Enter part of an activity name',
            },
          ],
        },
      },
      {
        // Display-only: the activity is chosen in the toolbar, not filtered per row.
        id: 'category',
        header: 'Category',
        getValue: () => activityName,
        width: { minWidth: 120, flex: 1 },
      },
      {
        // Display-only: the entity type is pinned by the toolbar's Type selector.
        id: 'type',
        header: 'Type',
        getValue: () => '',
        cellRenderer: WORKFLOW_ACTIVITY_TYPE_RENDERER,
        cellRendererParams: { entityType },
        width: { minWidth: 140, flex: 1 },
      },
      {
        id: 'creation_date',
        header: 'Date',
        sortable: true,
        sortField: 'creation_date',
        getValue: (row) => row.creation_date ?? '',
        cellRenderer: WORKFLOW_ACTIVITY_DATE_RENDERER,
        width: { minWidth: 150, flex: 1 },
      },
      {
        id: 'created_by',
        header: 'Created by',
        // Not sortable: `/task-config` omits `created_by__pref_label` from its
        // ordering fields, and a campaign listing would 422.
        getValue: (row) => ('created_by' in row ? (row.created_by?.pref_label ?? '') : ''),
        width: { minWidth: 140, flex: 1 },
        filter: {
          // `created_by__pref_label__in` / `…__ilike`, options from the `created_by` facet.
          operators: [OperatorId.In, OperatorId.Ilike],
          field: 'created_by__pref_label',
          facetKey: 'created_by',
          options: { kind: FilterOptionsKind.Facets },
        },
      },
      {
        // Aggregated execution status, resolved client-side per row — no wire filter
        // and no ordering field. `lifecycle_status` is a separate advanced filter.
        id: 'status',
        header: 'Status',
        align: Align.Center,
        getValue: () => '',
        cellRenderer: WORKFLOW_ACTIVITY_STATUS_RENDERER,
        cellRendererParams: { workspace },
        width: { minWidth: CAMPAIGN_STATUS_COLUMN_MIN_WIDTH, flex: 1 },
      },
      {
        // The per-row action menu. Frozen right and locked down: it must stay reachable
        // however far the row scrolls, and there is no state in which hiding, moving or
        // resizing it helps.
        id: 'actions',
        header: 'Actions',
        align: Align.Center,
        getValue: () => '',
        cellRenderer: WORKFLOW_ACTIVITY_ACTIONS_RENDERER,
        cellRendererParams: { activity, entityType },
        pinned: 'right',
        movable: false,
        alwaysVisible: true,
        width: {
          width: WORKFLOW_ACTIVITY_ACTIONS_COLUMN_WIDTH,
          minWidth: WORKFLOW_ACTIVITY_ACTIONS_COLUMN_WIDTH,
          resizable: false,
        },
      },
    ],
  };
}
