'use client';

import { Button, ConfigProvider, Select, Table, Popconfirm } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import { ColumnType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import compact from 'lodash/compact';
import sortBy from 'lodash/sortBy';
import find from 'lodash/find';
import get from 'lodash/get';

import InviteModal from '@/components/VirtualLab/create-entity-flows/invite';
import { useAppNotification } from '@/components/notification';
import {
  cancelVirtualLabInvite,
  listVirtualLabMembers,
  removeUserFromVirtualLab,
  updateVirtualLabUserRole,
} from '@/api/virtual-lab-svc/queries/member';
import { MemberAvatarCasual } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { Button as UiButton } from '@/ui/molecules/button';
import { keyBuilder } from '@/ui/queries/workspace';
import { extractInitials } from '@/util/slugify';
import { classNames } from '@/util/utils';

import type { Member, Role } from '@/api/virtual-lab-svc/queries/types';

const roleOptions: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'member', label: 'Member' },
];

function RoleModifier({
  user,
  ownerId,
  virtualLabId,
}: {
  user: Member;
  ownerId?: string;
  virtualLabId: string;
}) {
  const { data } = useSession();
  const [role, updateRole] = useState(user.role);
  const [removeLoading] = useState(false);
  const { error: notifyError, success: notifySuccess } = useAppNotification();
  const queryClient = useQueryClient();

  const mutateRole = useMutation({
    mutationFn: (_role: Role) =>
      updateVirtualLabUserRole({
        virtualLabId,
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
    async onSuccess(_, role) {
      updateRole(role);
      notifySuccess({
        message: `User "${user.name}" role updated to ${get(find(roleOptions, { value: role }), 'label')} successfully`,
        placement: 'topRight',
        key: 'user-role-update',
      });
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.listVirtualLabTeam({ virtualLabId }),
      });
    },
  });

  const mutateInvite = useMutation({
    mutationKey: [`${virtualLabId}/delete-item/${user.email}`],
    mutationFn: () =>
      cancelVirtualLabInvite({
        virtualLabId,
        email: user.email,
        role: user.role,
      }),
    onMutate: () => {
      const row =
        document.querySelector(`tr[data-row-key="${user.email}"]`) ??
        document.querySelector(`tr[data-row-key="${user.id}"]`);

      console.log('–– – team.tsx:89 – RoleModifier – row:', row);

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
        queryKey: keyBuilder.listVirtualLabTeam({ virtualLabId }),
      });
    },
  });

  const mutateState = useMutation({
    mutationKey: [`${virtualLabId}/delete-item/${user.id}`],
    mutationFn: () =>
      removeUserFromVirtualLab({
        virtualLabId,
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
      return;
    },
    async onSuccess() {
      notifySuccess({
        message: `User "${user.name}" removed from virtual lab successfully`,
        placement: 'topRight',
        key: 'user-remove-from-vlab',
      });
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.listVirtualLabTeam({ virtualLabId }),
      });
    },
  });

  if (user.id === ownerId || user.id === data?.user.id) {
    return (
      <div className="flex w-full flex-col items-center justify-end pr-3 text-right">
        <div className="hover:text-primary-2! w-max! self-end font-bold text-white">
          {get(find(roleOptions, { value: user.role }), 'label')}
        </div>
      </div>
    );
  }
  return user.invite_accepted ? (
    <div className="ml-auto flex w-full flex-col items-end justify-end text-right text-base text-white">
      <div className="flex w-max flex-row items-center justify-center gap-2">
        <Select
          data-testid="role-select"
          className={classNames(
            'focus:border-primary-8 w-full bg-transparent shadow-none ring-0 focus:border-2',
            '[&_.ant-select-selector]:!rounded-none [&_.ant-select-selector]:!bg-transparent',
            '[&_.ant-select-selector]:!border-primary-7 [&_.ant-select-selector]:!border',
            '[&_.ant-select-selection-item]:!font-bold [&_.ant-select-selection-item]:!text-white',
            '!min-w-[140px] [&_.ant-select-arrow]:!text-white [&_.ant-select-selection-item]:!text-left'
          )}
          onChange={(role) => mutateRole.mutateAsync(role)}
          value={role}
          size="large"
          options={roleOptions}
          popupClassName="rounded-none!"
          disabled={mutateRole.isPending}
          loading={mutateRole.isPending}
        />
        <Popconfirm
          placement="bottomLeft"
          title="Remove member"
          description="Are you sure to remove this member from the virtual lab ?"
          onConfirm={() => mutateState.mutateAsync()}
          okText="Yes"
          cancelText="No"
          disabled={removeLoading}
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
            type="default"
            size="large"
            className="hover:text-primary-2! w-max! self-end text-white! opacity-100!"
            disabled={mutateState.isPending}
            loading={mutateState.isPending}
          >
            Remove member
          </Button>
        </Popconfirm>
      </div>
    </div>
  ) : (
    <div className="flex w-full flex-col items-center justify-end text-right">
      <Button
        data-testid="cancel-invite-btn"
        key="cancel-invite"
        type="text"
        htmlType="button"
        size="middle"
        className="hover:text-primary-2! w-max! self-end text-white! opacity-100!"
        disabled={mutateInvite.isPending}
        loading={mutateInvite.isPending}
        onClick={() => mutateInvite.mutateAsync()}
      >
        Cancel invitation
      </Button>
    </div>
  );
}

