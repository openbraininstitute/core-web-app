import {
  ElectrodeTypeDict,
  type ISimulatableExtracellularRecordingArray,
} from '@/api/entitycore/types/entities/simulatable-extracellular-recording-array';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import { createdByColumn, nameColumn, registrationDateColumn } from '../columns/catalog';

import type { GridSchema } from '../../../core';
import type { EntityGridDefinition } from '../registry';

// The hand-written entity type omits nothing we read, but `created_by` lives on
// EntityAuthorization and `creation_date` on Timestamps (both extended) — the catalog
// factories are structurally typed, so ISimulatableExtracellularRecordingArray satisfies them.
type Row = ISimulatableExtracellularRecordingArray;

/** Electrode-geometry label from the static dict (matches the legacy `find(...).label`). */
function electrodeTypeLabel(value: string | null | undefined): string {
  return Object.values(ElectrodeTypeDict).find((t) => t.key === value)?.label ?? '';
}

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
export const extracellularRecordingArraySchema: GridSchema<Row> = {
  id: 'extracellular-recording-array',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: EntityCoreFields.RegistrationDate, direction: 'desc' }],
  selection: { enabled: true },
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
      align: 'left',
      getValue: (row) => electrodeTypeLabel(row.electrode_type),
      width: { minWidth: 150, flex: 1 },
    },
    createdByColumn<Row>({ id: EntityCoreFields.CreatedBy }),
    registrationDateColumn<Row>({ id: EntityCoreFields.RegistrationDate }),
  ],
};

export const extracellularRecordingArrayGridDefinition: EntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray,
  schema: extracellularRecordingArraySchema,
};
