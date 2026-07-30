'use client';

import {
  ArrowLeftOutlined,
  DeleteFilled,
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { RiRestartLine } from '@remixicon/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, Input, List, Popconfirm, Select } from 'antd';
import { compact, find, get, sortBy, uniqBy } from 'es-toolkit/compat';
import { useSession } from 'next-auth/react';
import { type SVGProps, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { inviteToProject } from '@/api/virtual-lab-svc/queries/invite';
import {
  cancelProjectInvite,
  listProjectMembers,
  removeUserFromProject,
  updateProjectUserRole,
} from '@/api/virtual-lab-svc/queries/member';
import { getProject, updateProject } from '@/api/virtual-lab-svc/queries/project';
import { useAppNotification } from '@/components/notification';
import { MemberAvatarCasual } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { Badge } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { ErrorSoft } from '@/ui/molecules/feedback-card';
import { Label, XInput } from '@/ui/segments/profile/sections/profile-form/elements';
import { ProjectActivities } from '@/ui/segments/project/activities';
import { ProjectCreation } from '@/ui/segments/project/create';
import {
  canChangeProjectMemberRole,
  canManagePendingProjectInviteWithoutMemberId,
} from '@/ui/segments/project/team/role-changer';
import {
  type TWorkspaceManagerSection,
  WorkspaceManagerSectionDict,
} from '@/ui/segments/workspaces/space-manager/constants';
import { GhostRoundedIconButton } from '@/ui/segments/workspaces/space-manager/sections/elements';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { extractInitials } from '@/util/slugify';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

import type { Member, TRole } from '@/api/virtual-lab-svc/queries/types';
import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';

const { TextArea } = Input;

type TProjectOverviewForm = {
  name: string;
  description: string;
};

function ProjectOverviewPanel({
  targetProjectId,
  targetVirtualLabId,
}: {
  targetProjectId: string;
  targetVirtualLabId: string;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm<TProjectOverviewForm>();

  const {
    data: project,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: keyBuilder.getWorkspace({
      virtualLabId: targetVirtualLabId,
      projectId: targetProjectId,
      expand: ['virtual_lab'],
    }),
    queryFn: () =>
      getProject({
        virtualLabId: targetVirtualLabId,
        projectId: targetProjectId,
        expand: ['virtual_lab'],
      }),
    enabled: !!targetProjectId && !!targetVirtualLabId,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const virtualLabName = project?.virtual_lab?.name ?? 'Virtual lab';

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (values: TProjectOverviewForm) =>
      updateProject({
        virtualLabId: targetVirtualLabId,
        projectId: targetProjectId,
        payload: {
          name: values.name.trim(),
          description: values.description.trim(),
        },
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey as [string, { virtualLabId?: string }];
            const [key, params] = queryKey;
            return key === `workspace/projects-list` && params?.virtualLabId === targetVirtualLabId;
          },
        }),
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey as [
              string,
              { virtualLabId?: string; projectId?: string },
            ];
            const [key, params] = queryKey;
            return (
              key === `workspace/project` &&
              params?.virtualLabId === targetVirtualLabId &&
              params?.projectId === targetProjectId
            );
          },
        }),
      ]);
      setIsEditing(false);
    },
  });

  const formValues = Form.useWatch([], form);
  const isValid = !!formValues?.name?.trim();
  const formDisabled = !isEditing || isPending;
  const readOnly = !isEditing;

  const descriptionTextareaClassName = cn(
    'font-bold tracking-wide text-primary-9! [&_.ant-input-data-count]:-bottom-7! [&_.ant-input-data-count]:font-light!',
    'transition-[border-color,box-shadow] duration-200 ease-in-out',
    readOnly
      ? cn(
          'border-0! bg-transparent! p-0! shadow-none! resize-none',
          '[&_.ant-input]:min-h-0! [&_.ant-input]:cursor-default! [&_.ant-input]:p-0!',
          '[&.ant-input-outlined]:bg-transparent!'
        )
      : cn(
          'rounded-lg min-h-[4.5rem] border-2! border-gray-100! bg-transparent! px-2! py-2!',
          'shadow-none ring-0 placeholder:text-primary-9!',
          'hover:border-gray-200! focus:border-pr focus-within:border-gray-300!'
        )
  );

  if (isLoading) {
    return (
      <div className="text-primary-9 flex h-40 items-center justify-center">
        <LoadingOutlined spin />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <ErrorSoft
        title="We could not load this project."
        description="Try again or pick another workspace."
        primaryAction={
          <GhostRoundedIconButton
            icon={<RiRestartLine />}
            label="Try again"
            onClick={() => refetch()}
          />
        }
      />
    );
  }

  return (
    <section
      className="flex h-max flex-col justify-between rounded-2xl bg-white p-6"
      data-testid="workspace-manager-project-overview-root"
      id="workspace-manager-project-overview-root"
    >
      <Form
        key={`${targetVirtualLabId}-${targetProjectId}-${project.updated_at ?? project.id}`}
        form={form}
        layout="vertical"
        className="project-overview-form"
        initialValues={{
          name: project.name,
          description: project.description ?? '',
        }}
        disabled={formDisabled}
        requiredMark={false}
        preserve={false}
        validateTrigger={isEditing ? ['onBlur', 'onChange'] : []}
        scrollToFirstError
        onFinish={async (values) => {
          await mutateAsync(values);
        }}
        rootClassName={cn(
          '[&_.ant-form-item]:mb-0! [&_.ant-form-item-explain-error]:text-sm! ',
          '[&_.ant-form-item-explain-error]:pl-0.5! [&_.ant-form-item-explain-error]:select-none!'
        )}
      >
        <div className="grid grid-cols-1 gap-y-4 w-full">
          <Form.Item
            name="name"
            className="[&_.ant-form-item-label]:pb-0! w-full"
            rules={[{ required: true, message: 'Please enter a name' }]}
            label={<Label title="Name" className="text-primary-9" required />}
          >
            <XInput
              id="workspace-manager-project-name"
              name="name"
              type="text"
              maxLength={60}
              className="w-full!"
              plain={readOnly}
            />
          </Form.Item>
          <Form.Item
            name="description"
            className="md:col-span-2 [&_.ant-form-item-label]:pb-0!"
            label={<Label title="Description" className="text-primary-9" />}
          >
            <TextArea
              id="workspace-manager-project-description"
              readOnly={readOnly}
              maxLength={600}
              showCount={isEditing}
              autoSize={{ minRows: readOnly ? 1 : 3, maxRows: isEditing ? 12 : 8 }}
              className={cn(descriptionTextareaClassName)}
            />
          </Form.Item>
          <div className="flex flex-col mt-10">
            <Label title="Virtual lab" className="text-primary-9 [&_.ant-form-item-label]:pb-0!" />
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg text-primary-9',
                'transition-[padding,border-color,box-shadow] duration-200 ease-in-out border-2!',
                'border-transparent px-0'
              )}
            >
              <span className="font-bold select-none">{virtualLabName}</span>
            </div>
          </div>
        </div>
        <div className="relative mt-3 min-h-14">
          {isEditing ? (
            <div
              key="project-overview-form-actions-edit"
              className="absolute inset-y-0 right-0 flex flex-wrap items-center justify-end gap-3"
            >
              <Button
                rounded
                type="button"
                variant="ghost"
                size="responsive"
                className="rounded-full px-8 py-2 text-base font-semibold transition-colors"
                onClick={() => {
                  form.resetFields();
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button
                rounded
                type="submit"
                variant="default"
                size="responsive"
                className={cn('hover:bg-primary-8')}
                disabled={isPending || !isValid}
              >
                <div className="flex items-center gap-2 px-6">
                  {isPending && <LoadingOutlined />}
                  Update
                </div>
              </Button>
            </div>
          ) : (
            <div
              key="project-overview-form-actions-view"
              className="absolute inset-y-0 right-0 flex items-center justify-end"
            >
              <GhostRoundedIconButton
                icon={<EditOutlined />}
                label="Edit information"
                size="md"
                classNames={{ label: 'text-lg font-semibold' }}
                data-testid="workspace-manager-project-overview-edit"
                id="workspace-manager-project-overview-edit"
                onClick={() => setIsEditing(true)}
              />
            </div>
          )}
        </div>
      </Form>
    </section>
  );
}

