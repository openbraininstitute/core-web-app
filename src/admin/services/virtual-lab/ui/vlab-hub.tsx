'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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
import { deleteLab, getLab, updateLab } from '../api/admin';
import { Billing } from './billing';
import { LabMembers } from './lab-members';
import { ProjectsGrid } from './projects-grid';
import { useTenancyWrite } from './use-tenancy-write';

import type { AdminLab, AdminLabUpdate } from '../api/admin-types';

const LABS_HREF = `${ADMIN_ROOT}/virtual-labs`;

function LabOverview({ lab }: { lab: AdminLab }) {
  return (
    <DetailList>
      <Detail label="Description">{lab.description}</Detail>
      <Detail label="Lab ID">
        <DetailId>{lab.id}</DetailId>
      </Detail>
      <Detail label="Owner">
        <AdminLink kind="user" id={lab.owner_id} />
      </Detail>
      <Detail label="Entity">{lab.entity}</Detail>
      <Detail label="Reference email">
        {lab.reference_email &&
          `${lab.reference_email} (${lab.email_verified ? 'verified' : 'unverified'})`}
      </Detail>
      <Detail label="Compute cell">{lab.compute_cell}</Detail>
      <Detail label="Projects">{lab.projects_count}</Detail>
      <Detail label="Created">{formatDateTime(lab.created_at)}</Detail>
      <Detail label="Updated">{lab.updated_at && formatDateTime(lab.updated_at)}</Detail>
    </DetailList>
  );
}

function LabActions({ lab }: { lab: AdminLab }) {
  const router = useRouter();
  const [open, setOpen] = useState<'edit' | 'delete' | null>(null);
  const close = () => setOpen(null);

  const editWrite = useTenancyWrite({
    write: (update: AdminLabUpdate) => updateLab(lab.id, update),
    done: 'Lab updated',
    failed: "Couldn't update the lab",
    onSuccess: close,
  });
  const deleteWrite = useTenancyWrite({
    write: () => deleteLab(lab.id),
    done: 'Lab deleted',
    failed: "Couldn't delete the lab",
    onSuccess: () => router.push(LABS_HREF),
  });

  return (
    <CapabilityGate need="virtualLab.admin">
      <Button rounded variant="outline" size="sm" onClick={() => setOpen('edit')}>
        Edit
      </Button>
      <Button rounded variant="outline" size="sm" onClick={() => setOpen('delete')}>
        Delete
      </Button>
      {open === 'edit' && (
        <FormModal<AdminLabUpdate>
          title="Edit virtual lab"
          fields={[
            {
              name: 'name',
              label: 'Name',
              rules: [{ required: true, message: 'Give it a name' }, { max: 250 }],
            },
            { name: 'description', label: 'Description', multiline: true },
            {
              name: 'reference_email',
              label: 'Reference email',
              rules: [{ type: 'email', message: 'Enter a valid email' }],
            },
            { name: 'entity', label: 'Entity' },
          ]}
          initialValues={{
            name: lab.name,
            description: lab.description,
            reference_email: lab.reference_email ?? undefined,
            entity: lab.entity,
          }}
          okText="Save"
          pending={editWrite.isPending}
          // The API validates the email, so a blank one has to stay out of the request.
          onSubmit={({ reference_email: email, ...update }) =>
            editWrite.mutate({ ...update, ...(email && { reference_email: email }) })
          }
          onClose={close}
        />
      )}
      {open === 'delete' && (
        <FormModal<{ name: string }>
          title={`Delete ${lab.name}?`}
          description="Its members lose access. The API has no way to restore a lab, so only a database change can undo this."
          fields={[
            {
              name: 'name',
              label: "Type the lab's name to confirm",
              rules: [
                {
                  validator: async (_, value) => {
                    if (value !== lab.name) throw new Error("That isn't the lab's name");
                  },
                },
              ],
            },
          ]}
          okText="Delete lab"
          danger
          pending={deleteWrite.isPending}
          onSubmit={() => deleteWrite.mutate(undefined)}
          onClose={close}
        />
      )}
    </CapabilityGate>
  );
}

export function VlabHub({ vlabId }: { vlabId: string }) {
  const { data: lab, error } = useQuery({
    queryKey: adminQueryKeys.lab({ vlabId }),
    queryFn: () => getLab(vlabId),
  });

  if (error) return <LoadFailure error={error} what="this lab" />;
  if (!lab) return <p className="text-neutral-4">Loading this lab</p>;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={lab.name}
        parent={{ label: 'Virtual labs', href: LABS_HREF }}
        deleted={lab.deleted}
        actions={!lab.deleted && <LabActions lab={lab} />}
      >
        {lab.deleted &&
          `Deleted${lab.deleted_at ? ` on ${formatDateTime(lab.deleted_at)}` : ''}. The API has no way to restore a lab.`}
      </PageHeader>
      <AdminTabs
        tabs={[
          { key: 'overview', label: 'Overview', content: <LabOverview lab={lab} /> },
          {
            key: 'members',
            label: 'Admins and pending invites',
            content: <LabMembers lab={lab} />,
          },
          {
            key: 'projects',
            label: 'Projects',
            content: <ProjectsGrid params={{ virtual_lab_id: lab.id, include_deleted: true }} />,
          },
          {
            key: 'subscriptions',
            label: 'Subscriptions',
            content: <Billing owner={{ virtual_lab_id: lab.id }} />,
          },
        ]}
      />
    </div>
  );
}
