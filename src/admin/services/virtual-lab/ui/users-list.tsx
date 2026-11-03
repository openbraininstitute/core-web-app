'use client';

import { useRouter } from 'next/navigation';

import { formatDateTime } from '../../../shared/format';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { adminQueryKeys } from '../../../shared/query-keys';
import { StatusPill } from '../../../shared/status-pill';
import { adminHref } from '../../../shell/admin-link';
import { searchUsers } from '../api/admin';
import { useListFilters } from './list-filters';
import { userDisplayName } from './user-roles';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminUser } from '../api/admin-types';

const USERS_SOURCE = pagedSource<AdminUser>(searchUsers);

const COLUMNS: Array<ISimpleColumn<AdminUser>> = [
  {
    id: 'name',
    header: 'Name',
    width: { flex: 2, minWidth: 220 },
    renderCell: (user) => (
      <span className="text-primary-9 truncate font-semibold">{userDisplayName(user)}</span>
    ),
  },
  {
    id: 'email',
    header: 'Email',
    width: { flex: 2, minWidth: 260 },
    getValue: (user) => user.email,
  },
  {
    id: 'status',
    header: 'Status',
    width: { width: 130 },
    renderCell: (user) =>
      user.enabled ? (
        <StatusPill tone="good">Active</StatusPill>
      ) : (
        <StatusPill tone="bad">Disabled</StatusPill>
      ),
  },
  {
    id: 'created',
    header: 'Created',
    width: { flex: 1, minWidth: 180 },
    getValue: (user) =>
      user.createdTimestamp && formatDateTime(new Date(user.createdTimestamp).toISOString()),
  },
];

export function UsersList() {
  const router = useRouter();
  const { params, gridKey, controls } = useListFilters();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="Users" />
      {controls('Search by name, username or email')}
      <AdminPagedGrid<AdminUser>
        key={gridKey}
        fill
        what="users"
        columns={COLUMNS}
        getRowId={({ id, enabled, firstName, lastName }) =>
          `${id}:${enabled}:${firstName}:${lastName}`
        }
        dataSource={USERS_SOURCE}
        queryKey={adminQueryKeys.users()}
        params={params}
        onRowClick={(user) => router.push(adminHref('user', user.id))}
      />
    </div>
  );
}
