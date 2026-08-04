import {
  ElectrodeTypeDict,
  type ISimulatableExtracellularRecordingArray,
} from '@/api/entitycore/types/entities/simulatable-extracellular-recording-array';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import { Align, FreeEntryKind, OperatorId, SortDirection } from '../../../core';
import {
  contributionsColumn,
  createdByColumn,
  nameColumn,
  registrationDateColumn,
} from '../columns/catalog';
import { lifecycleStatusColumn } from '../columns/lifecycle-status';
import { flatAdvancedFilters, recordIdFilter, staticOptions } from './common-filters';

import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
import type { IEntityGridDefinition } from '../registry';

// The hand-written entity type omits nothing we read, but `created_by` lives on
// EntityAuthorization and `creation_date` on Timestamps (both extended) — the catalog
// factories are structurally typed, so ISimulatableExtracellularRecordingArray satisfies them.
// `contributions` IS declared on it, and the wire really carries the list:
// `SimulatableExtracellularRecordingArrayRead` extends `EntityRead`
// (`ContributionReadWithoutEntityMixin`) and the list loader eager-loads
// `contributions → agent` (`app/service/simulatable_extracellular_recording_array.py`).
type Row = ISimulatableExtracellularRecordingArray;

/** Electrode-geometry label from the static dict (matches the legacy `find(...).label`). */
function electrodeTypeLabel(value: string | null | undefined): string {
  return Object.values(ElectrodeTypeDict).find((t) => t.key === value)?.label ?? '';
}

/**
 * ADVANCED FILTERS — `GET /simulatable-extracellular-recording-array` params with no
 * column in this grid. `SimulatableExtracellularRecordingArrayFilter` is a small
 * class: beyond name/id/timestamps it declares exactly `electrode_type` and
 * `circuit_id`, both BARE (no `__in`, no `__ilike`).
 *
 * `electrode_type` used to be here AND a display-only Electrode type column — the
 * same field on two surfaces, which is exactly what the one-field-one-surface rule
 * forbids. The filter now lives ON that column (no second column was created).
 * `contribution__pref_label` moved to an AUXILIARY Contributors column below.
 *
 * `circuit_id` stays: it is an ID-type field, and the Circuit column shows the raw
 * UUID with nothing to pick from. `id` stays for the same reason.
 *
 * The endpoint accepts no brain-region params at all, and the entity's domain config
 * discards brain-region filters before the call — nothing region-shaped is offered.
 */
const extracellularRecordingArrayAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
  {
    id: 'array',
    label: 'Array',
    filters: [
      {
        id: 'circuitId',
        label: 'Circuit ID',
        // `circuit_id` (exact UUID) ONLY — no list form.
        field: 'circuit_id',
        operators: [OperatorId.Eq],
        description: 'The circuit the array is placed in',
      },
    ],
  },
];

/**
 * Extracellular recording array listing — a plain text listing (mirrors
 * `electrical-cell-recording`). Column order follows the legacy
 * `view-defs/model/extracellular-recording-array.ts`. This entity is NOT brain-region aware
 * (its domain config discards brain-region params), so there is no brain-region column.
 *
 * Display-only decisions (legacy field metadata, `fields-defs/model.tsx`):
 *  - Description: `isFilterable: false` (search-box constraint) → no column filter.
 *  - Circuit (RecordingArrayCircuit): `filter: null` → display-only; the row carries
 *    only `circuit_id`, and the ID filter for it stays on the advanced panel.
 *  - Electrode type: the legacy DropdownList uses the non-standard bare `electrode_type`
 *    constraint (no `__in`) and has no `order` mapping, so the column filters with
 *    `OperatorId.Eq` and stays unsortable.
 *  - Created by: facet filter, but NOT server-sortable for this entity (absent from
 *    `created_by`'s `order.types`).
 */
export const extracellularRecordingArraySchema: IGridSchema<Row> = {
  id: 'extracellular-recording-array',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: EntityCoreFields.RegistrationDate, direction: SortDirection.Desc }],
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
  advancedFilters: flatAdvancedFilters(extracellularRecordingArrayAdvancedFilters),
  columns: [
    nameColumn<Row>({ id: EntityCoreFields.Name }),
    {
      id: EntityCoreFields.Description,
      header: 'Description',
      getValue: (row) => row.description ?? '',
      width: { minWidth: 200, flex: 2 },
    },
    {
      id: EntityCoreFields.RecordingArrayCircuit,
      header: 'Circuit',
      getValue: (row) => row.circuit_id ?? '',
      width: { minWidth: 160, flex: 1 },
    },
    // Electrode type: a VISIBLE column that now also owns its filter — the field was
    // previously offered twice, as this display-only column AND as an advanced filter.
    // Still not sortable: `ordering_model_fields` is only
    // ['creation_date', 'update_date', 'name'] on this endpoint.
    {
      id: EntityCoreFields.ElectrodeType,
      header: 'Electrode type',
      align: Align.Left,
      sortable: false,
      getValue: (row) => electrodeTypeLabel(row.electrode_type),
      width: { minWidth: 150, flex: 1 },
      filter: {
        // `electrode_type` (exact) ONLY — no list form on this endpoint.
        operators: [OperatorId.Eq],
        field: 'electrode_type',
        // an explicit TARGET, not flat props alone: the synthesised legacy target
        // reads "no options" as "use the grid's facets", and pinning the static
        // source here keeps the picker the advanced filter had
        targets: [
          {
            id: 'electrodeType',
            label: 'Electrode type',
            field: 'electrode_type',
            operators: [OperatorId.Eq],
            options: staticOptions(ElectrodeTypeDict),
            description: 'Electrode geometry the array uses',
          },
        ],
      },
    },
    lifecycleStatusColumn<Row>(),
    createdByColumn<Row>({ id: EntityCoreFields.CreatedBy }),
    registrationDateColumn<Row>({ id: EntityCoreFields.RegistrationDate }),
    // AUXILIARY — hidden until ticked; replaces the `contribution` advanced filter.
    // NOT sortable: `contribution__pref_label` is absent from this endpoint's
    // `ordering_model_fields`, and an `order_by` outside that list is a hard 422.
    contributionsColumn<Row>({
      auxiliary: true,
      sortable: false,
      filter: {
        // `contribution__pref_label__ilike`, `contribution__pref_label__in`
        operators: [OperatorId.Ilike, OperatorId.In],
        field: 'contribution__pref_label',
        // explicit target: this endpoint computes no `contribution` facet bucket, so
        // the synthesised "no options ⇒ use facets" target would be an empty picker
        targets: [
          {
            id: 'prefLabel',
            label: 'Contributor',
            field: 'contribution__pref_label',
            operators: [OperatorId.Ilike, OperatorId.In],
            freeEntry: FreeEntryKind.Text,
            placeholder: 'Enter a contributor name',
          },
        ],
      },
    }),
  ],
};

export const extracellularRecordingArrayGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray,
  schema: extracellularRecordingArraySchema,
};
