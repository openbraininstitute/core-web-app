'use client';

import { ArrowLeftOutlined, DeleteFilled, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, ConfigProvider, Empty, Input, List, Table } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { compact, filter, get, map, sortBy, uniqBy } from 'es-toolkit/compat';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { match } from 'ts-pattern';
import { z } from 'zod';
import { inviteToVirtualLab } from '@/api/virtual-lab-svc/queries/invite';
import {
  cancelVirtualLabInvite,
  listVirtualLabMembers,
} from '@/api/virtual-lab-svc/queries/member';
import type { Member, Role } from '@/api/virtual-lab-svc/queries/types';
import { useAppNotification } from '@/components/notification';
import { MemberAvatarCasual } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { useUserRole } from '@/hooks/use-user-role';
import { Badge } from '@/ui/molecules/badge';
import { Button as UiButton } from '@/ui/molecules/button';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { extractInitials } from '@/util/slugify';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

const emailSchema = z.string().min(3, 'Email is required').email('Email is not valid');

const Steps = {
  InviteMember: 'invite-member',
  ListingMembers: 'listing-members',
} as const;

type Step = (typeof Steps)[keyof typeof Steps] | null;

type InvitePayload = {
  email: string;
  role: Role;
};

type InviteMemberStepProps = {
  onBack: () => void;
  virtualLabId: string;
};

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
          'focus:white hover:bg-primary-9! border-white bg-transparent hover:text-white!',
          'focus-within:bg-primary-9! bg-primary-9! text-white! focus-within:text-white!',
          'placeholder:text-sm! placeholder:text-white'
        )}
        disabled={disabled}
      />
      {error && <small style={{ color: 'red', marginTop: 4 }}>{error}</small>}
    </div>
  );
}

function InviteMembers({ onBack, virtualLabId }: InviteMemberStepProps) {
  const queryClient = useQueryClient();
  const { error: notifyError, success: notifySuccess } = useAppNotification();
  const [inviteList, setInviteList] = useState<Array<InvitePayload>>([
    { email: '', role: 'admin' },
  ]);

  const addEmailField = () => {
    setInviteList((prev) => [...prev, { email: '', role: 'admin' }]);
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
      validInvites.map(({ email }) => inviteToVirtualLab({ virtualLabId, email, role: 'admin' }))
    );
    return invites;
  };

  const mutate = useMutation({
    mutationFn: inviteUsers,
    onSuccess: (data) => {
      const requestedInvites = inviteList.filter(
        (invite) => invite.email && emailSchema.safeParse(invite.email).success
      );
      const failedInvites = data
        .map((result, idx) => {
          if (result.status === 'rejected') return requestedInvites[idx];
          return null;
        })
        .filter(Boolean);
      if (failedInvites.length && requestedInvites.length !== failedInvites.length) {
        notifyError({
          message: `Some invitations were sent successfully, but a few may not have been delivered:`,
          description: (
            <ul className="text-primary-8">
              {failedInvites.map((invite) => (
                <li className="list-decimal" key={invite?.email}>
                  {' '}
                  {invite?.email}
                </li>
              ))}
            </ul>
          ),
          placement: 'topRight',
          key: 'send-invites-partial',
        });
      } else if (failedInvites.length === requestedInvites.length) {
        notifyError({
          message: 'Failed to send invitations. Please try again.',
          placement: 'topRight',
          key: 'send-invites-error',
        });
      } else {
        notifySuccess({
          message: `${requestedInvites.length} invitation(s) sent successfully!`,
          placement: 'topRight',
          key: 'send-invites-success',
        });
        // Reset form to single empty invite field after successful submission
        setInviteList([{ email: '', role: 'member' }]);
        onBack();
      }
    },
    onError: (error) => {
      log('error', 'error when inviting people to virtual lab', error);
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

  return (
    <div className="flex h-full flex-col pb-10">
      <div className="bg-primary-9 sticky top-0 z-10 flex shrink-0 items-center px-6 py-5">
        <div className="flex w-full items-center gap-4">
          <UiButton
            rounded
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="hover:bg-neutral-2/20 h-auto !px-4 py-2! text-white hover:text-white"
          >
            <ArrowLeftOutlined className="text-lg" />
            <span className="ml-4 text-lg font-bold text-white">Administrators</span>
          </UiButton>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-8 py-4 pb-8">
        <h2 className="text-xl font-semibold text-white">
          Invite new administrators to virtual lab
          <div className="flex items-center gap-2">
            <small className="text-sm font-light text-white">
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

      <div className="h-full grow overflow-hidden px-3">
        <ConfigProvider
          renderEmpty={() => (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No invitations to display"
              className="text-white"
            />
          )}
        >
          <div className="primary-scrollbar mx-auto h-full w-full max-w-3xl overflow-y-auto px-4">
            <List
              id="virtual-lab-list-users"
              data-testid="virtual-lab-list-users"
              dataSource={inviteList}
              className="text-white"
              renderItem={(invite, index) => (
                <List.Item
                  key={index}
                  className="!border-primary-7 hover:bg-primary-9/10 !px-4 !py-3"
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
                    <UiButton
                      type="button"
                      variant="ghost"
                      size="lg"
                      onClick={() => removeEmailField(index)}
                      className="hover:bg-neutral-1/20 hover:text-destructive h-12! w-12 !p-2 text-white"
                      disabled={mutate.isPending || inviteList.length === 1}
                    >
                      <DeleteFilled className="text-lg" />
                    </UiButton>
                  </div>
                </List.Item>
              )}
            />
            <div className="flex justify-start p-4">
              <UiButton
                rounded
                type="button"
                variant="outline"
                size="md"
                onClick={addEmailField}
                className={cn(
                  'border-primary-4 group bg-primary-9 hover:text-primary-4',
                  'px-4 text-white select-none hover:border-white'
                )}
                disabled={mutate.isPending}
              >
                <PlusOutlined className="mr-2" />
                Add administrator
              </UiButton>
            </div>
          </div>
        </ConfigProvider>
      </div>

      <div className="mx-auto mt-auto flex w-full max-w-3xl flex-shrink-0 items-center justify-end px-8 pt-4">
        <div className="flex gap-3 self-end">
          <UiButton
            rounded
            type="button"
            variant="outline"
            size="lg"
            onClick={onBack}
            disabled={mutate.isPending}
          >
            Cancel
          </UiButton>
          <UiButton
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
          </UiButton>
        </div>
      </div>
    </div>
  );
}

function CancelInvitation({ user, virtualLabId }: { user: Member; virtualLabId: string }) {
  const queryClient = useQueryClient();
  const { error: notifyError, success: notifySuccess } = useAppNotification();

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
          <>
            Invite for <strong className="text-primary-8">{user.email}</strong> cancelled
            successfully
          </>
        ),
        placement: 'topRight',
        key: 'user-cancel-invite',
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.listVirtualLabTeam({ virtualLabId }),
      });
    },
  });

  return (
    !user.invite_accepted && (
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
    )
  );
}

