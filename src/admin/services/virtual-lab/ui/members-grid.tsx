'use client';

import { Select } from 'antd';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { FormModal } from '../../../shared/form-modal';
import { AdminQueryGrid } from '../../../shared/grid';
import { StatusPill } from '../../../shared/status-pill';
import { AdminLink } from '../../../shell/admin-link';
import { CapabilityGate } from '../../../shell/capability-gate';
import { useTenancyWrite } from './use-tenancy-write';

import type { QueryKey } from '@tanstack/react-query';
import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminMember, UserRole } from '../api/admin-types';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
];

const roleLabel = (role: UserRole) => (role === 'admin' ? 'Admin' : 'Member');
const memberName = (member: AdminMember) => member.name || member.username || member.email;

type PendingWrite = { member: AdminMember & { id: string }; newRole?: UserRole };

export function MembersGrid({
  place,
  what,
  ownerId,
  queryKey,
  load,
  changeRole,
  remove,
}: {
  place: string;
  what: string;
  ownerId: string;
  queryKey: QueryKey;
  load: () => Promise<AdminMember[]>;
  changeRole: (userId: string, newRole: UserRole) => Promise<unknown>;
  remove: (userId: string) => Promise<unknown>;
}) {
  const [pending, setPending] = useState<PendingWrite | null>(null);
  const close = () => setPending(null);

  const roleWrite = useTenancyWrite({
    write: ({ userId, newRole }: { userId: string; newRole: UserRole }) =>
      changeRole(userId, newRole),
    done: 'Role changed',
    failed: "Couldn't change the role",
    onSuccess: close,
  });
  const removeWrite = useTenancyWrite({
    write: (userId: string) => remove(userId),
    done: 'Removed',
    failed: "Couldn't remove them",
    onSuccess: close,
  });

  const canManage = (member: AdminMember): member is PendingWrite['member'] =>
    Boolean(member.id) && member.invite_accepted && member.id !== ownerId;

  const columns: Array<ISimpleColumn<AdminMember>> = [
    {
      id: 'user',
      header: 'User',
      width: { flex: 2, minWidth: 260 },
      renderCell: (member) => (
        <span className="flex flex-col leading-tight">
          <AdminLink kind="user" id={member.id} label={memberName(member)} />
          <span className="text-neutral-4 truncate text-sm">{member.email}</span>
        </span>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      width: { width: 160 },
      renderCell: (member) => {
        const readOnly = <span>{roleLabel(member.role)}</span>;
        return canManage(member) ? (
          <CapabilityGate need="virtualLab.admin" fallback={readOnly}>
            <Select<UserRole>
              size="small"
              value={member.role}
              options={ROLE_OPTIONS}
              className="w-28"
              onChange={(newRole) => setPending({ member, newRole })}
            />
          </CapabilityGate>
        ) : (
          readOnly
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      width: { width: 130 },
      renderCell: (member) => {
        if (member.id === ownerId) return <StatusPill tone="neutral">Owner</StatusPill>;
        return member.invite_accepted ? (
          <StatusPill tone="good">Active</StatusPill>
        ) : (
          <StatusPill tone="warn">Invited</StatusPill>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      width: { width: 120 },
      renderCell: (member) =>
        canManage(member) && (
          <CapabilityGate need="virtualLab.admin">
            <Button rounded variant="outline" size="sm" onClick={() => setPending({ member })}>
              Remove
            </Button>
          </CapabilityGate>
        ),
    },
  ];

  return (
    <>
      <AdminQueryGrid<AdminMember>
        what={what}
        columns={columns}
        // A cell with no value doesn't refresh, so a changed role has to be a new row.
        getRowId={(member) => `${member.id ?? member.email}:${member.role}`}
        queryKey={queryKey}
        queryFn={load}
      />
      {pending?.newRole && (
        <FormModal
          title={`Make ${memberName(pending.member)} ${roleLabel(pending.newRole).toLowerCase()}?`}
          description={`This changes what they can do in ${place}.`}
          fields={[]}
          okText="Change role"
          pending={roleWrite.isPending}
          onSubmit={() =>
            roleWrite.mutate({ userId: pending.member.id, newRole: pending.newRole as UserRole })
          }
          onClose={close}
        />
      )}
      {pending && !pending.newRole && (
        <FormModal
          title={`Remove ${memberName(pending.member)}?`}
          description={`They lose access to ${place}.`}
          fields={[]}
          okText="Remove"
          danger
          pending={removeWrite.isPending}
          onSubmit={() => removeWrite.mutate(pending.member.id)}
          onClose={close}
        />
      )}
    </>
  );
}
