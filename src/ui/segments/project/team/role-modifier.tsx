'use client';

import { DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Popconfirm, Select, Button as AntdButton } from 'antd';
import { find, get } from 'es-toolkit/compat';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

import { useAppNotification } from '@/components/notification';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import {
  cancelProjectInvite,
  removeUserFromProject,
  updateProjectUserRole,
} from '@/api/virtual-lab-svc/queries/member';
import { cn } from '@/utils/css-class';

import type { Member, Role } from '@/api/virtual-lab-svc/queries/types';

export const roleOptions: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'member', label: 'Member' },
];

type RoleModifierProps = {
  user: Member;
  projectOwnerId?: string;
  virtualLabAdmins?: Array<string> | null;
  projectAdmins?: Array<string> | null;
  isVirtualLabAdmin: boolean;
  isProjectAdmin: boolean;
};

export function RoleModifier({
  user,
  projectOwnerId,
  virtualLabAdmins,
  projectAdmins,
  isVirtualLabAdmin,
  isProjectAdmin,
}: RoleModifierProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { virtualLabId, projectId } = useWorkspace();
  const { error: notifyError, success: notifySuccess } = useAppNotification();
  const [role, updateRole] = useState(user.role);

  const cancelInviteMutation = useMutation({
    mutationKey: [`${virtualLabId}/${projectId}/delete-item/${user.email}`],
    mutationFn: () =>
      cancelProjectInvite({
        virtualLabId,
        projectId,
        email: user.email,
        role: user.role,
      }),
    onMutate: () => {
      const row =
        document.querySelector(`tr[data-row-key="${user.email}"]`) ??
        document.querySelector(`tr[data-row-key="${user.id}"]`);

      if (row) {
        row.classList.add('ant-table-row-remove');
      }
      return { row };
    },
    onError: (_e, _v, ctx) => {
      notifyError({
        message:
          'Failed to cancel invite. Please try again or contact support if the issue persists.',
        placement: 'topRight',
        key: 'user-cancel-invite',
      });
      if (ctx?.row) {
        ctx.row.classList.remove('ant-table-row-remove');
      }
    },
    async onSuccess() {
      notifySuccess({
        message: (
          <div className="text-primary-9">
            Invite for <strong> {user.email}</strong> cancelled successfully
          </div>
        ),
        placement: 'topRight',
        key: 'user-cancel-invite',
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: (_role: Role) =>
      updateProjectUserRole({
        virtualLabId,
        projectId,
        userId: user.id,
        newRole: _role,
      }),
    onMutate: (_role) => {
      return { role: _role };
    },
    onError() {
      notifyError({
        message:
          'Failed to update user role. Please try again or contact support if the issue persists.',
        placement: 'topRight',
        key: 'user-role-update',
      });
      updateRole(user.role); // revert to previous role
    },
    async onSuccess(_, variables) {
      notifySuccess({
        message: `User "${user.name}" role updated to ${get(find(roleOptions, { value: variables }), 'label')} successfully`,
        placement: 'topRight',
        key: 'user-role-update',
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationKey: [`${virtualLabId}/${projectId}/delete-item/${user.id}`],
    mutationFn: () =>
      removeUserFromProject({
        virtualLabId,
        projectId,
        userId: user.id,
      }),
    onMutate: () => {
      const row =
        document.querySelector(`tr[data-row-key="${user.email}"]`) ??
        document.querySelector(`tr[data-row-key="${user.id}"]`);

      if (row) {
        row.classList.add('ant-table-row-remove');
      }
      return { row };
    },
    onError: (error, _v, ctx) => {
      if (get(error, 'cause.error_code') === 'FORBIDDEN_OPERATION') {
        notifyError({
          message: 'You are not authorized to remove this user from the virtual lab.',
          placement: 'topRight',
          key: 'user-remove-from-vlab',
        });
        return;
      }
      notifyError({
        message:
          'Failed to remove user from virtual lab. Please try again or contact support if the issue persists.',
        placement: 'topRight',
        key: 'user-remove-from-vlab',
      });
      if (ctx?.row) {
        ctx.row.classList.remove('ant-table-row-remove');
      }
    },
    async onSuccess() {
      notifySuccess({
        message: `User "${user.name}" removed from virtual lab successfully`,
        placement: 'topRight',
        key: 'user-remove-from-vlab',
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
      });
    },
  });

  const isProjectOwner =
    isVirtualLabAdmin || (projectOwnerId === user.id && user.id === session?.user.id);
  const isWorkspaceAdmin = virtualLabAdmins?.includes(user.id) || projectAdmins?.includes(user.id);

  if (!isWorkspaceAdmin && !isProjectOwner && user.id === session?.user.id) {
    return (
      <div className="flex w-full flex-col items-center justify-end pr-3 text-right">
        <div className="hover:text-primary-2! text-primary-9 w-max! self-end font-bold">
          {get(find(roleOptions, { value: user.role }), 'label', 'admin')}
        </div>
      </div>
    );
  }
  // if the user is the same user logged in, then don't allow it to change it's role
  if (user.id === session?.user.id) {
    return (
      <div className="flex w-full flex-col items-center justify-end pr-3 text-right">
        <div className="hover:text-primary-2! text-primary-9 w-max! self-end font-bold">
          {get(find(roleOptions, { value: user.role }), 'label', 'admin')}
        </div>
      </div>
    );
  }
  // if the logged in user is not the owner,
  if (
    !isProjectOwner &&
    (virtualLabAdmins?.includes(user.id) || projectAdmins?.includes(user.id))
  ) {
    return (
      <div className="flex w-full flex-col items-center justify-end pr-3 text-right">
        <div className="hover:text-primary-2! text-primary-9 w-max! self-end font-bold">
          {get(find(roleOptions, { value: user.role }), 'label', 'admin')}
        </div>
      </div>
    );
  }
  if (isVirtualLabAdmin || isProjectAdmin || isProjectOwner) {
    return user.invite_accepted ? (
      <div className="ml-auto text-right text-base text-white">
        <div className="ml-auto flex w-full flex-col items-end justify-end text-right text-base text-white">
          <div className="flex w-max flex-row items-center justify-center gap-2">
            <Select
              data-testid="role-select"
              className={cn(
                'focus:border-primary-8 w-full bg-transparent shadow-none ring-0 focus:border-2',
                '[&_.ant-select-selector]:!rounded-none [&_.ant-select-selector]:!bg-transparent',
                '[&_.ant-select-selector]:!border-primary-7 [&_.ant-select-selector]:!border',
                '[&_.ant-select-selection-item]:!text-primary-8 [&_.ant-select-selection-item]:!font-bold',
                '[&_.ant-select-arrow]:!text-primary-8 min-w-[140px] [&_.ant-select-selection-item]:!text-left'
              )}
              onChange={(value) => {
                updateRole(value);
                updateRoleMutation.mutateAsync(value);
              }}
              value={role}
              size="large"
              options={roleOptions}
              popupClassName="rounded-none!"
              disabled={updateRoleMutation.isPending}
              loading={updateRoleMutation.isPending}
            />
            <Popconfirm
              placement="bottomLeft"
              title="Remove member"
              description="Are you sure to remove this member from the project ?"
              onConfirm={() => removeItemMutation.mutateAsync()}
              okText="Yes"
              cancelText="No"
              disabled={removeItemMutation.isPending}
              classNames={{
                root: cn(
                  '[&_.ant-popover-inner]:bg-primary-9! [&_.ant-popover-inner]:text-white! ',
                  '[&_.ant-popover-inner]:rounded-none! [&_.ant-popconfirm-description]:text-white!',
                  '[&_.ant-popconfirm-title]:text-white!',
                  '[&_.ant-popconfirm-buttons>button]:rounded-none! [&_.ant-popconfirm-buttons>button]:px-5!',
                  '[&_.ant-popover-arrow]:after:bg-primary-9!'
                ),
              }}
            >
              <AntdButton
                className="bg-primary-9 hover:text-destructive! h-12 w-14! rounded-none hover:bg-white!"
                type="primary"
                variant="outlined"
                size="large"
                icon={<DeleteOutlined className="text-lg" />}
                disabled={removeItemMutation.isPending}
                loading={removeItemMutation.isPending}
              />
            </Popconfirm>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex w-full flex-col items-center justify-end text-right">
        <Button
          data-testid="cancel-invite-btn"
          key="cancel-invite"
          type="button"
          size="md"
          variant="outline"
          className="w-max! self-end rounded-none"
          disabled={cancelInviteMutation.isPending}
          onClick={() => cancelInviteMutation.mutateAsync()}
        >
          Cancel invitation
          {cancelInviteMutation.isPending && <LoadingOutlined spin className="ml-2" />}
        </Button>
      </div>
    );
  }
  return null;
}
