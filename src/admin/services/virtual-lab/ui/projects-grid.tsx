'use client';

import { useRouter } from 'next/navigation';

import { formatDateTime } from '../../../shared/format';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { adminQueryKeys } from '../../../shared/query-keys';
import { StatusPill } from '../../../shared/status-pill';
import { AdminLink, adminHref } from '../../../shell/admin-link';
import { listProjects } from '../api/admin';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminProject } from '../api/admin-types';

const PROJECTS_SOURCE = pagedSource<AdminProject>(listProjects);

const COLUMNS: Array<ISimpleColumn<AdminProject>> = [
  {
    id: 'name',
    header: 'Name',
    sortable: true,
    width: { flex: 3, minWidth: 260 },
    renderCell: (project) => (
      <span className="flex items-center gap-3">
        <span className="text-primary-9 truncate font-semibold">{project.name}</span>
        {project.deleted && <StatusPill tone="bad">Deleted</StatusPill>}
      </span>
    ),
  },
  {
    id: 'virtual_lab',
    header: 'Virtual lab',
    width: { flex: 2, minWidth: 200 },
    renderCell: (project) => (
      <AdminLink kind="vlab" id={project.virtual_lab_id} label={project.virtual_lab_name} />
    ),
  },
  {
    id: 'owner',
    header: 'Owner',
    width: { width: 140 },
    renderCell: (project) => <AdminLink kind="user" id={project.owner_id} />,
  },
  {
    id: 'created_at',
    header: 'Created',
    sortable: true,
    width: { flex: 1, minWidth: 180 },
    getValue: (project) => formatDateTime(project.created_at),
  },
];

export function ProjectsGrid({
  params,
  fill,
}: {
  params: Record<string, unknown>;
  fill?: boolean;
}) {
  const router = useRouter();

  return (
    <AdminPagedGrid<AdminProject>
      fill={fill}
      what="projects"
      columns={COLUMNS}
      getRowId={(project) => project.id}
      dataSource={PROJECTS_SOURCE}
      queryKey={adminQueryKeys.projects()}
      params={params}
      onRowClick={(project) => router.push(adminHref('project', project.id))}
    />
  );
}
