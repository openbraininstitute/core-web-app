'use client';

import { useMemo, useState } from 'react';
import { Button, ConfigProvider, Select, Table, Popconfirm } from 'antd';
import { ColumnType } from 'antd/es/table';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSetAtom } from 'jotai';
import get from 'es-toolkit/compat/get';
import find from 'es-toolkit/compat/find';
import sortBy from 'es-toolkit/compat/sortBy';
import compact from 'es-toolkit/compat/compact';

import InviteModal from '@/components/VirtualLab/create-entity-flows/invite';
import { useAppNotification } from '@/components/notification';
import {
  cancelVirtualLabInvite,
  removeUserFromVirtualLab,
  updateVirtualLabUserRole,
} from '@/api/virtual-lab-svc/queries/member';
import { MemberAvatarCasual } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { virtualLabStatsAtomFamily } from '@/state/virtual-lab/lab';
import { extractInitials } from '@/util/slugify';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';

import type { Member, Role } from '@/api/virtual-lab-svc/queries/types';

type Props = {
  total: number;
  ownerId: string;
  users: Array<Member>;
};

const roleOptions: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'member', label: 'Member' },
];

function RoleModifier({
  user,
  ownerId,
  virtualLabId,
  onRemove,
}: {
  user: Member;
  ownerId: string;
  virtualLabId: string;
  onRemove: (email: string) => void;
}) {
  const { data } = useSession();
  const [role, updateRole] = useState(user.role);
  const [loading, setLoading] = useState(false);
  const [removeLoading, seRemoveLoading] = useState(false);
  const refreshVirtualLabStats = useSetAtom(virtualLabStatsAtomFamily(virtualLabId));
  const { error: notifyError, success: notifySuccess } = useAppNotification();

  const onChange = async (_role: Role) => {
    setLoading(true);
    const { error, data: result } = await tryCatch(
      updateVirtualLabUserRole({
        virtualLabId,
        userId: user.id,
        newRole: _role,
      }),
      () => {
        setLoading(false);
      }
    );
    if (error) {
      notifyError({
        message:
          'Failed to update user role. Please try again or contact support if the issue persists.',
        placement: 'topRight',
        key: 'user-role-update',
      });
      return;
    }
    if (result.data?.user) {
      updateRole(_role);
      notifySuccess({
        message: `User "${user.name}" role updated to ${get(find(roleOptions, { value: _role }), 'label')} successfully`,
        placement: 'topRight',
        key: 'user-role-update',
      });
    }
  };

  const onCancelInvite = async () => {
    setLoading(true);
    const { error, data: result } = await tryCatch(
      cancelVirtualLabInvite({
        virtualLabId,
        email: user.email,
        role: user.role,
      }),
      () => {
        setLoading(false);
      }
    );
    if (error) {
      notifyError({
        message:
          'Failed to cancel invite. Please try again or contact support if the issue persists.',
        placement: 'topRight',
        key: 'user-cancel-invite',
      });
      return;
    }
    if (result.message) {
      notifySuccess({
        message: `Invite for ${user.email} cancelled successfully`,
        placement: 'topRight',
        key: 'user-cancel-invite',
      });
      refreshVirtualLabStats();
      onRemove(user.email);
    }
  };

  const onRemoveMember = async () => {
    seRemoveLoading(true);
    const { error, data: result } = await tryCatch(
      removeUserFromVirtualLab({
        virtualLabId,
        userId: user.id,
      }),
      () => {
        seRemoveLoading(false);
      }
    );
    if (error) {
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
    }
    if (result.message) {
      notifySuccess({
        message: `User "${user.name}" removed from virtual lab successfully`,
        placement: 'topRight',
        key: 'user-remove-from-vlab',
      });
      refreshVirtualLabStats();
      onRemove(user.id);
    }
  };

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
          onChange={onChange}
          value={role}
          size="large"
          options={roleOptions}
          popupClassName="rounded-none!"
          disabled={loading}
          loading={loading}
        />
        <Popconfirm
          placement="bottomLeft"
          title="Remove member"
          description="Are you sure to remove this member from the virtual lab ?"
          onConfirm={onRemoveMember}
          okText="Yes"
          cancelText="No"
          disabled={removeLoading}
          overlayClassName={classNames(
            '[&_.ant-popover-inner]:bg-primary-9! [&_.ant-popover-inner]:text-white! ',
            '[&_.ant-popover-inner]:rounded-none! [&_.ant-popconfirm-description]:text-white!',
            '[&_.ant-popconfirm-title]:text-white!',
            '[&_.ant-popconfirm-buttons>button]:rounded-none! [&_.ant-popconfirm-buttons>button]:px-5!',
            '[&_.ant-popover-arrow]:after:bg-primary-9!'
          )}
        >
          <Button
            type="default"
            size="large"
            className="border-primary-7 w-full self-end rounded-none border bg-transparent px-[11px] text-white hover:!border-t"
            disabled={removeLoading}
            loading={removeLoading}
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
        className="hover:text-primary-2! w-max! self-end text-white"
        disabled={loading}
        loading={loading}
        onClick={onCancelInvite}
      >
        Cancel invitation
      </Button>
    </div>
  );
}

