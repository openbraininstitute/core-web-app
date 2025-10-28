'use client';

import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { filter, uniqBy, compact, sortBy, find, map, get } from 'es-toolkit/compat';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ColumnType } from 'antd/es/table';
import {
  ConfigProvider,
  Popconfirm,
  Select,
  Table,
  Empty,
  List,
  Input,
  Button as AntdButton,
} from 'antd';
import {
  PlusOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  LoadingOutlined,
  DeleteFilled,
} from '@ant-design/icons';
import { match } from 'ts-pattern';
import z from 'zod';

import { MemberAvatarCasual } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { CustomPopover } from '@/features/entities/neuron-simulation/experiment/elements/popover';
import { inviteToProject } from '@/api/virtual-lab-svc/queries/invite';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useAppNotification } from '@/components/notification';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { useUserRole } from '@/hooks/use-user-role';
import { extractInitials } from '@/util/slugify';
import { Button } from '@/ui/molecules/button';
import { Badge } from '@/ui/molecules/badge';
import {
  cancelProjectInvite,
  listProjectMembers,
  removeUserFromProject,
  updateProjectUserRole,
} from '@/api/virtual-lab-svc/queries/member';
import { cn } from '@/utils/css-class';

import type { Member, MembersResponse, Role } from '@/api/virtual-lab-svc/queries/types';

const roleOptions: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'member', label: 'Member' },
];

type Step = 'listing' | 'add-member';

type InvitePayload = {
  email: string;
  role: Role;
};

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
  const { isAdmin, isProjectAdmin } = useUserRole({ virtualLabId, projectId });
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
        message: `Invite for ${user.email} cancelled successfully`,
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

  if (user.id === ownerId || user.id === data?.user.id) {
    return (
      <div className="flex w-full flex-col items-center justify-end pr-3 text-right">
        <div className="hover:text-primary-2! text-primary-9 w-max! self-end font-bold">
          {get(find(roleOptions, { value: user.role }), 'label')}
        </div>
      </div>
    );
  }
  if (isAdmin || isProjectAdmin) {
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
          className="hover:text-primary-2! w-max! self-end text-white! opacity-100!"
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

const emailSchema = z.string().min(3, 'Email is required').email('Email is not valid');

function EmailInput({
  index,
  value,
  onChange,
  disabled,
  inviteList,
}: {
  index: number;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  inviteList: Array<InvitePayload>;
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value.trim() !== '') {
      const result = emailSchema.safeParse(value);
      if (!result.success) {
        const issue = result.error.issues.at(0);
        setError(issue?.message ?? 'Invalid input');
      } else {
        setError(null);
      }
    }
  }, [value]);

  useEffect(() => {
    const duplicates = map(
      filter(
        inviteList,
        (o) => o.email.toLowerCase() === value.toLowerCase() && value.trim() !== ''
      ),
      (item) => inviteList.indexOf(item)
    );

    if (duplicates.filter((p) => p !== index).length > 0) {
      setError('This email address is already added. Please remove duplicates.');
    } else {
      setError(null);
    }
  }, [inviteList, value, index]);

  return (
    <div>
      <Input
        id="email"
        size="large"
        placeholder="Enter email address..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        status={error ? 'error' : undefined}
        className={cn(
          'focus:white hover:bg-background! border-primary-9 hover:text-primary-8! bg-transparent',
          'focus-within:bg-background! bg-background! text-primary-9! focus-within:text-primary-9!',
          'placeholder:text-primary-8 placeholder:text-sm!'
        )}
        disabled={disabled}
      />
      {error && <small style={{ color: 'red', marginTop: 4 }}>{error}</small>}
    </div>
  );
}

