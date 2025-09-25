'use client';

import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import {
  ConfigProvider,
  Popconfirm,
  Select,
  Table,
  Checkbox,
  Empty,
  List,
  Input,
  Button as AntdButton,
  type InputRef,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useMemo, useState, useDeferredValue, useRef } from 'react';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { useSession } from 'next-auth/react';
import { ColumnType } from 'antd/es/table';
import { match } from 'ts-pattern';
import isEmpty from 'lodash/isEmpty';
import compact from 'lodash/compact';
import sortBy from 'lodash/sortBy';
import reject from 'lodash/reject';
import find from 'lodash/find';
import map from 'lodash/map';
import get from 'lodash/get';

import { MemberAvatarCasual } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { CustomPopover } from '@/features/entities/neuron-simulation/experiment/elements/popover';
import { attachUsersToProject } from '@/api/virtual-lab-svc/queries/project';
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
  listVirtualLabMembers,
} from '@/api/virtual-lab-svc/queries/member';
import { cn } from '@/utils/css-class';

import type { Member, MembersResponse, Role } from '@/api/virtual-lab-svc/queries/types';

const roleOptions: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'member', label: 'Member' },
];

type Step = 'listing' | 'add-member';

function useFilteredMembers(members: Array<Member>, query: string): Array<Member> {
  const deferredQuery = useDeferredValue(query.toLowerCase());
  const filtered = useMemo(() => {
    if (!deferredQuery) return members;

    return members.filter(
      (member) =>
        member.name?.toLowerCase().includes(deferredQuery) ||
        member.username?.toLowerCase().includes(deferredQuery) ||
        member.email?.toLowerCase().includes(deferredQuery)
    );
  }, [members, deferredQuery]);

  return filtered;
}

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
    (isAdmin || isProjectAdmin) && (
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
    )
  );
}

type AddMemberStepProps = {
  onBack: () => void;
  list: MembersResponse;
  allowedOperation: boolean;
};

