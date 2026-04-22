'use client';

import { DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Popconfirm, Select } from 'antd';
import { compact, get } from 'es-toolkit/compat';
import { useSession } from 'next-auth/react';

import {
  cancelProjectInvite,
  listProjectMembers,
  removeUserFromProject,
  updateProjectUserRole,
} from '@/api/virtual-lab-svc/queries/member';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { useWorkspace } from '@/ui/hooks/use-workspace';
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
  canManage,
  isSelf,
  isOwner,
}: {
  member: Member;
  index: number;
  canManage: boolean;
  isSelf: boolean;
  isOwner: boolean;
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

  const canDelete = canManage && !isSelf && !isOwner;
  const canChangeRole = canManage && !isSelf && !isOwner && !pending;

  return (
    <div className="group/circle relative">
      <Avatar
        size={40}
        shape={member.role === 'admin' ? 'square' : 'circle'}
        style={{ backgroundColor: color.background, color: color.color }}
        className={cn(
          'flex items-center justify-center text-sm font-bold shadow-sm cursor-default transition-transform',
          pending && 'opacity-60'
        )}
      >
        {initials}
      </Avatar>

      <div
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2',
          'opacity-0 transition-opacity duration-150 group-hover/circle:pointer-events-auto group-hover/circle:opacity-100'
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
              <span className="text-primary-9 flex-1 text-xs font-semibold capitalize">
                {member.role}
                {isOwner && ' · owner'}
                {isSelf && ' · you'}
              </span>
            )}

            {pending ? (
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
            ) : canDelete ? (
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

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-primary-9 text-xl font-bold">Members</h3>
      <div className="flex flex-wrap items-center gap-2">
        {users.map((member, index) => {
          const isSelf = member.id === session?.user?.id;
          const isOwner =
            member.id === ownerId ||
            !!virtualLabAdmins?.includes(member.id) ||
            !!projectAdmins?.includes(member.id);
          return (
            <MemberCircle
              key={member.id ?? member.email}
              member={member}
              index={index}
              canManage={canManage}
              isSelf={isSelf}
              isOwner={isOwner && member.id !== session?.user?.id}
            />
          );
        })}
        {users.length === 0 && <span className="text-neutral-4 text-xs">No members yet.</span>}
      </div>
    </div>
  );
}

export default MemberCircleRow;
