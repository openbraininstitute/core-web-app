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

type Row = ISimulatableExtracellularRecordingArray;

/** Electrode-geometry label from the static dict. */
function electrodeTypeLabel(value: string | null | undefined): string {
  return Object.values(ElectrodeTypeDict).find((t) => t.key === value)?.label ?? '';
}

/**
 * `GET /simulatable-extracellular-recording-array` params with no column. Beyond
 * name/id/timestamps this filter class declares only `electrode_type` and `circuit_id`,
 * both bare (no `__in`, no `__ilike`). The endpoint accepts no brain-region params.
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
        // Exact UUID only — no list form.
        field: 'circuit_id',
        operators: [OperatorId.Eq],
        description: 'The circuit the array is placed in',
      },
    ],
  },
];

/**
 * Extracellular recording array listing
 * (`GET /simulatable-extracellular-recording-array`). Not brain-region aware — the
 * domain config discards brain-region params — so there is no brain-region column.
 * The Circuit column is display-only: the row carries only `circuit_id`.
 */
export const extracellularRecordingArraySchema: IGridSchema<Row> = {
  id: 'extracellular-recording-array',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: EntityCoreFields.RegistrationDate, direction: SortDirection.Desc }],
  selection: { enabled: true },
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
    // Not sortable: this endpoint's ordering fields are only creation_date,
    // update_date and name.
    {
      id: EntityCoreFields.ElectrodeType,
      header: 'Electrode type',
      align: Align.Left,
      sortable: false,
      getValue: (row) => electrodeTypeLabel(row.electrode_type),
      width: { minWidth: 150, flex: 1 },
      filter: {
        // Exact only — no list form on this endpoint.
        operators: [OperatorId.Eq],
        field: 'electrode_type',
        // Explicit target: a flat filter with no options falls back to facets.
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
    // Auxiliary — hidden until ticked. Not sortable: `contribution__pref_label` is
    // absent from this endpoint's ordering fields.
    contributionsColumn<Row>({
      auxiliary: true,
      sortable: false,
      filter: {
        operators: [OperatorId.Ilike, OperatorId.In],
        field: 'contribution__pref_label',
        // Explicit target: this endpoint computes no `contribution` facet bucket.
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
