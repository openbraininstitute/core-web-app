'use client';

import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../../query-keys';
import { saveChanges } from '../../../shared/changed-fields';
import { FormModal, NAME_FIELD } from '../../../shared/form-modal';
import { AdminQueryGrid } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { createInstitution, searchInstitutions, updateInstitution } from '../api/education';
import { useListFilters } from './list-filters';
import { useTenancyWrite } from './use-tenancy-write';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminInstitution, AdminInstitutionUpdate } from '../api/admin-types';

type InstitutionValues = Omit<AdminInstitution, 'id'>;

const FIELDS = [
  NAME_FIELD,
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
      onSubmit={write.mutate}
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
    write: (update: AdminInstitutionUpdate) => updateInstitution(institution.id, update),
    done: 'Institution updated',
    failed: "Couldn't update the institution",
    onSuccess: onClose,
  });

  return (
    <FormModal<InstitutionValues>
      title={`Edit ${institution.name}`}
      fields={FIELDS}
      initialValues={institution}
      okText="Save"
      pending={write.isPending}
      // Unlike create, the API's update doesn't trim the name.
      onSubmit={(values) =>
        saveChanges({ ...values, name: values.name.trim() }, institution, write.mutate, onClose)
      }
      onClose={onClose}
    />
  );
}

export function InstitutionsList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminInstitution | null>(null);
  const { params, controls } = useListFilters({ placeholder: 'Search by name' });
  const { query = '' } = params;

  const columns: Array<ISimpleColumn<AdminInstitution>> = [
    {
      id: 'name',
      header: 'Name',
      width: { flex: 2, minWidth: 260 },
      getValue: (institution) => institution.name,
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
      {controls}
      <AdminQueryGrid<AdminInstitution>
        what="institutions"
        columns={columns}
        // The Edit cell keeps the row it was drawn with, so a changed row is a new one.
        getRowId={({ id, name, contact_email: email }) => `${id}:${name}:${email}`}
        queryKey={adminQueryKeys.institutions(query)}
        queryFn={(signal) => searchInstitutions(query, signal)}
      />
      {creating && <InstitutionCreate onClose={() => setCreating(false)} />}
      {editing && <InstitutionEdit institution={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
