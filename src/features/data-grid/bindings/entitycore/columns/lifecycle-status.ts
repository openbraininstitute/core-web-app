import {
  EntityLifecycleStatus,
  EntityLifecycleStatusLabel,
  getEntityLifecycleStatusLabel,
  type TEntityLifecycleStatus,
} from '@/api/entitycore/types/shared/global';
import { LIFECYCLE_STATUS_RENDERER } from '@/features/data-grid/bindings/entitycore/renderers/lifecycle-status-cell';
import { Align, FilterOptionsKind, mergeColumnDef, OperatorId } from '@/features/data-grid/core';

import type { IColumnModel, TColumnOverride } from '@/features/data-grid/core';

export interface IHasLifecycleStatus {
  lifecycle_status?: TEntityLifecycleStatus | null;
}

/**
 * Order weight that parks a column after every column declaring none.
 */
const LAST_COLUMN_ORDER = 10_000;

export function lifecycleStatusColumn<Row>(o?: TColumnOverride<Row>): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'lifecycleStatus',
      header: 'Lifecycle status',
      order: LAST_COLUMN_ORDER,
      sortable: false,
      // label, not the wire value: also feeds free-text search, export and the fallback
      getValue: (r) => getEntityLifecycleStatusLabel((r as IHasLifecycleStatus).lifecycle_status),
      cellRenderer: LIFECYCLE_STATUS_RENDERER,
      width: { width: 140, minWidth: 120 },
      align: Align.Center,
      filter: {
        operators: [OperatorId.Eq],
        field: 'lifecycle_status',
        targets: [
          {
            id: 'lifecycleStatus',
            label: 'Lifecycle status',
            field: 'lifecycle_status',
            operators: [OperatorId.Eq],
            options: {
              kind: FilterOptionsKind.Static,
              items: Object.values(EntityLifecycleStatus).map((value) => ({
                id: value,
                label: EntityLifecycleStatusLabel[value],
              })),
            },
            description: 'Whether the record is a draft, active, or disqualified',
          },
        ],
      },
    },
    o
  );
}
