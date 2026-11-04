'use client';

import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { changedFields } from '../../../shared/changed-fields';
import { FormModal } from '../../../shared/form-modal';
import { AdminQueryGrid } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { adminQueryKeys } from '../../../shared/query-keys';
import { createInstitution, searchInstitutions, updateInstitution } from '../api/education';
import { useListFilters } from './list-filters';
import { useTenancyWrite } from './use-tenancy-write';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminInstitution } from '../api/admin-types';

type InstitutionValues = Omit<AdminInstitution, 'id'>;

const FIELDS = [
  {
    name: 'name',
    label: 'Name',
    rules: [{ required: true, whitespace: true, message: 'Give it a name' }, { max: 250 }],
  },
  {
    name: 'contact_email',
    label: 'Contact email',
    rules: [
      { required: true, message: 'Give an email' },
      { type: 'email' as const, message: 'Enter a valid email' },
    ],
  },
];

function InstitutionCreate({ onClose }: { onClose: () => void }) {
  const write = useTenancyWrite({
    write: createInstitution,
    done: 'Institution created',
    failed: "Couldn't create the institution",
    onSuccess: onClose,
  });

  return (
    <FormModal<InstitutionValues>
      title="Create an institution"
      fields={FIELDS}
      okText="Create"
      pending={write.isPending}
      onSubmit={(values) => write.mutate(values)}
      onClose={onClose}
    />
  );
}

function InstitutionEdit({
  institution,
  onClose,
}: {
  institution: AdminInstitution;
  onClose: () => void;
}) {
  const write = useTenancyWrite({
    write: (update: Partial<InstitutionValues>) => updateInstitution(institution.id, update),
    done: 'Institution updated',
    failed: "Couldn't update the institution",
    onSuccess: onClose,
  });

  return (
    <FormModal<InstitutionValues>
      title={`Edit ${institution.name}`}
      fields={FIELDS}
      initialValues={{ name: institution.name, contact_email: institution.contact_email }}
      okText="Save"
      pending={write.isPending}
      onSubmit={(values) => {
        const update = changedFields(values, institution);
        if (Object.keys(update).length) write.mutate(update);
        else onClose();
      }}
      onClose={onClose}
    />
  );
}

export function InstitutionsList() {
  const { params, gridKey, controls } = useListFilters();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminInstitution | null>(null);
  const query = params.query ?? '';

  const columns: Array<ISimpleColumn<AdminInstitution>> = [
    {
      id: 'name',
      header: 'Name',
      width: { flex: 2, minWidth: 260 },
      renderCell: ({ name }) => <span className="text-primary-9 font-semibold">{name}</span>,
    },
    {
      id: 'email',
      header: 'Contact email',
      width: { flex: 2, minWidth: 260 },
      getValue: (institution) => institution.contact_email,
    },
    {
      id: 'actions',
      header: '',
      width: { width: 90 },
      renderCell: (institution) => (
        <Button rounded variant="outline" size="sm" onClick={() => setEditing(institution)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Institutions"
        actions={
          <Button rounded variant="outline" size="sm" onClick={() => setCreating(true)}>
            Create institution
          </Button>
        }
      >
        The API has no way to delete an institution.
      </PageHeader>
      {controls('Search by name')}
      <AdminQueryGrid<AdminInstitution>
        key={gridKey}
        what="institutions"
        columns={columns}
        getRowId={({ id, name, contact_email: email }) => `${id}:${name}:${email}`}
        queryKey={adminQueryKeys.institutions({ query })}
        queryFn={() => searchInstitutions(query)}
      />
      {creating && <InstitutionCreate onClose={() => setCreating(false)} />}
      {editing && <InstitutionEdit institution={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