type ListingStepProps = {
  onInviteMemberClick: () => void;
  virtualLabId: string;
};

function ListingMembers({ onInviteMemberClick, virtualLabId }: ListingStepProps) {
  const { data } = useSession();
  const { isVirtualLabAdmin } = useUserRole({ virtualLabId });

  const { data: team, isLoading } = useQuery({
    queryKey: keyBuilder.listVirtualLabTeam({ virtualLabId }),
    queryFn: () => listVirtualLabMembers({ virtualLabId }),
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
              isOwner={ownerId === record.id}
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
        render: () => <span className="text-primary-3" />,
      },
      {
        title: 'Action',
        key: 'role',
        dataIndex: 'role',
        align: 'right',
        width: '200px',
        render: (_: Role, record) => <CancelInvitation virtualLabId={virtualLabId} user={record} />,
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
      <div className="bg-primary-9 sticky top-0 z-10 flex shrink-0 items-center justify-between px-6 py-5">
        <div className="flex items-center justify-center gap-2">
          <span className="text-primary-3 text-lg font-bold">Administrators</span>
          {total && (
            <Badge
              variant="outline"
              className="bg-primary-9 border-neutral-1/30 min-w-8 border py-1! text-sm font-bold text-white"
            >
              {total}
            </Badge>
          )}
        </div>
        {isVirtualLabAdmin && (
          <UiButton
            rounded
            key="add-member"
            data-testid="add-member-btn"
            type="button"
            size="md"
            variant="outline"
            className="border-primary-4 bg-primary-9 hover:text-primary-4 px-4 text-white hover:border-white"
            onClick={onInviteMemberClick}
          >
            <div className="flex gap-5">
              Add administrator
              <PlusOutlined />
            </div>
          </UiButton>
        )}
      </div>
      <div className="h-full grow overflow-hidden px-6">
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
            loading={isLoading}
            dataSource={orderedUsers}
            pagination={false}
            columns={columns}
            showHeader={false}
            size="middle"
            rowKey={(record) => record.id ?? record.email}
            rootClassName="[&_.ant-spin-blur]:opacity-0!"
            className={cn(
              'h-full',
              '[&_.ant-table-tbody>tr]:transition-all [&_.ant-table-tbody>tr]:duration-1000',
              '[&_.ant-table-tbody>tr.ant-table-row-remove]:h-0 [&_.ant-table-tbody>tr.ant-table-row-remove]:opacity-40',
              '[&_.ant-table-body]:primary-scrollbar [&_.ant-table-body]:max-h-full [&_.ant-table-body]:overflow-auto [&_.ant-table-container]:h-full',
              '[&_.ant-empty-description]:text-white!'
            )}
            scroll={{ y: 'calc(100vh - 180px)' }}
          />
        </ConfigProvider>
      </div>
    </div>
  );
}

export function TeamTable({ virtualLabId }: { virtualLabId: string }) {
  const [currentStep, setCurrentStep] = useState<Step>(Steps.ListingMembers);

  const handleInviteMemberClick = () => setCurrentStep(Steps.InviteMember);
  const handleBackToListing = () => setCurrentStep(Steps.ListingMembers);

  return match(currentStep)
    .with(Steps.ListingMembers, () => (
      <ListingMembers onInviteMemberClick={handleInviteMemberClick} virtualLabId={virtualLabId} />
    ))
    .with(Steps.InviteMember, () => (
      <div className="animate-fade-in h-full">
        <InviteMembers onBack={handleBackToListing} virtualLabId={virtualLabId} />
      </div>
    ))
    .otherwise(() => null);
}

export default TeamTable;
