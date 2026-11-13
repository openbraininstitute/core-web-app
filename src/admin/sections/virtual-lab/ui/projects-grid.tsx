'use client';

import { useRouter } from 'next/navigation';

import { adminQueryKeys } from '../../../query-keys';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { AdminLink, adminHref } from '../../../shell/admin-link';
import { listProjects } from '../api/admin';
import { createdColumn, deletableRowId, nameColumn } from './columns';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminProject } from '../api/admin-types';

const PROJECTS_SOURCE = pagedSource(listProjects);

const COLUMNS: Array<ISimpleColumn<AdminProject>> = [
  nameColumn(),
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
  createdColumn(),
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
      getRowId={(project) => `${deletableRowId(project)}:${project.virtual_lab_name}`}
      dataSource={PROJECTS_SOURCE}
      queryKey={adminQueryKeys.projects()}
      params={params}
      onRowClick={(project) => router.push(adminHref('project', project.id))}
    />
  );
}