function AddMemberStep({ onBack, list, allowedOperation }: AddMemberStepProps) {
  const queryClient = useQueryClient();
  const { data } = useSession();
  const { virtualLabId, projectId } = useWorkspace();
  const { error: notifyError, success: notifySuccess } = useAppNotification();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchValue] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Array<Member>>([]);
  const searchInputRef = useRef<InputRef>(null);

  const { data: virtualLabMembers } = useQuery({
    queryKey: keyBuilder.listVirtualLabTeam({ virtualLabId }),
    queryFn: () => listVirtualLabMembers({ virtualLabId }),
  });

  const availableUsers = reject(
    virtualLabMembers?.data?.users,
    (user) =>
      user.id === virtualLabMembers?.data?.owner_id ||
      user.id === data?.user.id ||
      user.invite_accepted === false ||
      map(list?.data?.users, 'id').includes(user.id)
  );

  const filteredUsers = useFilteredMembers(availableUsers || [], searchQuery);

  const onSelectUser = (record: Member) => (e: CheckboxChangeEvent) => {
    const { checked } = e.target;
    if (checked) {
      setSelectedMembers((prev) => [...prev, { ...record, role: 'member' }]);
    } else {
      const filteredList = reject(selectedMembers, { id: record.id });
      setSelectedMembers(filteredList);
    }
  };

  const onRoleChange = (record: Member, role: Role) => {
    setSelectedMembers((prev) => {
      const existingMember = find(prev, { id: record.id });
      if (existingMember) {
        return prev.map((member) =>
          member.id === existingMember.id ? { ...member, role } : member
        );
      }
      return [...prev, { ...record, role }];
    });
  };

  const handleSearchClick = () => {
    setIsSearchVisible((prev) => {
      const newValue = !prev;
      if (newValue) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      } else {
        setSearchValue('');
      }
      return newValue;
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const mutation = useMutation({
    mutationFn: () =>
      attachUsersToProject({
        virtualLabId,
        projectId,
        users: selectedMembers.map((member) => ({
          id: member.id,
          email: member.email,
          role: member.role,
        })),
      }),
    onSuccess: () => {
      notifySuccess({
        message: `${selectedMembers.length} member(s) added successfully!`,
        placement: 'topRight',
        key: 'add-members-success',
      });
      setSelectedMembers([]);
      onBack();
    },
    onError: () => {
      notifyError({
        message: 'Failed to add members. Please try again.',
        placement: 'topRight',
        key: 'add-members-error',
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
      });
    },
  });

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
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-3 py-4 pb-8">
        <h2 className="text-primary-8 text-lg font-semibold">
          Add new members to project
          <div className="flex items-center gap-2">
            <small className="text-primary-8 text-sm font-light">
              {selectedMembers.length} member(s) selected
            </small>
          </div>
        </h2>
        <div className="flex items-center">
          <div
            className={cn(
              'overflow-hidden transition-all duration-300 ease-in-out',
              isSearchVisible ? 'w-72 opacity-100' : 'w-0 opacity-0'
            )}
          >
            <Input
              id="search-members"
              ref={searchInputRef}
              placeholder="Search members..."
              value={searchQuery}
              onChange={handleSearchChange}
              className={cn(
                'border-primary-7 focus:border-primary-8 transition-all duration-200',
                'text-primary-9 placeholder:text-primary-7 w-full min-w-[240px] bg-transparent',
                'h-12! rounded-l-full rounded-r-none border-r-0 pl-8',
                '[&_input]:text-primary-9 [&_input]:bg-transparent'
              )}
              disabled={!availableUsers?.length || mutation.isPending}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSearchClick}
            className={cn(
              'text-primary-8 hover:text-primary-6 !p-2 transition-colors duration-200',
              'border-primary-7 border',
              'hover:border-primary-6 focus:border-primary-8 h-12! w-12!',
              isSearchVisible
                ? 'text-primary-6 border-primary-6 rounded-l-none! rounded-r-full! border-l-0! bg-transparent! focus-within:bg-transparent! hover:bg-transparent!'
                : 'text-primary-8 w-12! rounded-full'
            )}
            disabled={!availableUsers?.length || mutation.isPending}
          >
            <SearchOutlined className="text-lg" />
          </Button>
        </div>
      </div>

      <div className="h-full grow overflow-hidden px-3">
        <ConfigProvider
          renderEmpty={() => (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No members available to add"
              className="text-white"
            />
          )}
        >
          <div className="secondary-scrollbar mx-auto h-full w-full max-w-3xl overflow-y-auto">
            <List
              id="project-list-users"
              data-testid="project-list-users"
              dataSource={filteredUsers}
              className="text-white"
              renderItem={(member, index) => {
                const isSelected = !!find(selectedMembers, { id: member.id });
                const selectedMember = find(selectedMembers, { id: member.id });

                return (
                  <List.Item
                    key={member.id || member.email}
                    className="!border-primary-7 hover:bg-primary-9/10 !px-4 !py-3"
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onChange={onSelectUser(member)}
                          disabled={mutation.isPending}
                        />
                        <MemberAvatarCasual
                          withEmail
                          shape="circle"
                          key={`member-${member.id || member.email}`}
                          index={index}
                          size="small"
                          layout="horizontal"
                          id={member.id || member.email}
                          email={member.email}
                          role={member.role}
                          pending={false}
                          name={
                            member.id
                              ? compact([get(member, 'first_name'), get(member, 'last_name')]).join(
                                  ' '
                                ) ||
                                get(member, 'username') ||
                                member.email
                              : member.email
                          }
                          initials={extractInitials(
                            member.id
                              ? compact([get(member, 'first_name'), get(member, 'last_name')]).join(
                                  ' '
                                ) ||
                                  get(member, 'username') ||
                                  member.email
                              : member.email
                          )}
                          cls={{
                            text: 'text-white font-medium',
                          }}
                        />
                      </div>
                      {isSelected && (
                        <Select
                          value={selectedMember?.role || 'member'}
                          onChange={(role) => onRoleChange(member, role)}
                          options={roleOptions}
                          size="large"
                          className={cn(
                            'min-w-[120px]',
                            '[&_.ant-select-selector]:!border-primary-7 [&_.ant-select-selector]:!bg-transparent',
                            '[&_.ant-select-selection-item]:!text-primary-8 [&_.ant-select-arrow]:!text-primary-8'
                          )}
                          disabled={mutation.isPending}
                        />
                      )}
                    </div>
                  </List.Item>
                );
              }}
            />
          </div>
        </ConfigProvider>
      </div>

      <div className="mx-auto mt-auto flex w-full max-w-3xl flex-shrink-0 items-center justify-end px-3 pt-4">
        <div className="flex gap-3 self-end">
          <Button
            rounded
            type="button"
            variant="outline"
            size="lg"
            onClick={onBack}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            rounded
            type="button"
            variant="default"
            size="lg"
            onClick={() => mutation.mutateAsync()}
            disabled={isEmpty(selectedMembers) || mutation.isPending || !allowedOperation}
          >
            Add {selectedMembers.length} member(s)
            {mutation.isPending && <LoadingOutlined spin className="ml-2" />}
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
        <AddMemberStep
          onBack={handleBackToListing}
          list={currentProjectTeam}
          allowedOperation={allowedOperation}
        />
      </div>
    ))
    .otherwise(() => null);
}

export default TeamManager;
