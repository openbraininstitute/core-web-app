'use client';

import { useRouter } from 'next/navigation';

import { adminQueryKeys } from '../../../query-keys';
import { formatDateTime } from '../../../shared/format';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { AdminLink, adminHref } from '../../../shell/admin-link';
import { listLabs } from '../api/admin';
import { createdColumn, deletableRowId, nameColumn } from './columns';
import { useListFilters } from './list-filters';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminLab } from '../api/admin-types';

const LABS_SOURCE = pagedSource(listLabs);

const COLUMNS: Array<ISimpleColumn<AdminLab>> = [
  nameColumn(),
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
  createdColumn(),
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
  const { params, gridKey, controls } = useListFilters({
    scoped: true,
    placeholder: 'Search by name',
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="Virtual labs" />
      {controls}
      <AdminPagedGrid<AdminLab>
        key={gridKey}
        fill
        what="virtual labs"
        columns={COLUMNS}
        getRowId={deletableRowId}
        dataSource={LABS_SOURCE}
        queryKey={adminQueryKeys.labs()}
        params={params}
        onRowClick={(lab) => router.push(adminHref('vlab', lab.id))}
      />
    </div>
  );
}
