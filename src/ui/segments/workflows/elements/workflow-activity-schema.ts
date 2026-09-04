import {
  EntityLifecycleStatus,
  EntityLifecycleStatusLabel,
} from '@/api/entitycore/types/shared/global';
import { CAMPAIGN_STATUS_COLUMN_MIN_WIDTH } from '@/features/data-grid/bindings/entitycore/renderers/campaign-status-badge';
import { LIFECYCLE_STATUS_RENDERER } from '@/features/data-grid/bindings/entitycore/renderers/lifecycle-status-cell';
import {
  Align,
  ColumnPin,
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
 * SORT SAFETY — campaign rows list from `/task-config`, whose `ordering_model_fields`
 * are exactly `name`, `creation_date` and `update_date`; entitycore 422s on anything
 * else. Only those three may carry `sortable: true`, which is why Created by does not
 * even though `/memodel` would order on it.
 */

/** `/task-config` params with no column here. Auxiliary columns join the panel when hidden. */
const workflowActivityAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'record',
    label: 'Filters',
    filters: [
      {
        id: 'id',
        label: 'ID',
        field: 'id',
        operators: [OperatorId.In, OperatorId.Eq],
        description: 'The entity id of the activity itself',
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
 * The workflow-activity listing schema. Built per (activity, type, workspace) rather than
 * declared statically: `cellRendererParams` is the only channel into a keyed renderer,
 * and Category, Type, Status and Actions all need host-owned values.
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
    defaultSort: [{ columnId: 'creationDate', direction: SortDirection.Desc }],
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
              // `name__ilike` / `name__in` / `name`; names, not UUIDs, so free entry is text
              field: 'name',
              operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
              freeEntry: FreeEntryKind.Text,
              placeholder: 'Enter part of an activity name',
            },
          ],
        },
      },
      {
        // display-only: the activity is chosen in the toolbar
        id: 'category',
        header: 'Category',
        getValue: () => activityName,
        width: { minWidth: 120, flex: 1 },
      },
      {
        // display-only: the entity type is pinned by the toolbar's Type selector
        id: 'type',
        header: 'Type',
        getValue: () => '',
        cellRenderer: WORKFLOW_ACTIVITY_TYPE_RENDERER,
        cellRendererParams: { entityType },
        width: { minWidth: 140, flex: 1 },
      },
      {
        id: 'creationDate',
        header: 'Date',
        sortable: true,
        sortField: 'creation_date',
        getValue: (row) => row.creation_date ?? '',
        cellRenderer: WORKFLOW_ACTIVITY_DATE_RENDERER,
        width: { minWidth: 150, flex: 1 },
      },
      {
        id: 'createdBy',
        header: 'Created by',
        // not sortable: `/task-config` omits `created_by__pref_label` — see SORT SAFETY
        getValue: (row) => ('created_by' in row ? (row.created_by?.pref_label ?? '') : ''),
        width: { minWidth: 140, flex: 1 },
        filter: {
          // `created_by__pref_label__in` / `…__ilike`; options from the `created_by` facet
          operators: [OperatorId.In, OperatorId.Ilike],
          field: 'created_by__pref_label',
          facetKey: 'created_by',
          options: { kind: FilterOptionsKind.Facets },
        },
      },
      {
        // aggregated execution status, resolved client-side; no wire filter, no ordering
        id: 'status',
        header: 'Status',
        align: Align.Center,
        getValue: () => '',
        cellRenderer: WORKFLOW_ACTIVITY_STATUS_RENDERER,
        cellRendererParams: { workspace },
        width: { minWidth: CAMPAIGN_STATUS_COLUMN_MIN_WIDTH, flex: 1 },
      },
      {
        /**
         * Auxiliary, so its filter is offered by one surface at a time: the advanced
         * panel while hidden, its column header once ticked on. Both key the entry by
         * this column id, so an applied filter survives the move.
         *
         * Not the Status column, which is the campaign's execution status.
         */
        id: 'lifecycleStatus',
        header: 'Lifecycle status',
        auxiliary: true,
        // `lifecycle_status` is in no endpoint's ordering fields
        sortable: false,
        getValue: (row) =>
          'lifecycle_status' in row ? ((row.lifecycle_status as string) ?? '') : '',
        cellRenderer: LIFECYCLE_STATUS_RENDERER,
        width: { minWidth: 140, flex: 1 },
        filter: {
          operators: [OperatorId.In, OperatorId.Eq],
          field: 'lifecycle_status',
          options: {
            kind: FilterOptionsKind.Static,
            items: Object.values(EntityLifecycleStatus).map((status) => ({
              id: status,
              label: EntityLifecycleStatusLabel[status],
            })),
          },
          description: 'Whether the record is a draft, active or disqualified',
        },
      },
      {
        // frozen right so the actions stay reachable however far the row scrolls
        id: 'actions',
        header: 'Actions',
        align: Align.Center,
        getValue: () => '',
        cellRenderer: WORKFLOW_ACTIVITY_ACTIONS_RENDERER,
        cellRendererParams: { activity, entityType },
        pinned: ColumnPin.Right,
        movable: false,
        // `essential`, not `alwaysVisible`: a bulk deselect keeps it, but its own
        // checkbox still works, so the chooser entry is not permanently disabled
        essential: true,
        width: {
          width: WORKFLOW_ACTIVITY_ACTIONS_COLUMN_WIDTH,
          minWidth: WORKFLOW_ACTIVITY_ACTIONS_COLUMN_WIDTH,
          resizable: false,
        },
      },
    ],
  };
}
