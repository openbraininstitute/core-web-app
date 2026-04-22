'use client';

import { DeleteOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Popconfirm, Select } from 'antd';
import { compact, get } from 'es-toolkit/compat';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

import {
  cancelProjectInvite,
  listProjectMembers,
  removeUserFromProject,
  updateProjectUserRole,
} from '@/api/virtual-lab-svc/queries/member';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Modal } from '@/ui/molecules/modal';
import { InviteMembers } from '@/ui/segments/project/team/team-invitation';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { COLOR_DICTIONARY } from '@/util/color';
import { extractInitials } from '@/util/slugify';
import { cn } from '@/utils/css-class';

import type { Member, TRole } from '@/api/virtual-lab-svc/queries/types';

const roleOptions: Array<{ value: TRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
];

function memberDisplayName(member: Member) {
  return (
    compact([get(member, 'first_name'), get(member, 'last_name')]).join(' ') ||
    get(member, 'username') ||
    member.email
  );
}

function MemberCircle({
  member,
  index,
  isSelf,
  canModify,
  isProjectOwner,
}: {
  member: Member;
  index: number;
  isSelf: boolean;
  canModify: boolean;
  isProjectOwner: boolean;
}) {
  const queryClient = useQueryClient();
  const { virtualLabId, projectId } = useWorkspace();
  const color = COLOR_DICTIONARY[index % COLOR_DICTIONARY.length];
  const name = memberDisplayName(member);
  const initials = extractInitials(name) || '??';
  const pending = !member.invite_accepted;

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
    });

  const updateRoleMutation = useMutation({
    mutationFn: (role: TRole) =>
      updateProjectUserRole({ virtualLabId, projectId, userId: member.id, newRole: role }),
    onSettled: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: () => removeUserFromProject({ virtualLabId, projectId, userId: member.id }),
    onSettled: invalidate,
  });

  const cancelInviteMutation = useMutation({
    mutationFn: () =>
      cancelProjectInvite({ virtualLabId, projectId, email: member.email, role: member.role }),
    onSettled: invalidate,
  });

  const canChangeRole = canModify && !pending;
  const canDelete = canModify;

  const roleLabel = member.role === 'admin' ? 'Admin' : 'Member';

  return (
    <div className="group/circle relative">
      <Avatar
        size={40}
        shape="circle"
        style={{ backgroundColor: color.background, color: color.color }}
        className={cn(
          'flex items-center justify-center text-sm font-bold shadow-sm cursor-default transition-transform',
          pending && 'opacity-60'
        )}
      >
        {initials}
      </Avatar>

      {/* Popover wrapper: uses pb-2 (not mb-2) so the transparent padding area
          bridges the gap between the circle and the card, keeping group-hover active. */}
      <div
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-20 w-64 -translate-x-1/2 pb-2',
          'opacity-0 transition-opacity duration-150',
          'group-hover/circle:pointer-events-auto group-hover/circle:opacity-100'
        )}
      >
        <div className="border-neutral-2 text-primary-9 flex flex-col gap-2 rounded-xl border bg-white p-3 shadow-lg">
          <div className="flex flex-col gap-0.5">
            <div className="truncate text-sm font-bold" title={name}>
              {name}
            </div>
            <div className="text-neutral-4 truncate text-xs" title={member.email}>
              {member.email}
            </div>
            {pending && <div className="text-xs text-orange-500">Invite pending</div>}
            {isProjectOwner && <div className="text-neutral-4 text-xs">Project owner</div>}
            {isSelf && <div className="text-neutral-4 text-xs">You</div>}
          </div>

          <div className="flex items-center gap-2">
            {canChangeRole ? (
              <Select
                size="small"
                className="flex-1"
                value={member.role}
                options={roleOptions}
                disabled={updateRoleMutation.isPending}
                loading={updateRoleMutation.isPending}
                onChange={(value) => updateRoleMutation.mutate(value)}
              />
            ) : (
              <span className="text-primary-9 flex-1 text-xs font-semibold">{roleLabel}</span>
            )}

            {pending && canDelete ? (
              <Popconfirm
                placement="top"
                title="Cancel invitation"
                description={`Cancel invite to ${member.email}?`}
                onConfirm={() => cancelInviteMutation.mutate()}
                okText="Yes"
                cancelText="No"
                disabled={cancelInviteMutation.isPending}
              >
                <button
                  type="button"
                  aria-label="Cancel invite"
                  className="text-neutral-4 hover:text-destructive grid size-7 place-items-center rounded-md border border-neutral-2 transition-colors"
                  disabled={cancelInviteMutation.isPending}
                >
                  {cancelInviteMutation.isPending ? (
                    <LoadingOutlined className="text-xs" />
                  ) : (
                    <DeleteOutlined className="text-xs" />
                  )}
                </button>
              </Popconfirm>
            ) : canDelete && !pending ? (
              <Popconfirm
                placement="top"
                title="Remove member"
                description={`Remove ${name} from this project?`}
                onConfirm={() => removeMutation.mutate()}
                okText="Yes"
                cancelText="No"
                disabled={removeMutation.isPending}
              >
                <button
                  type="button"
                  aria-label="Remove member"
                  className="text-neutral-4 hover:text-destructive grid size-7 place-items-center rounded-md border border-neutral-2 transition-colors"
                  disabled={removeMutation.isPending}
                >
                  {removeMutation.isPending ? (
                    <LoadingOutlined className="text-xs" />
                  ) : (
                    <DeleteOutlined className="text-xs" />
                  )}
                </button>
              </Popconfirm>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MemberCircleRow() {
  const { virtualLabId, projectId } = useWorkspace();
  const { data: session } = useSession();
  const { data: listing } = useQuery({
    queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
    queryFn: () => listProjectMembers({ virtualLabId, projectId }),
  });
  const { virtualLabAdmins, projectAdmins, isVirtualLabAdmin, isProjectAdmin } =
    useWorkspaceMembership({ virtualLabId, projectId });

  const users = listing?.data?.users ?? [];
  const ownerId = listing?.data?.owner_id;
  const canManage = isVirtualLabAdmin || isProjectAdmin;
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-primary-9 text-xl font-bold">Members</h3>
      <div className="flex flex-wrap items-center gap-2">
        {users.map((member, index) => {
          const isSelf = member.id === session?.user?.id;
          const isProjectOwner = member.id === ownerId;
          const isTargetAdmin =
            !!virtualLabAdmins?.includes(member.id) || !!projectAdmins?.includes(member.id);
          // Cannot modify self. VL admins can modify anyone else; project admins can
          // only modify regular members (not other admins / owner).
          const canModify = canManage && !isSelf && (isVirtualLabAdmin || !isTargetAdmin);
          return (
            <MemberCircle
              key={member.id ?? member.email}
              member={member}
              index={index}
              isSelf={isSelf}
              isProjectOwner={isProjectOwner}
              canModify={canModify}
            />
          );
        })}
        {canManage && (
          <button
            type="button"
            aria-label="Add member"
            onClick={() => setInviteOpen(true)}
            className={cn(
              'bg-background text-primary-9 border-neutral-2 hover:bg-primary-9 hover:text-white',
              'grid size-10 shrink-0 place-items-center rounded-full border border-dashed shadow-sm transition-colors'
            )}
          >
            <PlusOutlined className="text-base" />
          </button>
        )}
        {users.length === 0 && !canManage && (
          <span className="text-neutral-4 text-xs">No members yet.</span>
        )}
      </div>
      {canManage && (
        <Modal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          title="Invite members"
          size="md"
          destroyOnClose
          bodyClassName="px-2 py-2"
        >
          <div className="h-[55vh] w-full">
            <InviteMembers onBack={() => setInviteOpen(false)} />
          </div>
        </Modal>
      )}
    </div>
  );
}

export default MemberCircleRow;
