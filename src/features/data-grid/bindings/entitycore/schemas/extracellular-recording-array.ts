import {
  ElectrodeTypeDict,
  type ISimulatableExtracellularRecordingArray,
} from '@/api/entitycore/types/entities/simulatable-extracellular-recording-array';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import { Align, FreeEntryKind, OperatorId, SortDirection } from '../../../core';
import { createdByColumn, nameColumn, registrationDateColumn } from '../columns/catalog';
import { flatAdvancedFilters, recordIdFilter, staticOptions } from './common-filters';

import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
import type { IEntityGridDefinition } from '../registry';

// The hand-written entity type omits nothing we read, but `created_by` lives on
// EntityAuthorization and `creation_date` on Timestamps (both extended) — the catalog
// factories are structurally typed, so ISimulatableExtracellularRecordingArray satisfies them.
type Row = ISimulatableExtracellularRecordingArray;

/** Electrode-geometry label from the static dict (matches the legacy `find(...).label`). */
function electrodeTypeLabel(value: string | null | undefined): string {
  return Object.values(ElectrodeTypeDict).find((t) => t.key === value)?.label ?? '';
}

/**
 * ADVANCED FILTERS — `GET /simulatable-extracellular-recording-array` params with no
 * column filter in this grid. `SimulatableExtracellularRecordingArrayFilter` is a
 * small class: beyond name/id/timestamps it declares exactly `electrode_type` and
 * `circuit_id`, both BARE (no `__in`, no `__ilike`), which is why the Electrode type
 * and Circuit columns stayed display-only and the two land here as exact matches.
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
        id: 'electrodeType',
        label: 'Electrode type',
        // `electrode_type` (exact) ONLY — no list form on this endpoint.
        field: 'electrode_type',
        operators: [OperatorId.Eq],
        options: staticOptions(ElectrodeTypeDict),
        description: 'Electrode geometry the array uses',
      },
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
  {
    id: 'contribution',
    label: 'Contributors',
    filters: [
      {
        id: 'prefLabel',
        label: 'Contributor',
        // `contribution__pref_label__ilike`, `contribution__pref_label__in`. This
        // listing shows Created by, not Contributors.
        field: 'contribution__pref_label',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a contributor name',
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
 *  - Circuit (RecordingArrayCircuit): `filter: null` → display-only.
 *  - Electrode type: the legacy DropdownList uses the non-standard bare `electrode_type`
 *    constraint (no `__in`) and has no `order` mapping, so it is left display-only here
 *    rather than guess a serialization that diverges from the oracle.
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
    {
      id: EntityCoreFields.ElectrodeType,
      header: 'Electrode type',
      align: Align.Left,
      getValue: (row) => electrodeTypeLabel(row.electrode_type),
      width: { minWidth: 150, flex: 1 },
    },
    createdByColumn<Row>({ id: EntityCoreFields.CreatedBy }),
    registrationDateColumn<Row>({ id: EntityCoreFields.RegistrationDate }),
  ],
};

export const extracellularRecordingArrayGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray,
  schema: extracellularRecordingArraySchema,
};
