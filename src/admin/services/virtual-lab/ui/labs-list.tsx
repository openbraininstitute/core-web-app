'use client';

import { useRouter } from 'next/navigation';

import { formatDateTime } from '../../../shared/format';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { adminQueryKeys } from '../../../shared/query-keys';
import { StatusPill } from '../../../shared/status-pill';
import { AdminLink, adminHref } from '../../../shell/admin-link';
import { listLabs } from '../api/admin';
import { useListFilters } from './list-filters';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminLab } from '../api/admin-types';

const LABS_SOURCE = pagedSource<AdminLab>(listLabs);

const COLUMNS: Array<ISimpleColumn<AdminLab>> = [
  {
    id: 'name',
    header: 'Name',
    sortable: true,
    width: { flex: 3, minWidth: 260 },
    renderCell: (lab) => (
      <span className="flex items-center gap-3">
        <span className="text-primary-9 truncate font-semibold">{lab.name}</span>
        {lab.deleted && <StatusPill tone="bad">Deleted</StatusPill>}
      </span>
    ),
  },
  {
    id: 'owner',
    header: 'Owner',
    width: { width: 140 },
    renderCell: (lab) => <AdminLink kind="user" id={lab.owner_id} />,
  },
  {
    id: 'projects',
    header: 'Projects',
    width: { width: 110 },
    getValue: (lab) => lab.projects_count,
  },
  {
    id: 'created_at',
    header: 'Created',
    sortable: true,
    width: { flex: 1, minWidth: 180 },
    getValue: (lab) => formatDateTime(lab.created_at),
  },
  {
    id: 'updated_at',
    header: 'Updated',
    sortable: true,
    width: { flex: 1, minWidth: 180 },
    getValue: (lab) => lab.updated_at && formatDateTime(lab.updated_at),
  },
];

export function LabsList() {
  const router = useRouter();
  const { params, gridKey, controls } = useListFilters({ scoped: true });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="Virtual labs" />
      {controls('Search by name')}
      <AdminPagedGrid<AdminLab>
        key={gridKey}
        fill
        what="virtual labs"
        columns={COLUMNS}
        getRowId={(lab) => lab.id}
        dataSource={LABS_SOURCE}
        queryKey={adminQueryKeys.labs()}
        params={params}
        onRowClick={(lab) => router.push(adminHref('vlab', lab.id))}
      />
    </div>
  );
}
