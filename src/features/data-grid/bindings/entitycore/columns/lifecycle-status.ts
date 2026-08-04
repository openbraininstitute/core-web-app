import { Align, FilterOptionsKind, mergeColumnDef, OperatorId } from '../../../core';
import {
  EntityLifecycleStatus,
  LIFECYCLE_STATUS_RENDERER,
} from '../renderers/lifecycle-status-cell';

import type { IColumnModel, TColumnOverride } from '../../../core';

/**
 * The LIFECYCLE-STATUS column, in its own module rather than in `columns/catalog.ts`.
 *
 * Every other shared factory lives in the catalog because it is structurally typed to
 * the minimal row shape it reads. This one cannot be (see the typing note below), and
 * it is the only factory that pairs with a renderer of its own — so it keeps the
 * interface, the factory and the renderer key together, and leaves the catalog to the
 * factories that share its one convention.
 */

export interface IHasLifecycleStatus {
  lifecycle_status?: string | null;
}

/**
 * Lifecycle status — a VISIBLE column on every registered listing, matching the
 * legacy view-defs (PR #1850), which add `EntityCoreFields.LifecycleStatus` to each
 * entity's `columns`. Rendered as the shared {@link LifecycleStatusCell} pill.
 *
 * NEVER SORTABLE. `lifecycle_status` is declared once, on `EntityFilterMixin`
 * (`app/filters/entity.py`), and appears in NO endpoint's
 * `Constants.ordering_model_fields` — an `order_by` outside that allowlist is a hard
 * 422 that fails the whole listing. The legacy field-def agrees (`isSortable: false`).
 *
 * FILTER: the BARE `lifecycle_status` param, single-select. It is typed
 * `EntityLifecycleStatus | None` with NO list companion on any endpoint (verified
 * against the live OpenAPI spec: every `paths[…].get.parameters` entry matching
 * `lifecycle_status` is that one bare param), so `OperatorId.Eq` is the only operator
 * offered. An explicit TARGET pins the static option list — the synthesised legacy
 * target reads "no options" as "use the grid's facets", and no endpoint computes a
 * `lifecycle_status` facet bucket, so that would render an empty picker.
 *
 * The value IS on every row: `lifecycle_status` sits on `EntityBaseReadMixin`
 * (`app/schemas/entity.py`), inherited by `EntityRead`, `EntityReadWoutAssets` and
 * `NestedEntityRead` alike, and it is non-nullable. No blank-column risk.
 *
 * TYPING: unlike every other factory here this one is NOT structurally constrained to
 * {@link IHasLifecycleStatus}. The wire carries the field on every entity, but not one
 * hand-written row type declares it — and a constraint whose only member is optional
 * is a WEAK TYPE, so `Row extends IHasLifecycleStatus` fails with "has no properties in
 * common" for every one of them (TS2559). The alternative, augmenting 20 row types with
 * a field the backend guarantees, buys nothing; the read is narrowed through
 * {@link IHasLifecycleStatus} right here instead, in one place, with the backend schema
 * named above as the oracle.
 */
export function lifecycleStatusColumn<Row>(o?: TColumnOverride<Row>): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'lifecycleStatus',
      header: 'Lifecycle status',
      sortable: false,
      // the label, not the wire value — the pill renderer resolves it again, but
      // `getValue` also feeds the quick filter, export and the no-renderer fallback
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
