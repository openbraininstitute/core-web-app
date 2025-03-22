'use client';

import { useState } from 'react';
import { Button, ConfigProvider, Popconfirm, Select, Table } from 'antd';
import { ColumnType } from 'antd/es/table';
import { useParams } from 'next/navigation';
import { useSetAtom } from 'jotai';
import get from 'lodash/get';
import find from 'lodash/find';
import orderBy from 'lodash/orderBy';

import useNotification from '@/hooks/notifications';
import useActiveSubscription from '@/hooks/useActiveSubscription';
import InviteModal from '@/components/VirtualLab/create-entity-flows/invite';
import { MemberAvatarCasual } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import {
  cancelProjectInvite,
  removeUserFromProject,
  updateProjectUserRole,
} from '@/api/virtual-lab-svc/queries/member';
import { classNames } from '@/util/utils';
import { extractInitials } from '@/util/slugify';
import { tryCatch } from '@/api/utils';
import { projectStatsAtomFamily } from '@/state/virtual-lab/projects';
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

type RoleModifierProps = {
  user: Member;
  ownerId: string;
  virtualLabId: string;
  projectId: string;
  onRemove: (email: string) => void;
};

function RoleModifier({ user, ownerId, virtualLabId, projectId, onRemove }: RoleModifierProps) {
  const [role, updateRole] = useState(user.role);
  const [loading, setLoading] = useState(false);
  const [removeLoading, seRemoveLoading] = useState(false);
  const refreshProjectStats = useSetAtom(projectStatsAtomFamily({ virtualLabId, projectId }));
  const { error: notifyError, success: notifySuccess } = useNotification();

  const onChange = async (_role: Role) => {
    setLoading(true);
    const { error, data: result } = await tryCatch(
      updateProjectUserRole({
        virtualLabId,
        projectId,
        userId: user.id,
        newRole: _role,
      }),
      () => {
        setLoading(false);
      }
    );
    if (error) {
      notifyError(
        'Failed to update user role. Please try again or contact support if the issue persists.',
        undefined,
        'topRight',
        true,
        'user-role-update'
      );
      return;
    }
    if (result.data) {
      updateRole(_role);
      notifySuccess(
        `User "${user.name}" role updated to ${get(find(roleOptions, { value: _role }), 'label')} successfully`,
        undefined,
        'topRight',
        true,
        'user-role-update'
      );
    }
  };

  const onCancelInvite = async () => {
    setLoading(true);
    const { error, data: result } = await tryCatch(
      cancelProjectInvite({
        virtualLabId,
        projectId,
        email: user.email,
        role: user.role,
      }),
      () => {
        setLoading(false);
      }
    );
    if (error) {
      notifyError(
        'Failed to cancel invite. Please try again or contact support if the issue persists.',
        undefined,
        'topRight',
        true,
        'user-cancel-invite'
      );
      return;
    }
    if (result.message) {
      notifySuccess(
        `Invite for ${user.email} cancelled successfully`,
        undefined,
        'topRight',
        true,
        'user-cancel-invite'
      );
      refreshProjectStats();
      onRemove(user.email);
    }
  };

  const onRemoveMember = async () => {
    seRemoveLoading(true);
    const { error, data: result } = await tryCatch(
      removeUserFromProject({
        virtualLabId,
        projectId,
        userId: user.id,
      }),
      () => {
        seRemoveLoading(false);
      }
    );
    if (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'cause' in error &&
        typeof error.cause === 'object' &&
        error.cause !== null &&
        'error_code' in error.cause &&
        error.cause.error_code === 'FORBIDDEN_OPERATION'
      ) {
        notifyError(
          'You are not authorized to remove this user from the virtual lab.',
          undefined,
          'topRight',
          true,
          'user-remove-from-vlab'
        );
        return;
      }
      notifyError(
        'Failed to remove user from virtual lab. Please try again or contact support if the issue persists.',
        undefined,
        'topRight',
        true,
        'user-remove-from-vlab'
      );
      return;
    }
    if (result.message) {
      notifySuccess(
        `User "${user.name}" removed from virtual lab successfully`,
        undefined,
        'topRight',
        true,
        'user-remove-from-vlab'
      );
      refreshProjectStats();
      onRemove(user.id);
    }
  };
  if (user.id === ownerId) {
    return (
      <div className="flex w-full flex-col items-center justify-end pr-3 text-right">
        <div className="!w-max self-end font-bold text-white hover:!text-primary-2">
          {get(find(roleOptions, { value: user.role }), 'label')}
        </div>
      </div>
    );
  }
  return user.invite_accepted ? (
    <div className="ml-auto text-right text-base text-white">
      <div className="ml-auto flex w-full flex-col items-end justify-end text-right text-base text-white">
        <div className="flex w-max flex-col items-center justify-center">
          <Select
            data-testid="role-select"
            className={classNames(
              'w-full bg-transparent shadow-none ring-0 focus:border-2 focus:border-primary-8',
              '[&_.ant-select-selector]:!rounded-none [&_.ant-select-selector]:!bg-transparent',
              '[&_.ant-select-selector]:!border [&_.ant-select-selector]:!border-primary-7',
              '[&_.ant-select-selection-item]:!font-bold [&_.ant-select-selection-item]:!text-white',
              '[&_.ant-select-arrow]:!text-white [&_.ant-select-selection-item]:!text-left'
            )}
            onChange={onChange}
            value={role}
            size="large"
            options={roleOptions}
            popupClassName="!rounded-none"
            disabled={loading}
            loading={loading}
          />
          <Popconfirm
            placement="bottomLeft"
            title="Remove member"
            description="Are you sure to remove this member from the project ?"
            onConfirm={onRemoveMember}
            okText="Yes"
            cancelText="No"
            disabled={removeLoading}
            overlayClassName={classNames(
              '[&_.ant-popover-inner]:!bg-primary-9 [&_.ant-popover-inner]:!text-white ',
              '[&_.ant-popover-inner]:!rounded-none [&_.ant-popconfirm-description]:!text-white',
              '[&_.ant-popconfirm-title]:!text-white',
              '[&_.ant-popconfirm-buttons>button]:!rounded-none [&_.ant-popconfirm-buttons>button]:!px-5',
              '[&_.ant-popover-arrow]:after:!bg-primary-9'
            )}
          >
            <Button
              type="default"
              size="large"
              className="w-full self-end rounded-none border border-t-0 border-primary-7 bg-transparent px-[11px] text-white hover:!border-t"
              disabled={removeLoading}
              loading={removeLoading}
            >
              Remove member
            </Button>
          </Popconfirm>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex w-full flex-col items-center justify-end text-right ">
      <Button
        data-testid="cancel-invite-btn"
        key="cancel-invite"
        type="text"
        htmlType="button"
        size="middle"
        className="!w-max self-end text-white hover:!text-primary-2"
        disabled={loading}
        loading={loading}
        onClick={onCancelInvite}
      >
        Cancel invitation
      </Button>
    </div>
  );
}

