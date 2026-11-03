'use client';

import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { FormModal } from '../../../shared/form-modal';
import { formatDateTime } from '../../../shared/format';
import { AdminQueryGrid } from '../../../shared/grid';
import { adminQueryKeys } from '../../../shared/query-keys';
import { CapabilityGate } from '../../../shell/capability-gate';
import {
  cancelLabInvite,
  changeLabMemberRole,
  getLabInvites,
  getLabMembers,
  removeLabMember,
} from '../api/admin';
import { MembersGrid } from './members-grid';
import { useTenancyWrite } from './use-tenancy-write';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminLab, AdminLabInvite } from '../api/admin-types';

function LabInvites({ vlabId }: { vlabId: string }) {
  const [cancelling, setCancelling] = useState<AdminLabInvite | null>(null);
  const write = useTenancyWrite({
    write: (inviteId: string) => cancelLabInvite(vlabId, inviteId),
    done: 'Invite cancelled',
    failed: "Couldn't cancel the invite",
    onSuccess: () => setCancelling(null),
  });

  const columns: Array<ISimpleColumn<AdminLabInvite>> = [
    {
      id: 'email',
      header: 'Email',
      width: { flex: 2, minWidth: 260 },
      getValue: (i) => i.user_email,
    },
    { id: 'role', header: 'Role', width: { width: 160 }, getValue: (i) => i.role },
    {
      id: 'invited',
      header: 'Invited',
      width: { flex: 1, minWidth: 180 },
      getValue: (i) => formatDateTime(i.created_at),
    },
    {
      id: 'actions',
      header: '',
      width: { width: 120 },
      renderCell: (invite) => (
        <CapabilityGate need="virtualLab.admin">
          <Button rounded variant="outline" size="sm" onClick={() => setCancelling(invite)}>
            Cancel
          </Button>
        </CapabilityGate>
      ),
    },
  ];

  return (
    <>
      <AdminQueryGrid<AdminLabInvite>
        what="pending invites"
        columns={columns}
        getRowId={(invite) => invite.id}
        queryKey={adminQueryKeys.labInvites({ vlabId })}
        queryFn={() => getLabInvites(vlabId)}
      />
      {cancelling && (
        <FormModal
          title={`Cancel the invite to ${cancelling.user_email}?`}
          description="The invite link stops working. They can be invited again."
          fields={[]}
          okText="Cancel invite"
          danger
          pending={write.isPending}
          onSubmit={() => write.mutate(cancelling.id)}
          onClose={() => setCancelling(null)}
        />
      )}
    </>
  );
}

export function LabMembers({ lab }: { lab: AdminLab }) {
  if (lab.deleted) {
    return <p className="text-neutral-4">The API doesn't list members of a deleted lab.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-neutral-4 max-w-3xl">
        The API lists admins and pending invites only, so ordinary members don't appear here
        (backend ticket T2). A user's page shows all of their memberships.
      </p>
      <section className="flex flex-col gap-2">
        <h2 className="text-primary-9 font-semibold">Admins</h2>
        <MembersGrid
          place="this lab"
          what="admins"
          ownerId={lab.owner_id}
          queryKey={adminQueryKeys.labMembers({ vlabId: lab.id })}
          load={async () =>
            (await getLabMembers(lab.id)).filter((member) => member.invite_accepted)
          }
          changeRole={(userId, newRole) => changeLabMemberRole(lab.id, userId, newRole)}
          remove={(userId) => removeLabMember(lab.id, userId)}
        />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-primary-9 font-semibold">Pending invites</h2>
        <LabInvites vlabId={lab.id} />
      </section>
    </div>
  );
}
