'use client';

import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { ConfigProvider, Popconfirm, Select, Table } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import { ColumnType } from 'antd/es/table';
import { useMemo, useState } from 'react';

import compact from 'lodash/compact';
import sortBy from 'lodash/sortBy';
import find from 'lodash/find';
import get from 'lodash/get';

import CustomPopover from '@/features/entities/neuron-simulation/experiment/elements/popover';
import AddMembersModal from '@/components/VirtualLab/create-entity-flows/project/add-members';

import { MemberAvatarCasual } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useAppNotification } from '@/components/notification';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/queries/workspace';
import { extractInitials } from '@/util/slugify';
import { Button } from '@/ui/molecules/button';
import {
  cancelProjectInvite,
  listProjectMembers,
  removeUserFromProject,
  updateProjectUserRole,
} from '@/api/virtual-lab-svc/queries/member';
import { classNames } from '@/util/utils';

import type { Member, Role } from '@/api/virtual-lab-svc/queries/types';

const roleOptions: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'member', label: 'Member' },
];

type RoleModifierProps = {
  user: Member;
  ownerId?: string;
};

function RoleModifier({ user, ownerId }: RoleModifierProps) {
  const { data } = useSession();
  const { virtualLabId, projectId } = useWorkspace();
  const { error: notifyError, success: notifySuccess } = useAppNotification();
  const [role, updateRole] = useState(user.role);
  const queryClient = useQueryClient();

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
    },
    onError: () => {
      notifyError({
        message:
          'Failed to cancel invite. Please try again or contact support if the issue persists.',
        placement: 'topRight',
        key: 'user-cancel-invite',
      });
    },
    async onSuccess() {
      notifySuccess({
        message: `Invite for ${user.email} cancelled successfully`,
        placement: 'topRight',
        key: 'user-cancel-invite',
      });
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
    onError() {
      notifyError({
        message:
          'Failed to update user role. Please try again or contact support if the issue persists.',
        placement: 'topRight',
        key: 'user-role-update',
      });
    },
    async onSuccess(_, variables) {
      notifySuccess({
        message: `User "${user.name}" role updated to ${get(find(roleOptions, { value: variables }), 'label')} successfully`,
        placement: 'topRight',
        key: 'user-role-update',
      });
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
      const row = document.querySelector(`tr[data-row-key="${user.id}"]`);
      if (row) {
        row.classList.add('ant-table-row-remove');
      }
    },
    onError: (error) => {
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
    },
    async onSuccess() {
      notifySuccess({
        message: `User "${user.name}" removed from virtual lab successfully`,
        placement: 'topRight',
        key: 'user-remove-from-vlab',
      });
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
      });
    },
  });

  if (user.id === ownerId || user.id === data?.user.id) {
    return (
      <div className="flex w-full flex-col items-center justify-end pr-3 text-right">
        <div className="hover:text-primary-2! text-primary-9 w-max! self-end font-bold">
          {get(find(roleOptions, { value: user.role }), 'label')}
        </div>
      </div>
    );
  }

  return user.invite_accepted ? (
    <div className="ml-auto text-right text-base text-white">
      <div className="ml-auto flex w-full flex-col items-end justify-end text-right text-base text-white">
        <div className="flex w-max flex-row items-center justify-center gap-2">
          <Select
            data-testid="role-select"
            className={classNames(
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
              root: classNames(
                '[&_.ant-popover-inner]:bg-primary-9! [&_.ant-popover-inner]:text-white! ',
                '[&_.ant-popover-inner]:rounded-none! [&_.ant-popconfirm-description]:text-white!',
                '[&_.ant-popconfirm-title]:text-white!',
                '[&_.ant-popconfirm-buttons>button]:rounded-none! [&_.ant-popconfirm-buttons>button]:px-5!',
                '[&_.ant-popover-arrow]:after:bg-primary-9!'
              ),
            }}
          >
            <Button
              className="hover:text-primary-2! w-max! self-end text-white! opacity-100!"
              type="button"
              variant="outline"
              size="lg"
              disabled={removeItemMutation.isPending}
              loading={removeItemMutation.isPending}
            >
              Remove member
            </Button>
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
        className="hover:text-primary-2! w-max! self-end text-white! opacity-100!"
        disabled={cancelInviteMutation.isPending}
        loading={cancelInviteMutation.isPending}
        onClick={() => cancelInviteMutation.mutateAsync()}
      >
        Cancel invitation
      </Button>
    </div>
  );
}

