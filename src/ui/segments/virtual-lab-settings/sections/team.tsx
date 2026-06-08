'use client';

import {
  ArrowLeftOutlined,
  DeleteFilled,
  LoadingOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { List, Table } from 'antd';
import { compact, filter, get, map, sortBy, uniqBy } from 'es-toolkit/compat';
import { useSession } from 'next-auth/react';
import { type SVGProps, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { inviteToVirtualLab } from '@/api/virtual-lab-svc/queries/invite';
import {
  cancelVirtualLabInvite,
  listVirtualLabMembers,
} from '@/api/virtual-lab-svc/queries/member';
import { useAppNotification } from '@/components/notification';
import { MemberAvatarCasual } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { Button as UiButton } from '@/ui/molecules/button';
import { XInput } from '@/ui/segments/profile/sections/profile-form/elements';
import { GhostRoundedIconButton } from '@/ui/segments/workspaces/space-manager/sections/elements';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { extractInitials } from '@/util/slugify';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

import type { ColumnType } from 'antd/es/table';
import type { Member, TRole } from '@/api/virtual-lab-svc/queries/types';

const emailSchema = z.email('Email is not valid').min(3, 'Email is required');

function MailRemove(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <title>Mail Remove</title>
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <path d="m7 7.5l2.942 1.74c1.715 1.014 2.4 1.014 4.116 0L17 7.5" />
        <path d="M21.993 11c.012-.826.009-.649-.009-1.476c-.065-3.065-.098-4.598-1.229-5.733c-1.131-1.136-2.705-1.175-5.854-1.254a115 115 0 0 0-5.802 0c-3.149.079-4.723.118-5.854 1.254c-1.131 1.135-1.164 2.668-1.23 5.733a69 69 0 0 0 0 2.952c.066 3.065.099 4.598 1.23 5.733c1.131 1.136 2.705 1.175 5.854 1.254q1.454.037 2.901.037m3-5l3.5 3.5m0 0l3.5 3.5M18.5 18L15 21.5m3.5-3.5l3.5-3.5" />
      </g>
    </svg>
  );
}

const Steps = {
  InviteMember: 'invite-member',
  ListingMembers: 'listing-members',
} as const;

type Step = (typeof Steps)[keyof typeof Steps] | null;

type InvitePayload = {
  email: string;
  role: TRole;
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
      <XInput
        id="email"
        size="large"
        autoComplete="off"
        placeholder="Enter email address..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        status={error ? 'error' : undefined}
        className={cn('placeholder:text-sm! placeholder:text-gray-400! placeholder:font-light')}
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
  const inviteListScrollRef = useRef<HTMLDivElement>(null);
  const prevInviteCountRef = useRef(inviteList.length);

  useLayoutEffect(() => {
    const nextLen = inviteList.length;
    const el = inviteListScrollRef.current;
    if (nextLen > prevInviteCountRef.current && el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
    prevInviteCountRef.current = nextLen;
  }, [inviteList.length]);

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

  const userToInviteCount = inviteList.filter(
    (invite) => invite.email && emailSchema.safeParse(invite.email).success
  ).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 rounded-2xl bg-white w-full pb-7 px-4 pt-0">
      <div className="shrink-0 pt-5">
        <GhostRoundedIconButton
          icon={<ArrowLeftOutlined />}
          label="Administrators"
          classNames={{ label: 'font-semibold', root: 'hover:bg-gray-100' }}
          onClick={onBack}
          iconPosition="start"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col border border-gray-100 rounded-2xl px-4">
        <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-between px-2 py-4 pb-8">
          <h2 className="text-xl font-semibold text-primary-9 ">
            Invite new administrators to virtual lab
            <div className="flex items-center gap-2">
              <small className="text-sm font-light text-primary-9">
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

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            ref={inviteListScrollRef}
            className="secondary-scrollbar mx-auto min-h-0 flex-1 w-full max-w-3xl overflow-y-auto overscroll-contain"
          >
            <List
              id="virtual-lab-list-users"
              data-testid="virtual-lab-list-users"
              dataSource={inviteList}
              className="text-white mr-1 px-4"
              renderItem={(invite, index) => (
                <List.Item key={index} className="border-primary-7 bg-white py-3!">
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
                    <div className="self-stretch flex items-center justify-center">
                      <UiButton
                        type="button"
                        variant="icon"
                        size="md"
                        rounded
                        onClick={() => removeEmailField(index)}
                        disabled={mutate.isPending || inviteList.length === 1}
                        className={cn(
                          'border border-gray-200 disabled:cursor-pointer cursor-pointer disabled:pointer-events-none',
                          'hover:bg-neutral-1/20 hover:text-destructive p-2 text-primary-9'
                        )}
                      >
                        <DeleteFilled className="text-lg" />
                      </UiButton>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </div>
          <div className="mx-auto flex w-full max-w-3xl shrink-0 justify-end py-4">
            <GhostRoundedIconButton
              icon={<PlusOutlined />}
              label="Add administrator"
              iconPosition="start"
              onClick={addEmailField}
              disabled={mutate.isPending}
              classNames={{ root: 'w-max' }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-auto flex w-full max-w-3xl shrink-0 items-center justify-end">
        <div className="flex gap-3 self-end">
          <GhostRoundedIconButton label="Cancel" onClick={onBack} disabled={mutate.isPending} />
          <GhostRoundedIconButton
            icon={
              mutate.isPending ? <LoadingOutlined spin /> : <SendOutlined className="-rotate-45" />
            }
            label={`Send ${userToInviteCount} invitation(s)`}
            onClick={() => mutate.mutateAsync()}
            disabled={mutate.isPending || !inviteList.some((invite) => invite.email)}
            classNames={{
              root: 'bg-primary-9 text-white hover:bg-primary-8 group',
              label: 'text-white',
              iconWrapper: 'bg-primary-9 text-white! group-hover:bg-primary-8!',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * only the owner and admins may cancel pending invites; everyone else sees nothing
 */
function CancelInvitation({
  user,
  virtualLabId,
  canManage,
}: {
  user: Member;
  virtualLabId: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const { error: notifyError, success: notifySuccess } = useAppNotification();

  const cancelInviteMutation = useMutation({
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

  if (!canManage || user.invite_accepted) return null;

  return (
    <div className="flex w-full flex-col items-end justify-end text-right">
      <GhostRoundedIconButton
        icon={
          cancelInviteMutation.isPending ? (
            <LoadingOutlined spin />
          ) : (
            <MailRemove className="size-6!" />
          )
        }
        label="Cancel invitation"
        size="md"
        onClick={() => cancelInviteMutation.mutateAsync()}
        disabled={cancelInviteMutation.isPending}
        classNames={{ root: 'w-max group' }}
      />
    </div>
  );
}

type ListingStepProps = {
  onInviteMemberClick: () => void;
  virtualLabId: string;
};

function ListingMembers({ onInviteMemberClick, virtualLabId }: ListingStepProps) {
  const { data } = useSession();
  const { isVirtualLabAdmin } = useWorkspaceMembership({ virtualLabId });
  const tableSlotRef = useRef<HTMLDivElement>(null);
  const [tableBodyScrollY, setTableBodyScrollY] = useState<number>();

  const { data: team, isLoading } = useQuery({
    queryKey: keyBuilder.listVirtualLabTeam({ virtualLabId }),
    queryFn: () => listVirtualLabMembers({ virtualLabId }),
  });

  const ownerId = team?.data?.owner_id;
  const users = team?.data?.users;
  const isOwner = Boolean(ownerId) && data?.user.id === ownerId;
  const canManage = isOwner || isVirtualLabAdmin;

  const columns: Array<ColumnType<Member>> = useMemo(
    () => [
      {
        title: 'name',
        dataIndex: 'name',
        key: 'name',
        render: (_: string, record: Member, indx) => (
          <div className="flex w-full min-w-0 items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start justify-start">
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
                pendingIcon={{
                  envelop: '#90a1b9',
                  halfCircle: '#002766',
                }}
                cls={{
                  text: classNames(
                    'text-primary-9! w-full',
                    record.invite_accepted ? 'font-bold' : 'font-light'
                  ),
                  email: 'text-primary-8!',
                }}
              />
            </div>
            <div className="shrink-0">
              <CancelInvitation virtualLabId={virtualLabId} user={record} canManage={canManage} />
            </div>
          </div>
        ),
      },
    ],
    [ownerId, virtualLabId, canManage]
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

  useLayoutEffect(() => {
    const el = tableSlotRef.current;
    if (!el) return;

    const measure = (contentHeight: number) => {
      const h = Math.floor(contentHeight);
      setTableBodyScrollY(h > 12 ? Math.max(80, h - 4) : undefined);
    };

    measure(el.getBoundingClientRect().height);

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      measure(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="flex h-full min-h-0 flex-col rounded-2xl bg-white w-full p-7 px-0"
      id="team-members-container"
      data-testid="team-members-container"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 w-full mb-8">
        <div ref={tableSlotRef} className="flex min-h-0 flex-1 flex-col overflow-hidden w-full">
          <Table
            id="team-members-table"
            bordered={false}
            loading={isLoading}
            dataSource={orderedUsers}
            pagination={false}
            columns={columns}
            showHeader={false}
            size="middle"
            rowKey={(record) => record.id ?? record.email}
            rootClassName={cn(
              '[&_.ant-spin-blur]:opacity-0',
              '[&_.ant-table-wrapper]:bg-white!',
              '[&_#team-members-table]:bg-white!'
            )}
            className={cn(
              'h-full min-h-0',
              '[&_.ant-table]:bg-white!',
              '[&_.ant-table-tbody>tr]:transition-all [&_.ant-table-tbody>tr]:duration-1000',
              '[&_.ant-table-tbody>tr.ant-table-row-remove]:h-0 [&_.ant-table-tbody>tr.ant-table-row-remove]:opacity-40',
              '[&_.ant-table-body]:secondary-scrollbar! [&_.ant-table-body]:pr-3',
              '[&_.ant-table-placeholder]:bg-white!',
              '[&_.ant-table-container]:h-full [&_.ant-table-container]:min-h-0',
              '[&_.ant-empty-description]:text-primary-9!',
              '[&_.ant-table-cell]:bg-white!'
            )}
            scroll={{
              y: tableBodyScrollY ?? 'calc(100vh - 40rem)',
            }}
          />
        </div>
      </div>
      {isVirtualLabAdmin && (
        <div className="flex justify-end w-full mt-auto px-7">
          <GhostRoundedIconButton
            icon={<PlusOutlined />}
            label="Add administrator"
            onClick={onInviteMemberClick}
            classNames={{ root: 'w-max' }}
          />
        </div>
      )}
    </div>
  );
}

export function TeamTable({ virtualLabId }: { virtualLabId: string }) {
  const [currentStep, setCurrentStep] = useState<Step>(Steps.ListingMembers);

  const handleInviteMemberClick = () => setCurrentStep(Steps.InviteMember);
  const handleBackToListing = () => setCurrentStep(Steps.ListingMembers);

  return match(currentStep)
    .with(Steps.ListingMembers, () => (
      <div className="flex h-full min-h-0 flex-col">
        <ListingMembers onInviteMemberClick={handleInviteMemberClick} virtualLabId={virtualLabId} />
      </div>
    ))
    .with(Steps.InviteMember, () => (
      <div className="animate-fade-in flex h-full min-h-0 flex-col">
        <InviteMembers onBack={handleBackToListing} virtualLabId={virtualLabId} />
      </div>
    ))
    .otherwise(() => null);
}

export default TeamTable;