export default function TeamTable({ users: initialUsers, total, ownerId }: Props) {
  const { data } = useSession();
  const { virtualLabId } = useParams<{ virtualLabId: string }>();
  const [isOpen, setOpen] = useState(false);
  const [users, setUsers] = useState(initialUsers);

  const onClose = () => setOpen(false);
  const onOpen = () => setOpen(true);

  const onRemoveItem = (value: string) => {
    const row = document.querySelector(`tr[data-row-key="${value}"]`);
    if (row) {
      row.classList.add('ant-table-row-remove');
      setTimeout(() => {
        setUsers((prevUsers) =>
          prevUsers.filter((user) => user.email !== value && user.id !== value)
        );
      }, 1000);
    } else {
      setUsers((prevUsers) =>
        prevUsers.filter((user) => user.email !== value && user.id !== value)
      );
    }
  };

  const columns: Array<ColumnType<Member>> = useMemo(
    () => [
      {
        title: 'name',
        dataIndex: 'name',
        key: 'name',
        render: (_: string, record: Member, indx) => (
          <div className="flex w-max items-center justify-center">
            <MemberAvatarCasual
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
                  'text-white  wrap-text',
                  record.invite_accepted ? 'font-bold' : 'font-light'
                ),
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
          <RoleModifier
            virtualLabId={virtualLabId}
            ownerId={ownerId}
            user={record}
            onRemove={onRemoveItem}
          />
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
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center px-3">
        <div className="flex gap-2">
          <span className="text-primary-3 text-lg">Total members</span>
          {total && <span className="text-lg font-bold">{total}</span>}
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
                rowHoverBg: 'rgb(0,58,140,0.7)',
              },
            },
          }}
        >
          <Table
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
              '[&_.ant-table-tbody>tr.ant-table-row-remove]:h-0 [&_.ant-table-tbody>tr.ant-table-row-remove]:opacity-0',
              '[&_.ant-table-tbody>tr.ant-table-row-remove]:overflow-hidden [&_.ant-table-tbody>tr.ant-table-row-remove]:p-0',
              '[&_.ant-table-body]:primary-scrollbar [&_.ant-table-body]:max-h-full [&_.ant-table-body]:overflow-auto [&_.ant-table-container]:h-full'
            )}
            scroll={{ y: 'calc(100vh - 180px)' }}
          />
        </ConfigProvider>
      </div>
      <div className="mt-auto flex flex-shrink-0 items-center justify-end">
        <Button
          key="add-member"
          data-testid="add-member-btn"
          className={classNames(
            'text-primary-9 h-14 rounded-none border border-white bg-white px-14',
            'hover:!border-primary-8 hover:bg-primary-8 hover:!border hover:font-bold hover:!text-white hover:shadow-sm',
            'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
            'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
          )}
          type="default"
          size="large"
          htmlType="button"
          onClick={onOpen}
        >
          Add member
        </Button>
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