function InviteMemberStep({ onBack }: { onBack: () => void }) {
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const { virtualLabId, projectId } = useWorkspace();
  const { error: notifyError, success: notifySuccess } = useAppNotification();
  const [inviteList, setInviteList] = useState<Array<InvitePayload>>([
    { email: '', role: 'member' },
  ]);

  const addEmailField = () => {
    setInviteList((prev) => [...prev, { email: '', role: 'member' }]);
    requestAnimationFrame(() => {
      listScrollRef.current?.scrollTo({
        top: listScrollRef.current.scrollHeight,
        behavior: 'instant',
      });
    });
  };

  const removeEmailField = (index: number) => {
    setInviteList((prev) => prev.filter((_, i) => i !== index));
  };

  const updateInvite = (index: number, field: keyof InvitePayload, value: string) => {
    setInviteList((prev) =>
      prev.map((invite, i) => (i === index ? { ...invite, [field]: value } : invite))
    );
  };

  const inviteUsers = async () => {
    const validInvites = inviteList.filter(
      (invite) => invite.email && emailSchema.safeParse(invite.email).success
    );
    const invites = await Promise.allSettled(
      validInvites.map(({ email, role }) =>
        inviteToProject({ virtualLabId, projectId, email, role })
      )
    );
    return invites;
  };

  const onRoleChange = (record: InvitePayload, role: Role) => {
    setInviteList((prev) => {
      const existingMember = find(prev, (o) => o.email === record.email);
      if (existingMember) {
        return prev.map((member) =>
          member.email === existingMember.email ? { ...member, role } : member
        );
      }
      return [...prev, { ...record, role }];
    });
  };

  const mutate = useMutation({
    mutationFn: inviteUsers,
    onSuccess: (data) => {
      const validInvites = inviteList.filter(
        (invite) => invite.email && emailSchema.safeParse(invite.email).success
      );
      const failedInvites = data
        .map((result, idx) => {
          if (result.status === 'rejected') return validInvites[idx];
          return null;
        })
        .filter(Boolean);
      if (failedInvites.length && validInvites.length !== failedInvites.length) {
        notifyError({
          message: `Some invitations were sent successfully, but a few may not have been delivered:`,
          description: (
            <ul className="text-primary-8">
              {failedInvites.map((invite) => (
                <li className="list-decimal" key={invite?.email}>
                  {invite?.email}
                </li>
              ))}
            </ul>
          ),
          placement: 'topRight',
          key: 'send-invites-partial',
        });
      } else if (failedInvites.length === validInvites.length) {
        notifyError({
          message: 'Failed to send invitations. Please try again.',
          placement: 'topRight',
          key: 'send-invites-error',
        });
      } else {
        notifySuccess({
          message: `${validInvites.length} invitation(s) sent successfully!`,
          placement: 'topRight',
          key: 'send-invites-success',
        });
        // Reset form to single empty invite field after successful submission
        setInviteList([{ email: '', role: 'member' }]);
        onBack();
      }
    },
    onError: () => {
      notifyError({
        message: 'Failed to send invitations. Please try again.',
        placement: 'topRight',
        key: 'send-invites-error',
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.listVirtualLabTeam({ virtualLabId }),
      });
    },
  });

  const disableAddMember = inviteList.some((p) => !emailSchema.safeParse(p.email).success);
  return (
    <div className="flex h-full flex-col pb-10">
      <div className="flex h-8 shrink-0 items-center px-3">
        <div className="flex w-full items-center gap-4">
          <Button
            rounded
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-primary-9 hover:text-primary-8 hover:bg-neutral-2/50 h-auto !px-4 py-2!"
          >
            <ArrowLeftOutlined className="text-lg" />
            <span className="text-primary-9 ml-4 text-lg font-bold">Members</span>
          </Button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-8 py-4 pb-8">
        <h2 className="text-primary-9 text-xl font-semibold">
          Invite new members to virtual lab
          <div className="flex items-center gap-2">
            <small className="text-primary-8 text-sm font-light">
              <span className="font-bold">
                {
                  uniqBy(
                    inviteList.filter(
                      (invite) => invite.email && emailSchema.safeParse(invite.email).success
                    ),
                    'email'
                  ).length
                }
              </span>
              <span className="ml-1">invitation(s) ready</span>
            </small>
          </div>
        </h2>
      </div>

      <div className="h-auto overflow-hidden px-3">
        <ConfigProvider
          renderEmpty={() => (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No invitations to display"
              className="text-white"
            />
          )}
        >
          <div
            ref={listScrollRef}
            className="secondary-scrollbar mx-auto h-full w-full max-w-3xl overflow-y-auto px-4"
          >
            <List
              id="virtual-lab-list-users"
              data-testid="virtual-lab-list-users"
              dataSource={inviteList}
              className="text-white"
              renderItem={(invite, index) => (
                <List.Item
                  key={index}
                  className="!border-primary-7 hover:bg-neutral-2/20 !px-4 !py-3"
                >
                  <div className="flex w-full items-start justify-start gap-3">
                    <div className="flex-1">
                      <EmailInput
                        index={index}
                        value={invite.email}
                        onChange={(v) => updateInvite(index, 'email', v)}
                        disabled={mutate.isPending}
                        inviteList={inviteList}
                      />
                    </div>
                    <Select
                      value={invite?.role || 'member'}
                      onChange={(role) => onRoleChange(invite, role)}
                      options={roleOptions}
                      disabled={!emailSchema.safeParse(invite.email).success}
                      size="large"
                      className={cn(
                        'min-w-[120px]',
                        '[&_.ant-select-selector]:!border-primary-7 [&_.ant-select-selector]:!bg-transparent',
                        '[&_.ant-select-selection-item]:!text-primary-8 [&_.ant-select-arrow]:!text-primary-8',
                        '[&.ant-select-disabled_.ant-select-selector]:border-neutral-2!',
                        '[&.ant-select-disabled_.ant-select-selection-item]:text-neutral-3!',
                        '[&.ant-select-disabled_.ant-select-arrow]:text-neutral-3!'
                      )}
                      // disabled={mutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="lg"
                      rounded
                      onClick={() => removeEmailField(index)}
                      className={cn(
                        'hover:bg-neutral-1 border-neutral-2 hover:text-destructive disabled:text-destructive/30',
                        'text-destructive hover:not-disabled:shadow-bnb h-12! w-12 border !p-2'
                      )}
                      disabled={mutate.isPending || inviteList.length === 1}
                    >
                      <DeleteFilled className="text-lg" />
                    </Button>
                  </div>
                </List.Item>
              )}
            />
          </div>
        </ConfigProvider>
      </div>
      <div className="mx-auto flex w-full max-w-3xl items-start justify-start p-4">
        <Button
          rounded
          type="button"
          variant="outline"
          size="md"
          onClick={addEmailField}
          className={cn(
            'border-primary-4 group bg-primary-9 hover:text-primary-4',
            'px-4 text-white select-none hover:border-white',
            'disabled:text-neutral-4 disabled:border-neutral-2 disabled:bg-transparent'
          )}
          disabled={mutate.isPending || disableAddMember}
        >
          <PlusOutlined className="mr-2" />
          Add member
        </Button>
      </div>

      <div className="mx-auto mt-auto flex w-full max-w-3xl flex-shrink-0 items-center justify-end px-8 pt-4">
        <div className="flex gap-3 self-end">
          <Button
            rounded
            type="button"
            variant="outline"
            size="lg"
            onClick={onBack}
            disabled={mutate.isPending}
          >
            Cancel
          </Button>
          <Button
            rounded
            type="button"
            variant="outline"
            size="lg"
            onClick={() => mutate.mutateAsync()}
            disabled={mutate.isPending || !inviteList.some((invite) => invite.email)}
          >
            Send{' '}
            {
              inviteList.filter(
                (invite) => invite.email && emailSchema.safeParse(invite.email).success
              ).length
            }{' '}
            invitation(s)
            {mutate.isPending && <LoadingOutlined spin className="ml-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ListingStep({
  onAddMemberClick,
  list,
  allowedOperation,
}: {
  onAddMemberClick: () => void;
  list: MembersResponse;
  allowedOperation: boolean;
}) {
  const { data } = useSession();
  const [popoverOpen, setIsPopoverOpen] = useState(false);

  const onOpenChange = (visible: boolean) => {
    if (!allowedOperation || !visible) setIsPopoverOpen(true);
    else setIsPopoverOpen(false);
  };

  const ownerId = list?.data?.owner_id;
  const total = list?.data?.total;
  const users = list?.data?.users;

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
            isOwner={ownerId === record.id}
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
              text: cn(
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
    <div className="animate-fade-in flex h-full w-full flex-col pb-8">
      <div className="flex w-full items-center justify-between px-3">
        <div className="flex h-8 justify-center gap-2">
          <span className="text-primary-9 text-lg font-bold capitalize">members</span>

          {total && (
            <Badge variant="outline" className="text-neutral-4 py-1 text-lg font-bold">
              {total}
            </Badge>
          )}
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
              variant="success"
              size="md"
              // disabled={!allowedOperation}
              className={cn('px-6', { 'cursor-not-allowed opacity-50': !allowedOperation })}
              onClick={onAddMemberClick}
              onMouseLeave={() => setIsPopoverOpen(false)}
            >
              <div className="flex items-center justify-between gap-12 font-bold">
                <span>Add member</span>
                <PlusOutlined className="ml-auto text-sm text-current" />
              </div>
            </Button>
          </CustomPopover>
        </div>
      </div>
      <div className="h-full grow overflow-hidden py-5">
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
            loading={false}
            bordered={false}
            dataSource={orderedUsers}
            pagination={false}
            columns={columns}
            showHeader={false}
            size="middle"
            rowKey={(record) => record.id ?? record.email}
            className={cn(
              'h-full w-full',
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
    </div>
  );
}

export function TeamManager() {
  const { virtualLabId, projectId } = useWorkspace();
  const [currentStep, setCurrentStep] = useState<Step>('listing');

  const { data: currentProjectTeam } = useSuspenseQuery({
    queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
    queryFn: () => listProjectMembers({ virtualLabId, projectId }),
  });

  const {
    isAllowedBySubscription,
    isAdmin,
    isProjectAdmin,
    loading: loadingPermissions,
  } = useUserPermissions({
    virtualLabId,
    projectId,
  });

  const allowedOperation =
    isAllowedBySubscription && (isAdmin || isProjectAdmin) && !loadingPermissions;

  const handleAddMemberClick = () => {
    if (allowedOperation) {
      setCurrentStep('add-member');
    }
  };

  const handleBackToListing = () => {
    setCurrentStep('listing');
  };

  return match(currentStep)
    .with('listing', () => (
      <ListingStep
        onAddMemberClick={handleAddMemberClick}
        list={currentProjectTeam}
        allowedOperation={allowedOperation}
      />
    ))
    .with('add-member', () => (
      <div className="animate-fade-in h-full">
        <InviteMemberStep onBack={handleBackToListing} />
      </div>
    ))
    .otherwise(() => null);
}

export default TeamManager;
