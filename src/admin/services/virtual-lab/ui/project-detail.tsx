'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { AdminTabs } from '../../../shared/admin-tabs';
import { Detail, DetailId, DetailList } from '../../../shared/detail-list';
import { FormModal } from '../../../shared/form-modal';
import { formatDateTime } from '../../../shared/format';
import { LoadFailure } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { adminQueryKeys } from '../../../shared/query-keys';
import { AdminLink } from '../../../shell/admin-link';
import { CapabilityGate } from '../../../shell/capability-gate';
import { ADMIN_ROOT } from '../../../shell/sections';
import {
  changeProjectMemberRole,
  deleteProject,
  getProject,
  getProjectMembers,
  removeProjectMember,
  restoreProject,
  updateProject,
} from '../api/admin';
import { MembersGrid } from './members-grid';
import { useTenancyWrite } from './use-tenancy-write';

import type { AdminProject, AdminProjectUpdate } from '../api/admin-types';

function ProjectActions({ project }: { project: AdminProject }) {
  const [open, setOpen] = useState<'edit' | 'delete' | 'restore' | null>(null);
  const close = () => setOpen(null);

  const editWrite = useTenancyWrite({
    write: (update: AdminProjectUpdate) => updateProject(project.id, update),
    done: 'Project updated',
    failed: "Couldn't update the project",
    onSuccess: close,
  });
  const deleteWrite = useTenancyWrite({
    write: () => deleteProject(project.id),
    done: 'Project deleted',
    failed: "Couldn't delete the project",
    onSuccess: close,
  });
  const restoreWrite = useTenancyWrite({
    write: () => restoreProject(project.id),
    done: 'Project restored',
    failed: "Couldn't restore the project",
    onSuccess: close,
  });

  return (
    <CapabilityGate need="virtualLab.admin">
      {project.deleted ? (
        <Button rounded variant="outline" size="sm" onClick={() => setOpen('restore')}>
          Restore
        </Button>
      ) : (
        <>
          <Button rounded variant="outline" size="sm" onClick={() => setOpen('edit')}>
            Edit
          </Button>
          <Button rounded variant="outline" size="sm" onClick={() => setOpen('delete')}>
            Delete
          </Button>
        </>
      )}
      {open === 'edit' && (
        <FormModal<{ name: string; description?: string }>
          title="Edit project"
          fields={[
            {
              name: 'name',
              label: 'Name',
              rules: [
                { required: true, whitespace: true, message: 'Give it a name' },
                { max: 250 },
              ],
            },
            { name: 'description', label: 'Description', multiline: true },
          ]}
          initialValues={{ name: project.name, description: project.description ?? undefined }}
          okText="Save"
          pending={editWrite.isPending}
          onSubmit={(update) => editWrite.mutate(update)}
          onClose={close}
        />
      )}
      {open === 'delete' && (
        <FormModal
          title={`Delete ${project.name}?`}
          description="Its members lose access until it's restored. You can restore it from this page."
          fields={[]}
          okText="Delete project"
          danger
          pending={deleteWrite.isPending}
          onSubmit={() => deleteWrite.mutate(undefined)}
          onClose={close}
        />
      )}
      {open === 'restore' && (
        <FormModal
          title={`Restore ${project.name}?`}
          description="Its members get access back. This fails if its lab is deleted, or if a live project in the lab has the same name."
          fields={[]}
          okText="Restore project"
          pending={restoreWrite.isPending}
          onSubmit={() => restoreWrite.mutate(undefined)}
          onClose={close}
        />
      )}
    </CapabilityGate>
  );
}

export function ProjectDetail({ projectId }: { projectId: string }) {
  const { data: project, error } = useQuery({
    queryKey: adminQueryKeys.project({ projectId }),
    queryFn: () => getProject(projectId),
  });

  if (!project) {
    return error ? (
      <LoadFailure error={error} what="this project" />
    ) : (
      <p className="text-neutral-4">Loading this project</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={project.name}
        parent={{ label: 'Projects', href: `${ADMIN_ROOT}/projects` }}
        deleted={project.deleted}
        actions={<ProjectActions project={project} />}
      >
        {project.deleted &&
          project.deleted_at &&
          `Deleted on ${formatDateTime(project.deleted_at)}.`}
      </PageHeader>
      <AdminTabs
        tabs={[
          {
            key: 'overview',
            label: 'Overview',
            content: (
              <DetailList>
                <Detail label="Description">{project.description}</Detail>
                <Detail label="Project ID">
                  <DetailId>{project.id}</DetailId>
                </Detail>
                <Detail label="Virtual lab">
                  <AdminLink
                    kind="vlab"
                    id={project.virtual_lab_id}
                    label={project.virtual_lab_name}
                  />
                </Detail>
                <Detail label="Owner">
                  <AdminLink kind="user" id={project.owner_id} />
                </Detail>
                <Detail label="Created">{formatDateTime(project.created_at)}</Detail>
                <Detail label="Updated">
                  {project.updated_at && formatDateTime(project.updated_at)}
                </Detail>
              </DetailList>
            ),
          },
          {
            key: 'members',
            label: 'Members',
            content: project.deleted ? (
              <p className="text-neutral-4">The API doesn't list members of a deleted project.</p>
            ) : (
              <MembersGrid
                place="this project"
                what="members"
                ownerId={project.owner_id}
                queryKey={adminQueryKeys.projectMembers({ projectId })}
                load={() => getProjectMembers(projectId)}
                changeRole={(userId, newRole) =>
                  changeProjectMemberRole(projectId, userId, newRole)
                }
                remove={(userId) => removeProjectMember(projectId, userId)}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
