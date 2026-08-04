import { Align, FilterOptionsKind, mergeColumnDef, OperatorId } from '../../../core';
import {
  EntityLifecycleStatus,
  LIFECYCLE_STATUS_RENDERER,
} from '../renderers/lifecycle-status-cell';

import type { IColumnModel, TColumnOverride } from '../../../core';

export interface IHasLifecycleStatus {
  lifecycle_status?: string | null;
}

/**
 * Lifecycle status column, rendered as the shared {@link LifecycleStatusCell} pill.
 *
 * Never sortable: `lifecycle_status` is in no endpoint's `ordering_model_fields`, and
 * entitycore 422s on an `order_by` outside that allowlist. Filtering uses the bare
 * single-select `lifecycle_status` param (no `__in` companion exists), with an explicit
 * target pinning the static options — no endpoint computes a facet bucket for it.
 *
 * `Row` is unconstrained on purpose: {@link IHasLifecycleStatus} has only optional
 * members, so using it as a constraint is a weak type and fails TS2559 for every row
 * type. The wire always carries the field; the read is narrowed here instead.
 */
export function lifecycleStatusColumn<Row>(o?: TColumnOverride<Row>): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'lifecycleStatus',
      header: 'Lifecycle status',
      sortable: false,
      // label, not the wire value: also feeds quick filter, export and the fallback
      getValue: (r) => {
        const status = (r as IHasLifecycleStatus).lifecycle_status;
        return (
          Object.values(EntityLifecycleStatus).find((s) => s.key === status)?.label ?? status ?? ''
        );
      },
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
              items: Object.values(EntityLifecycleStatus).map((s) => ({
                id: s.key,
                label: s.label,
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