const projectInviteEmailSchema = z.email('Email is not valid').min(3, 'Email is required');

const projectRoleOptions: Array<{ value: TRole; label: string }> = [
  { value: 'admin', label: 'Administrator' },
  { value: 'member', label: 'Member' },
];

function ProjectRoleBadge({ role }: { role: TRole }) {
  const label = get(find(projectRoleOptions, { value: role }), 'label', 'Member');
  if (role === 'admin') {
    return (
      <Badge
        variant="default"
        size="sm"
        rounded
        className="h-7! px-2.5! py-0! text-xs font-semibold"
      >
        {label}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      size="sm"
      rounded
      className="h-7! border-primary-7! bg-primary-1/40 px-2.5! py-0! text-xs font-semibold text-primary-9"
    >
      {label}
    </Badge>
  );
}

type ProjectInvitePayload = { email: string; role: TRole };

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

function ProjectMemberEmailInput({
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
  inviteList: Array<ProjectInvitePayload>;
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value.trim() !== '') {
      const result = projectInviteEmailSchema.safeParse(value);
      if (!result.success) {
        const issue = result.error.issues.at(0);
        setError(issue?.message ?? 'Invalid input');
      } else {
        setError(null);
      }
    }
  }, [value]);

  useEffect(() => {
    const duplicates = inviteList
      .map((o, i) =>
        o.email.toLowerCase() === value.toLowerCase() && value.trim() !== '' ? i : -1
      )
      .filter((i) => i !== -1 && i !== index);

    if (duplicates.length > 0) {
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

function ProjectInviteMembers({
  onBack,
  targetVirtualLabId,
  targetProjectId,
}: {
  onBack: () => void;
  targetVirtualLabId: string;
  targetProjectId: string;
}) {
  const queryClient = useQueryClient();
  const { error: notifyError, success: notifySuccess } = useAppNotification();
  const [inviteList, setInviteList] = useState<Array<ProjectInvitePayload>>([
    { email: '', role: 'member' },
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
    setInviteList((prev) => [...prev, { email: '', role: 'member' }]);
  };

  const removeEmailField = (index: number) => {
    setInviteList((prev) => prev.filter((_, i) => i !== index));
  };

  const updateInvite = (index: number, field: keyof ProjectInvitePayload, value: string) => {
    setInviteList((prev) =>
      prev.map((invite, i) => (i === index ? { ...invite, [field]: value } : invite))
    );
  };

  const inviteUsers = async () => {
    const validInvites = inviteList.filter(
      (invite) => invite.email && projectInviteEmailSchema.safeParse(invite.email).success
    );
    return Promise.allSettled(
      validInvites.map(({ email, role }) =>
        inviteToProject({
          virtualLabId: targetVirtualLabId,
          projectId: targetProjectId,
          email,
          role,
        })
      )
    );
  };

  const mutate = useMutation({
    mutationFn: inviteUsers,
    onSuccess: (data) => {
      const requestedInvites = inviteList.filter(
        (invite) => invite.email && projectInviteEmailSchema.safeParse(invite.email).success
      );
      const failedInvites = data
        .map((result, idx) => (result.status === 'rejected' ? requestedInvites[idx] : null))
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
        setInviteList([{ email: '', role: 'member' }]);
        onBack();
      }
    },
    onError: (error) => {
      log('error', 'error when inviting people to project', error);
      notifyError({
        message: 'Failed to send invitations. Please try again.',
        placement: 'topRight',
        key: 'send-invites-error',
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.listProjectTeam({
          virtualLabId: targetVirtualLabId,
          projectId: targetProjectId,
        }),
      });
    },
  });

  const userToInviteCount = inviteList.filter(
    (invite) => invite.email && projectInviteEmailSchema.safeParse(invite.email).success
  ).length;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3.5 rounded-2xl bg-white w-full pb-7 px-4 pt-0"
      data-testid="workspace-manager-project-invite-root"
      id="workspace-manager-project-invite-root"
    >
      <div className="shrink-0 pt-5">
        <GhostRoundedIconButton
          icon={<ArrowLeftOutlined />}
          label="Members"
          classNames={{ label: 'font-semibold', root: 'hover:bg-gray-100' }}
          onClick={onBack}
          iconPosition="start"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col border border-gray-100 rounded-2xl px-4">
        <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-between px-2 py-4 pb-8">
          <h2 className="text-xl font-semibold text-primary-9 ">
            Invite new members to project
            <div className="flex items-center gap-2">
              <small className="text-sm font-light text-primary-9">
                <span className="font-bold">
                  {
                    uniqBy(
                      inviteList.filter(
                        (invite) =>
                          invite.email && projectInviteEmailSchema.safeParse(invite.email).success
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
              id="workspace-manager-project-list-users"
              data-testid="workspace-manager-project-list-users"
              dataSource={inviteList}
              className="text-white mr-1 px-4"
              renderItem={(invite, index) => (
                <List.Item key={index} className="border-primary-7 bg-white py-3!">
                  <div className="flex w-full items-start justify-start gap-3">
                    <div className="flex-1">
                      <ProjectMemberEmailInput
                        index={index}
                        value={invite.email}
                        onChange={(v) => updateInvite(index, 'email', v)}
                        disabled={mutate.isPending}
                        inviteList={inviteList}
                      />
                    </div>
                    <Select
                      value={invite.role || 'member'}
                      onChange={(role) => updateInvite(index, 'role', role)}
                      options={projectRoleOptions}
                      disabled={
                        mutate.isPending ||
                        !projectInviteEmailSchema.safeParse(invite.email).success
                      }
                      size="large"
                      className={cn(
                        'min-w-[140px]',
                        '[&_.ant-select-selector]:border-gray-200! [&_.ant-select-selector]:bg-transparent!',
                        '[&_.ant-select-selection-item]:text-primary-9! [&_.ant-select-arrow]:text-primary-8!',
                        '[&_.ant-select-arrow]:text-primary-8! [&_.ant-select-selector]:rounded-2xl!',
                        '[&_.ant-select-selection-item]:text-start!',
                        '[&.ant-select-disabled_.ant-select-selection-item]:text-gray-400!',
                        '[&.ant-select-disabled_.ant-select-arrow]:text-gray-300!'
                      )}
                    />
                    <div className="self-stretch flex items-center justify-center">
                      <Button
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
                      </Button>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </div>
          <div className="mx-auto flex w-full max-w-3xl shrink-0 justify-end py-4">
            <GhostRoundedIconButton
              icon={<PlusOutlined />}
              label="Add member"
              iconPosition="start"
              onClick={addEmailField}
              disabled={mutate.isPending}
              classNames={{ root: 'w-max' }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-auto flex w-full max-w-3xl shrink-0 items-center justify-end pt-4">
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

function CancelProjectInvitation({
  user,
  targetVirtualLabId,
  targetProjectId,
}: {
  user: Member;
  targetVirtualLabId: string;
  targetProjectId: string;
}) {
  const queryClient = useQueryClient();
  const { error: notifyError, success: notifySuccess } = useAppNotification();

  const mutateInvite = useMutation({
    mutationKey: [`${targetVirtualLabId}/${targetProjectId}/delete-item/${user.email}`],
    mutationFn: () =>
      cancelProjectInvite({
        virtualLabId: targetVirtualLabId,
        projectId: targetProjectId,
        email: user.email,
        role: user.role,
      }),
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
        queryKey: keyBuilder.listProjectTeam({
          virtualLabId: targetVirtualLabId,
          projectId: targetProjectId,
        }),
      });
    },
  });

  return (
    <div className="flex w-full flex-col items-end justify-end text-right">
      <GhostRoundedIconButton
        icon={
          mutateInvite.isPending ? (
            <LoadingOutlined spin />
          ) : (
            <MailRemove className="size-6! text-primary-9!" />
          )
        }
        label="Cancel invitation"
        size="md"
        onClick={() => mutateInvite.mutateAsync()}
        disabled={mutateInvite.isPending}
        classNames={{ root: 'w-max group' }}
      />
    </div>
  );
}

function ProjectRoleModifier({
  user,
  targetVirtualLabId,
  targetProjectId,
  virtualLabOwnerId,
  virtualLabAdmins,
  projectAdmins,
}: {
  user: Member;
  targetVirtualLabId: string;
  targetProjectId: string;
  virtualLabOwnerId?: string | null;
  virtualLabAdmins?: Array<string> | null;
  projectAdmins?: Array<string> | null;
}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { error: notifyError, success: notifySuccess } = useAppNotification();
  const [role, setRole] = useState(user.role);

  const invalidate = async () =>
    queryClient.invalidateQueries({
      queryKey: keyBuilder.listProjectTeam({
        virtualLabId: targetVirtualLabId,
        projectId: targetProjectId,
      }),
    });

  const updateRoleMutation = useMutation({
    mutationFn: (_role: TRole) =>
      updateProjectUserRole({
        virtualLabId: targetVirtualLabId,
        projectId: targetProjectId,
        userId: user.id,
        newRole: _role,
      }),
    onError(error) {
      const code = get(error, 'cause.error_code');
      if (code === 'NOT_ALLOWED_OP') {
        notifyError({
          message: 'Update user role',
          description: get(error, 'cause.message', 'Failed to update user role. Please try again.'),
          placement: 'topRight',
          key: 'user-role-update',
        });
      } else {
        notifyError({
          message: 'Update user role',
          description: 'Failed to update user role. Please try again.',
          placement: 'topRight',
          key: 'user-role-update',
        });
      }
      setRole(user.role);
    },
    async onSuccess(_, variables) {
      notifySuccess({
        message: `User "${user.name}" role updated to ${get(find(projectRoleOptions, { value: variables }), 'label')} successfully`,
        placement: 'topRight',
        key: 'user-role-update',
      });
    },
    onSettled: invalidate,
  });

  const removeItemMutation = useMutation({
    mutationKey: [`${targetVirtualLabId}/${targetProjectId}/delete-item/${user.id}`],
    mutationFn: () =>
      removeUserFromProject({
        virtualLabId: targetVirtualLabId,
        projectId: targetProjectId,
        userId: user.id,
      }),
    onError: (error) => {
      if (get(error, 'cause.error_code') === 'FORBIDDEN_OPERATION') {
        notifyError({
          message: 'You are not authorized to remove this user from the project.',
          placement: 'topRight',
          key: 'user-remove-from-project',
        });
      } else {
        notifyError({
          message: 'Failed to remove user from project. Please try again.',
          placement: 'topRight',
          key: 'user-remove-from-project',
        });
      }
    },
    async onSuccess() {
      notifySuccess({
        message: `User "${user.name}" removed from project successfully`,
        placement: 'topRight',
        key: 'user-remove-from-project',
      });
    },
    onSettled: invalidate,
  });

  if (!user.invite_accepted) {
    const canCancelPendingInvite = user.id
      ? canChangeProjectMemberRole({
          viewerId: session?.user.id,
          targetUserId: user.id,
          virtualLabOwnerId,
          virtualLabAdmins,
          projectAdmins,
        })
      : canManagePendingProjectInviteWithoutMemberId({
          viewerId: session?.user.id,
          virtualLabOwnerId,
          virtualLabAdmins,
          projectAdmins,
        });

    if (!canCancelPendingInvite) return null;

    return (
      <CancelProjectInvitation
        user={user}
        targetVirtualLabId={targetVirtualLabId}
        targetProjectId={targetProjectId}
      />
    );
  }

  const canChangeRole = canChangeProjectMemberRole({
    viewerId: session?.user.id,
    targetUserId: user.id,
    virtualLabOwnerId,
    virtualLabAdmins,
    projectAdmins,
  });

  if (!canChangeRole) {
    return (
      <div className="flex w-full flex-col items-end justify-end pr-3 text-right">
        <ProjectRoleBadge role={user.role} />
      </div>
    );
  }

  return (
    <div className="ml-auto flex w-full flex-col items-end justify-end text-right">
      <div className="flex w-max flex-row items-center justify-center gap-2">
        <Select
          data-testid="project-role-select"
          className={cn(
            'min-w-[140px]',
            '[&_.ant-select-selector]:border-gray-200! [&_.ant-select-selector]:bg-transparent!',
            '[&_.ant-select-selection-item]:text-primary-9! [&_.ant-select-selection-item]:font-semibold!',
            '[&_.ant-select-arrow]:text-primary-8! [&_.ant-select-selector]:rounded-2xl!',
            '[&_.ant-select-selection-item]:text-start!'
          )}
          onChange={(value) => {
            setRole(value);
            updateRoleMutation.mutateAsync(value);
          }}
          value={role}
          size="large"
          options={projectRoleOptions}
          disabled={updateRoleMutation.isPending}
          loading={updateRoleMutation.isPending}
        />
        <Popconfirm
          placement="bottomRight"
          title="Remove member"
          description="Are you sure to remove this member from the project?"
          onConfirm={() => removeItemMutation.mutateAsync()}
          okText="Yes"
          cancelText="No"
          okButtonProps={{
            className: 'bg-primary-9 hover:bg-primary-8 text-white! rounded-full px-5 py-4',
          }}
          cancelButtonProps={{
            className:
              'bg-white text-primary-9 hover:text-primary-8 border border-gray-200! rounded-full px-5 py-4',
          }}
          disabled={removeItemMutation.isPending}
          classNames={{
            root: cn(
              '[&_.ant-popover-inner]:bg-white! [&_.ant-popover-inner]:text-primary-9!',
              '[&_.ant-popconfirm-description]:text-primary-9! [&_.ant-popconfirm-title]:text-primary-9!',
              '[&_.ant-popover-arrow]:after:bg-white!'
            ),
          }}
        >
          <Button
            rounded
            variant="icon"
            size="md"
            className="text-primary-9 hover:text-destructive! border border-gray-200! bg-transparent hover:bg-white!"
            disabled={removeItemMutation.isPending}
          >
            {removeItemMutation.isPending ? (
              <LoadingOutlined spin />
            ) : (
              <DeleteOutlined className="text-lg" />
            )}
          </Button>
        </Popconfirm>
      </div>
    </div>
  );
}

function ProjectMembersListing({
  onInviteMemberClick,
  targetVirtualLabId,
  targetProjectId,
}: {
  onInviteMemberClick: () => void;
  targetVirtualLabId: string;
  targetProjectId: string;
}) {
  const { data: session } = useSession();
  const {
    virtualLabAdmins,
    virtualLabOwnerId,
    projectAdmins,
    isVirtualLabAdmin,
    isProjectAdmin,
    isLoading: isMembershipLoading,
  } = useWorkspaceMembership({
    virtualLabId: targetVirtualLabId,
    projectId: targetProjectId,
  });
  const { data: team } = useQuery({
    queryKey: keyBuilder.listProjectTeam({
      virtualLabId: targetVirtualLabId,
      projectId: targetProjectId,
    }),
    queryFn: () =>
      listProjectMembers({ virtualLabId: targetVirtualLabId, projectId: targetProjectId }),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const ownerId = team?.data?.owner_id;
  const users = team?.data?.users;

  const orderedUsers = useMemo(
    () =>
      sortBy(users, [
        (member) => (member.id === ownerId ? 0 : 1),
        (member) => (member.id === session?.user.id ? 0 : 1),
        (member) => (member.invite_accepted && member.role === 'admin' ? 0 : 1),
        (member) => (member.invite_accepted && member.role === 'member' ? 0 : 1),
        (member) => (member.invite_accepted ? 0 : 1),
        'created_at',
      ]),
    [users, ownerId, session?.user.id]
  );

  const columns: Array<SimpleColumn<Member>> = useMemo(
    () => [
      {
        id: 'name',
        header: '',
        renderCell: (record) => (
          <div className="flex w-full min-w-0 items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start justify-start">
              <MemberAvatarCasual
                withEmail
                isOwner={ownerId === record.id || virtualLabAdmins?.includes(record.id)}
                shape={record.role === 'admin' ? 'square' : 'circle'}
                key={`project-avatar-${record.id ?? record.email}`}
                index={orderedUsers.indexOf(record)}
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
                  avatar: 'p-7!',
                  email: 'text-primary-8!',
                }}
              />
            </div>
            <div className="shrink-0">
              {isMembershipLoading ? (
                <LoadingOutlined />
              ) : (
                <ProjectRoleModifier
                  user={record}
                  targetVirtualLabId={targetVirtualLabId}
                  targetProjectId={targetProjectId}
                  virtualLabOwnerId={virtualLabOwnerId}
                  virtualLabAdmins={virtualLabAdmins}
                  projectAdmins={projectAdmins}
                />
              )}
            </div>
          </div>
        ),
      },
    ],
    [
      ownerId,
      virtualLabOwnerId,
      virtualLabAdmins,
      projectAdmins,
      isMembershipLoading,
      targetVirtualLabId,
      targetProjectId,
      orderedUsers,
    ]
  );

  const canInvite = isVirtualLabAdmin || isProjectAdmin;

  return (
    <div
      className="flex h-full min-h-0 flex-col rounded-2xl bg-white w-full p-7 px-0"
      id="workspace-manager-project-members-container"
      data-testid="workspace-manager-project-members-container"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 w-full mb-8">
        <div className="secondary-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto w-full pr-3">
          <SimpleGrid<Member>
            columns={columns}
            rows={orderedUsers}
            getRowId={(record) => record.id ?? record.email}
            hideHeader
            className={cn(
              'h-full min-h-0 bg-white',
              '[&_.ag-root-wrapper]:border-0 [&_.ag-row]:border-0'
            )}
          />
        </div>
      </div>
      {canInvite && (
        <div className="flex justify-end w-full mt-auto px-7">
          <GhostRoundedIconButton
            icon={<PlusOutlined />}
            label="Add member"
            onClick={onInviteMemberClick}
            classNames={{ root: 'w-max' }}
            data-testid="workspace-manager-project-add-member-btn"
          />
        </div>
      )}
    </div>
  );
}

const ProjectMembersSteps = {
  Listing: 'listing',
  Invite: 'invite',
} as const;

type TProjectMembersStep = (typeof ProjectMembersSteps)[keyof typeof ProjectMembersSteps];

function ProjectMembersPanel({
  targetProjectId,
  targetVirtualLabId,
}: {
  targetProjectId: string;
  targetVirtualLabId: string;
}) {
  const [currentStep, setCurrentStep] = useState<TProjectMembersStep>(ProjectMembersSteps.Listing);

  const handleInviteMemberClick = () => setCurrentStep(ProjectMembersSteps.Invite);
  const handleBackToListing = () => setCurrentStep(ProjectMembersSteps.Listing);

  return match(currentStep)
    .with(ProjectMembersSteps.Listing, () => (
      <div className="flex h-full min-h-0 flex-col">
        <ProjectMembersListing
          onInviteMemberClick={handleInviteMemberClick}
          targetVirtualLabId={targetVirtualLabId}
          targetProjectId={targetProjectId}
        />
      </div>
    ))
    .with(ProjectMembersSteps.Invite, () => (
      <div className="animate-fade-in flex h-full min-h-0 flex-col">
        <ProjectInviteMembers
          onBack={handleBackToListing}
          targetVirtualLabId={targetVirtualLabId}
          targetProjectId={targetProjectId}
        />
      </div>
    ))
    .otherwise(() => null);
}

function ProjectResolvedContent({
  activeSection,
  targetProjectId,
  targetVirtualLabId,
  onClose,
}: {
  activeSection: string;
  targetProjectId?: string;
  targetVirtualLabId?: string;
  onClose: () => void;
}) {
  if (activeSection === 'members' && targetProjectId && targetVirtualLabId) {
    return (
      <div
        data-testid="workspace-manager-project-members-section"
        id="workspace-manager-project-members-section"
        className="h-full grow overflow-hidden"
      >
        <ProjectMembersPanel
          targetProjectId={targetProjectId}
          targetVirtualLabId={targetVirtualLabId}
        />
      </div>
    );
  }

  if (
    activeSection === WorkspaceManagerSectionDict.Activities &&
    targetProjectId &&
    targetVirtualLabId
  ) {
    return (
      <div
        data-testid="workspace-manager-project-activities-section"
        id="workspace-manager-project-activities-section"
        className="h-full grow overflow-hidden"
      >
        <ProjectActivities
          card={false}
          showTitle={false}
          targetProjectId={targetProjectId}
          targetVirtualLabId={targetVirtualLabId}
          onNavigate={onClose}
        />
      </div>
    );
  }

  if (targetProjectId && targetVirtualLabId) {
    return (
      <div
        data-testid="workspace-manager-project-overview-section"
        id="workspace-manager-project-overview-section"
        className="h-full grow overflow-hidden"
      >
        <ProjectOverviewPanel
          targetProjectId={targetProjectId}
          targetVirtualLabId={targetVirtualLabId}
        />
      </div>
    );
  }

  return null;
}

export type TActiveSection =
  | Extract<TWorkspaceManagerSection, 'overview' | 'members' | 'activities'>
  | 'new';
type Props = {
  activeSection: TActiveSection;
  onClose: () => void;
  targetProjectId?: string;
  targetVirtualLabId?: string;
};
export function ProjectContent({
  activeSection,
  onClose,
  targetProjectId,
  targetVirtualLabId,
}: Props) {
  if (activeSection === 'new') {
    return (
      <div
        data-testid="workspace-manager-project-new-section"
        id="workspace-manager-project-new-section"
        className="h-full grow overflow-hidden"
      >
        <ProjectCreation
          key={`project-creation-${targetVirtualLabId}`}
          fixedVirtualLabId={targetVirtualLabId}
          onClose={onClose}
          showVirtualLabSelect={!targetVirtualLabId}
        />
      </div>
    );
  }

  return (
    <ProjectResolvedContent
      activeSection={activeSection}
      targetProjectId={targetProjectId}
      targetVirtualLabId={targetVirtualLabId}
      onClose={onClose}
    />
  );
}