export function TeamTable() {
  const { data } = useSession();
  const { virtualLabId, projectId } = useWorkspace();
  const [isOpen, setOpen] = useState(false);

  const onClose = () => setOpen(false);
  const onOpen = () => setOpen(true);

  const { data: team, isLoading } = useSuspenseQuery({
    queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
    queryFn: () => listProjectMembers({ virtualLabId, projectId }),
  });

  const ownerId = team?.data?.owner_id;
  const total = team?.data?.total;
  const users = team?.data?.users;
  const [popoverOpen, setIsPopoverOpen] = useState(false);

  const { isAllowedBySubscription, isAdmin, isProjectAdmin, loading } = useUserPermissions({
    virtualLabId,
    projectId,
  });
  const allowedOperation = isAllowedBySubscription && (isAdmin || isProjectAdmin) && !loading;

  const columns: Array<ColumnType<Member>> = [
    {
      title: 'name',
      dataIndex: 'name',
      key: 'name',
      width: 400,
      render: (_: string, record: Member, indx) => (
        <div className="flex w-max items-center justify-center">
          <MemberAvatarCasual
            withEmail
            shape={record.role === 'admin' ? 'square' : 'circle'}
            key={`project-avatar-${record.id ?? record.email}`}
            index={indx}
            size="small"
            layout="horizontal"
            id={record.id ?? record.email}
            email={record.email}
            role={record.role}
            pending={!record.invite_accepted}
            name={
              record.id
                ? compact([get(record, 'first_name'), get(record, 'last_name')]).join(' ') ||
                  get(record, 'username') ||
                  record.email
                : record.email
            }
            initials={extractInitials(
              record.id
                ? compact([get(record, 'first_name'), get(record, 'last_name')]).join(' ') ||
                    get(record, 'username') ||
                    record.email
                : record.email
            )}
            cls={{
              text: classNames(
                'text-white  wrap-text',
                record.invite_accepted ? 'font-bold' : 'font-light'
              ),
            }}
          />
        </div>
      ),
    },
    {
      title: 'Action',
      key: 'role',
      dataIndex: 'role',
      align: 'right',
      width: '250px',
      render: (_: Role, record) => <RoleModifier ownerId={ownerId} user={record} />,
    },
  ];

  const onOpenChange = (visible: boolean) => {
    if (loading) return;
    if (!allowedOperation || !visible) setIsPopoverOpen(true);
    else setIsPopoverOpen(false);
  };

  const orderedUsers = useMemo(
    () =>
      sortBy(users, [
        (member) => (member.id === ownerId ? 0 : 1),
        (member) => (member.id === data?.user.id ? 0 : 1),
        (member) => (member.invite_accepted && member.role === 'admin' ? 0 : 1),
        (member) => (member.invite_accepted && member.role === 'member' ? 0 : 1),
        (member) => (member.invite_accepted ? 0 : 1),
        'created_at',
      ]),
    [users, ownerId, data?.user.id]
  );

  return (
    <div className="flex h-full flex-col pb-8">
      <div className="flex h-8 shrink-0 items-center px-3">
        <div className="flex w-full justify-between gap-2">
          <span className="text-primary-9 text-lg font-bold capitalize">members</span>
          {total && <span className="pr-2 text-lg font-bold">{total}</span>}
        </div>
      </div>
      <div className="h-[calc(100vh-180px)] grow overflow-hidden py-5">
        <ConfigProvider
          theme={{
            components: {
              Table: {
                colorBgContainer: 'rgba(255, 255, 255, 0)',
                colorText: '#FFFFFF',
                borderColor: 'rgba(255, 255, 255, 0)',
                cellPaddingInline: 0,
                rowHoverBg: 'rgba(0, 58, 140, 0.3)',
              },
            },
          }}
        >
          <Table
            loading={isLoading}
            bordered={false}
            dataSource={orderedUsers}
            pagination={false}
            columns={columns}
            showHeader={false}
            size="middle"
            rowKey={(record) => record.id ?? record.email}
            className={classNames(
              'h-full',
              '[&_.ant-table-tbody>tr]:transition-all [&_.ant-table-tbody>tr]:duration-1000',
              '[&_.ant-table-cell-row-hover]:bg-gray-200!',
              '[&_.ant-table-tbody>tr.ant-table-row-remove]:h-0 [&_.ant-table-tbody>tr.ant-table-row-remove]:opacity-40',
              '[&_.ant-table-body]:primary-scrollbar [&_.ant-table-body]:max-h-full [&_.ant-table-body]:overflow-auto [&_.ant-table-container]:h-full'
            )}
            rowClassName={() => {
              return 'hover:bg-primary-9/10 hover:text-white';
            }}
            scroll={{ y: 'calc(100vh - 180px)' }}
          />
        </ConfigProvider>
      </div>
      <div className="mt-auto flex flex-shrink-0 items-center justify-end">
        <CustomPopover
          when={['hover']}
          message="Only on Pro and Premium plans the Owner/Administrator can add members."
          placement="topLeft"
          visible={popoverOpen}
          onOpenChange={onOpenChange}
        >
          <Button
            rounded
            borderless
            key="add-member"
            data-testid="add-member-btn"
            type="button"
            variant="outline"
            size="lg"
            disabled={!allowedOperation}
            onMouseLeave={() => setIsPopoverOpen(false)}
            onClick={onOpen}
          >
            <div className="flex items-center justify-between gap-10 font-bold">
              <span>Add member</span>
              <PlusOutlined className="ml-auto text-sm text-current" />
            </div>
          </Button>
        </CustomPopover>
      </div>
      <AddMembersModal
        key="invite-member-to-project"
        isOpen={isOpen}
        onClose={onClose}
        context={{ virtualLabId, projectId }}
      />
    </div>
  );
}

export default TeamTable;