export function TeamTable({ virtualLabId }: { virtualLabId: string }) {
  const { data } = useSession();

  const [isOpen, setOpen] = useState(false);

  const onClose = () => setOpen(false);
  const onOpen = () => setOpen(true);

  const { data: team, isLoading } = useQuery({
    queryKey: keyBuilder.listVirtualLabTeam({ virtualLabId }),
    queryFn: () => listVirtualLabMembers({ virtualLabId }),
    staleTime: 0, // ensure fresh data when switching virtual labs
  });

  const ownerId = team?.data?.owner_id;
  const total = team?.data?.total;
  const users = team?.data?.users;

  const columns: Array<ColumnType<Member>> = useMemo(
    () => [
      {
        title: 'name',
        dataIndex: 'name',
        key: 'name',
        render: (_: string, record: Member, indx) => (
          <div className="flex w-max items-center justify-center">
            <MemberAvatarCasual
              withEmail
              shape={record.role === 'admin' ? 'square' : 'circle'}
              key={`vlab-avatar-${record.id ?? record.email}`}
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
                  'text-white!  wrap-text',
                  record.invite_accepted ? 'font-bold' : 'font-light'
                ),
                email: 'text-primary-4!',
              }}
            />
          </div>
        ),
      },
      {
        title: 'Last active',
        dataIndex: 'last_active',
        key: 'last_active',
        render: () => <span className="text-primary-3" />, // Empty element for now, to be included when 'active' info is available
      },
      {
        title: 'Action',
        key: 'role',
        dataIndex: 'role',
        align: 'right',
        width: '200px',
        render: (_: Role, record) => (
          <RoleModifier virtualLabId={virtualLabId} ownerId={ownerId} user={record} />
        ),
      },
    ],
    [ownerId, virtualLabId]
  );

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
    <div className="flex h-full flex-col py-2">
      <div className="mb-4 flex shrink-0 items-center justify-between py-2">
        <div className="flex gap-2">
          <span className="text-primary-3 text-lg font-bold">Members</span>
          {total && <span className="text-lg font-bold text-white">{total}</span>}
        </div>
        <UiButton
          rounded
          key="add-member"
          data-testid="add-member-btn"
          type="button"
          size="md"
          variant="outline"
          className="border-primary-4 bg-primary-9 hover:text-primary-4 px-4 text-white hover:border-white"
          onClick={onOpen}
        >
          <div className="flex gap-10">
            Add Member
            <PlusOutlined />
          </div>
        </UiButton>
      </div>
      <div className="h-[calc(100vh-180px)] grow overflow-hidden">
        <ConfigProvider
          theme={{
            components: {
              Table: {
                colorBgContainer: 'rgba(255, 255, 255, 0)',
                colorText: '#FFFFFF',
                borderColor: 'rgba(255, 255, 255, 0)',
                cellPaddingInline: 0,
                rowHoverBg: 'rgb(0,58,140,0.7)',
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
              '[&_.ant-table-tbody>tr.ant-table-row-remove]:h-0 [&_.ant-table-tbody>tr.ant-table-row-remove]:opacity-40',
              '[&_.ant-table-body]:primary-scrollbar [&_.ant-table-body]:max-h-full [&_.ant-table-body]:overflow-auto [&_.ant-table-container]:h-full'
            )}
            scroll={{ y: 'calc(100vh - 180px)' }}
          />
        </ConfigProvider>
      </div>

      <InviteModal
        type="vlab"
        key="invite-member-to-vlab"
        title="Invite new members to Virtual Lab"
        isOpen={isOpen}
        onClose={onClose}
        context={{ virtualLabId }}
      />
    </div>
  );
}

export default TeamTable;