export default function VirtualLabTeamTable({ users: initialUsers, ownerId, total }: Props) {
  const { virtualLabId, projectId } = useParams<{ virtualLabId: string; projectId: string }>();
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

  const columns: Array<ColumnType<Member>> = [
    {
      title: 'name',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: Member, indx) => (
        <div className="flex w-max items-center justify-center">
          <MemberAvatarCasual
            shape={record.role === 'admin' ? 'square' : 'circle'}
            key={`project-avatar-${record.id ?? record.email}`}
            index={indx}
            size="small"
            layout="horizontal"
            id={record.id ?? record.email}
            email={record.email}
            role={record.role}
            pending={!record.invite_accepted}
            name={record.id ? `${record.first_name} ${record.last_name}` : record.email}
            initials={extractInitials(
              record.id ? `${record.first_name} ${record.last_name}` : record.email
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
          projectId={projectId}
          ownerId={ownerId}
          user={record}
          onRemove={onRemoveItem}
        />
      ),
    },
  ];
  const { disableFeature } = useActiveSubscription();
  return (
    <div className="flex h-full flex-col pb-8">
      <div className="flex h-8 flex-shrink-0 items-center px-3">
        <div className="flex gap-2">
          <span className="text-lg text-primary-3">Total members</span>
          <span className="text-lg font-bold">{total}</span>
        </div>
      </div>
      <div className="h-[calc(100vh-180px)] flex-grow overflow-hidden py-5">
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
            bordered={false}
            dataSource={orderBy(users, ['invite_accepted', 'role'], ['desc', 'asc'])}
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
            'h-14 rounded-none border border-white bg-white px-14 text-primary-9',
            'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
            'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
            'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
          )}
          type="default"
          size="large"
          htmlType="button"
          disabled={disableFeature}
          onClick={onOpen}
        >
          Add member
        </Button>
      </div>
      <InviteModal
        type="project"
        key="invite-member-to-project"
        title="Invite new members to project"
        isOpen={isOpen}
        onClose={onClose}
        context={{ virtualLabId, projectId }}
      />
    </div>
  );
}
