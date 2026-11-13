'use client';

import { useQuery } from '@tanstack/react-query';

import { adminQueryKeys } from '../../../query-keys';
import { ADMIN_ROOT } from '../../../routes';
import { Detail, DetailId, DetailList } from '../../../shared/detail-list';
import { AdminRowsGrid } from '../../../shared/grid';
import { Loaded } from '../../../shared/load-state';
import { PageHeader } from '../../../shared/page-header';
import { StatusPill } from '../../../shared/status-pill';
import { AdminLink } from '../../../shell/admin-link';
import { getUser } from '../api/admin';
import { Billing } from './billing';
import { projectRole, userDisplayName } from './user-roles';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminUserDetails } from '../api/admin-types';

type LabMembership = AdminUserDetails['virtual_labs'][number];
type ProjectMembership = AdminUserDetails['projects'][number];

const LAB_COLUMNS: Array<ISimpleColumn<LabMembership>> = [
  {
    id: 'lab',
    header: 'Virtual lab',
    width: { flex: 2, minWidth: 260 },
    renderCell: (lab) => <AdminLink kind="vlab" id={lab.id} label={lab.name} />,
  },
  { id: 'role', header: 'Role', width: { width: 140 }, getValue: (lab) => lab.role },
];

export function UserDetail({ userId }: { userId: string }) {
  const query = useQuery({
    queryKey: adminQueryKeys.user(userId),
    queryFn: () => getUser(userId),
  });

  // Billing needs only the id, so it loads alongside the user rather than after, unless the
  // user can't be loaded at all.
  return (
    <div className="flex flex-col gap-6">
      <Loaded query={query} what="this user">
        {(data) => <UserSummary data={data} />}
      </Loaded>
      {!query.error && <Billing owner={{ user_id: userId }} />}
    </div>
  );
}

function UserSummary({
  data: { user, groups, virtual_labs: labs, projects },
}: {
  data: AdminUserDetails;
}) {
  const projectColumns: Array<ISimpleColumn<ProjectMembership>> = [
    {
      id: 'project',
      header: 'Project',
      width: { flex: 2, minWidth: 260 },
      renderCell: (project) => <AdminLink kind="project" id={project.id} label={project.name} />,
    },
    {
      id: 'lab',
      header: 'Virtual lab',
      width: { width: 140 },
      renderCell: (project) => <AdminLink kind="vlab" id={project.virtual_lab_id} />,
    },
    {
      id: 'role',
      header: 'Role',
      width: { width: 140 },
      getValue: (project) => projectRole(project, groups),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={userDisplayName(user)}
        parent={{ label: 'Users', href: `${ADMIN_ROOT}/users` }}
      />
      <DetailList>
        <Detail label="User ID">
          <DetailId>{user.id}</DetailId>
        </Detail>
        <Detail label="Username">{user.username}</Detail>
        <Detail label="Email">
          {user.email && `${user.email} (${user.emailVerified ? 'verified' : 'unverified'})`}
        </Detail>
        <Detail label="Status">
          {user.enabled ? (
            <StatusPill tone="good">Active</StatusPill>
          ) : (
            <StatusPill tone="bad">Disabled</StatusPill>
          )}
        </Detail>
        <Detail label="Groups">
          {groups.length > 0 && (
            <details>
              <summary className="cursor-pointer">{groups.length} groups</summary>
              <ul className="mt-2 flex flex-col gap-1 font-mono text-sm">
                {groups.map((group) => (
                  <li key={group}>{group}</li>
                ))}
              </ul>
            </details>
          )}
        </Detail>
      </DetailList>
      <section className="flex flex-col gap-2">
        <h2 className="text-primary-9 font-semibold">Virtual labs</h2>
        <AdminRowsGrid<LabMembership>
          what="virtual labs"
          columns={LAB_COLUMNS}
          rows={labs}
          getRowId={(lab) => lab.id}
        />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-primary-9 font-semibold">Projects</h2>
        <AdminRowsGrid<ProjectMembership>
          what="projects"
          columns={projectColumns}
          rows={projects}
          getRowId={(project) => project.id}
        />
      </section>
    </div>
  );
}
