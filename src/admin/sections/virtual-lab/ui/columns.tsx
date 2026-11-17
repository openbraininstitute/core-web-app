import { formatDateTime } from '../../../shared/format';
import { StatusPill } from '../../../shared/status-pill';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';

type Deletable = { id: string; name: string; deleted: boolean };

export function nameColumn<Row extends Deletable>(): ISimpleColumn<Row> {
  return {
    id: 'name',
    header: 'Name',
    sortable: true,
    width: { flex: 3, minWidth: 260 },
    renderCell: (row) => (
      <span className="flex items-center gap-3">
        <span className="text-primary-9 truncate font-semibold">{row.name}</span>
        {row.deleted && <StatusPill tone="bad">Deleted</StatusPill>}
      </span>
    ),
  };
}

export function createdColumn<Row extends { created_at: string }>(): ISimpleColumn<Row> {
  return {
    id: 'created_at',
    header: 'Created',
    sortable: true,
    width: { flex: 1, minWidth: 180 },
    getValue: (row) => formatDateTime(row.created_at),
  };
}

// The name cell has no value, so a rename or a delete has to be a new row.
export const deletableRowId = ({ id, name, deleted }: Deletable) => `${id}:${name}:${deleted}`;
