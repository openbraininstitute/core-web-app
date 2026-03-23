'use client';

import { ArrowLeftOutlined, DeleteFilled, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfigProvider, Empty, Input, List, Select } from 'antd';
import { filter, find, map, uniqBy } from 'es-toolkit/compat';
import { useEffect, useRef, useState } from 'react';
import z from 'zod';

import { inviteToProject } from '@/api/virtual-lab-svc/queries/invite';
import { useAppNotification } from '@/components/notification';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { roleOptions } from '@/ui/segments/project/team/role-modifier';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { TRole } from '@/api/virtual-lab-svc/queries/types';

const emailSchema = z.string().min(3, 'Email is required').email('Email is not valid');

type InvitePayload = {
  email: string;
  role: TRole;
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

export function InviteMembers({ onBack }: { onBack: () => void }) {
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

  const onRoleChange = (record: InvitePayload, role: TRole) => {
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
      const sentInvites = inviteList.filter(
        (invite) => invite.email && emailSchema.safeParse(invite.email).success
      );
      const failedInvites = data
        .map((result, idx) => {
          if (result.status === 'rejected') return sentInvites[idx];
          return null;
        })
        .filter(Boolean);
      if (failedInvites.length && sentInvites.length !== failedInvites.length) {
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
      } else if (failedInvites.length === sentInvites.length) {
        notifyError({
          message: 'Failed to send invitations. Please try again.',
          placement: 'topRight',
          key: 'send-invites-error',
        });
      } else {
        notifySuccess({
          message: `${sentInvites.length} invitation(s) sent successfully!`,
          placement: 'topRight',
          key: 'send-invites-success',
        });
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
        queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
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
