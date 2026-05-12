'use client';

import { EditOutlined, LoadingOutlined } from '@ant-design/icons';
import { RiRestartLine } from '@remixicon/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import { getVirtualLab, updateVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { useAppNotification } from '@/components/notification';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { messages } from '@/i18n/en/virtual-lab';
import { Button } from '@/ui/molecules/button';
import { ErrorSoft } from '@/ui/molecules/feedback-card';
import { createZodFieldValidator } from '@/ui/segments/contribute/shared/helpers';
import { Label, XInput } from '@/ui/segments/profile/sections/profile-form/elements';
import { GhostRoundedIconButton } from '@/ui/segments/workspaces/space-manager/sections/elements';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { TVirtualLab } from '@/api/virtual-lab-svc/queries/types';

export const VirtualLabFormSchema = z.object({
  name: z
    .string({ error: 'Please provide a name!' })
    .trim()
    .min(1, { error: 'Please provide a name!' })
    .max(60, { error: 'Name must be at most 60 characters.' }),
});

export type TVirtualLabFormValues = z.infer<typeof VirtualLabFormSchema>;

type Props = {
  virtualLab: TVirtualLab;
  virtualLabId: string;
};

function VirtualLabOverviewForm({ virtualLab, virtualLabId }: Props) {
  const queryClient = useQueryClient();
  const { error: errorNotify, success: successNotify } = useAppNotification();
  const { isVirtualLabOwner } = useWorkspaceMembership({ virtualLabId });
  const [form] = Form.useForm<TVirtualLabFormValues>();
  const [isEditing, setIsEditing] = useState(false);

  const initialValues = useMemo(
    (): TVirtualLabFormValues => ({ name: virtualLab.name }),
    [virtualLab.name]
  );

  const formValues = Form.useWatch([], form);
  const isValid = VirtualLabFormSchema.safeParse(formValues ?? initialValues).success;

  useEffect(() => {
    if (!isEditing) {
      form.setFieldsValue({ name: virtualLab.name });
    }
  }, [form, isEditing, virtualLab.name]);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (values: TVirtualLabFormValues) =>
      updateVirtualLab({
        virtualLabId,
        updatePayload: { name: values.name.trim() },
      }),
    onSuccess: async () => {
      successNotify({
        message: messages.RenameVirtualLabSucceedTitle,
        description: messages.RenameVirtualLabSucceedDescription,
        placement: 'topRight',
        key: 'virtual-lab-overview-update-success',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keyBuilder.getOneLab({ virtualLabId }) }),
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'workspace/tenants',
        }),
      ]);
      setIsEditing(false);
    },
    onError: () => {
      errorNotify({
        message: messages.RenameVirtualLabFailedTitle,
        description: messages.RenameVirtualLabFailedDescription,
        placement: 'topRight',
        key: 'virtual-lab-overview-update-error',
      });
    },
  });

  const onSubmit = async (values: TVirtualLabFormValues) => {
    await mutateAsync(values);
  };

  const formDisabled = !isEditing || isPending;
  const readOnly = !isEditing;

  return (
    <section className="w-full rounded-2xl bg-white p-7">
      <Form
        id="workspace-manager-virtual-lab-overview-form"
        data-testid="workspace-manager-virtual-lab-overview-form"
        form={form}
        layout="vertical"
        className="profile-form"
        initialValues={initialValues}
        disabled={formDisabled}
        onFinish={onSubmit}
        scrollToFirstError
        autoComplete="false"
        requiredMark={false}
        preserve={false}
        validateTrigger={isEditing ? ['onBlur', 'onChange'] : []}
        rootClassName={cn(
          '[&_.ant-form-item]:mb-0! [&_.ant-form-item-explain-error]:text-sm! ',
          '[&_.ant-form-item-explain-error]:pl-0.5! [&_.ant-form-item-explain-error]:select-none!'
        )}
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-4">
          <Form.Item
            rules={[
              {
                required: true,
                validator: createZodFieldValidator(VirtualLabFormSchema, 'name', form),
              },
            ]}
            className="[&_.ant-form-item-label]:pb-0!"
            name="name"
            label={<Label title="Name" className="text-primary-9" required />}
          >
            <XInput
              id="vl_overview_name"
              name="vl_overview_name"
              type="text"
              maxLength={60}
              plain={readOnly}
            />
          </Form.Item>
        </div>
        {isVirtualLabOwner && (
          <div className="relative mt-10 min-h-14">
            {isEditing ? (
              <div
                key="virtual-lab-overview-form-actions-edit"
                className="absolute inset-y-0 right-0 flex flex-wrap items-center justify-end gap-3"
              >
                <Button
                  rounded
                  type="button"
                  variant="ghost"
                  size="responsive"
                  className="rounded-full px-8 py-2 text-base font-semibold transition-colors"
                  data-testid="workspace-manager-virtual-lab-overview-cancel"
                  id="workspace-manager-virtual-lab-overview-cancel"
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
                  data-testid="workspace-manager-virtual-lab-overview-update"
                  id="workspace-manager-virtual-lab-overview-update"
                  disabled={isPending || !isValid || !isVirtualLabOwner}
                >
                  <div className="flex items-center gap-2 px-6">
                    {isPending && <LoadingOutlined />}
                    Update
                  </div>
                </Button>
              </div>
            ) : (
              <div
                key="virtual-lab-overview-form-actions-view"
                className="absolute inset-y-0 right-0 flex items-center justify-end"
              >
                <GhostRoundedIconButton
                  size="md"
                  icon={<EditOutlined />}
                  label="Edit information"
                  classNames={{ label: 'text-lg font-semibold' }}
                  data-testid="workspace-manager-virtual-lab-overview-edit"
                  id="workspace-manager-virtual-lab-overview-edit"
                  onClick={() => setIsEditing(true)}
                />
              </div>
            )}
          </div>
        )}
      </Form>
    </section>
  );
}

export function VirtualLabOverview({ virtualLabId }: { virtualLabId: string }) {
  const {
    data: labResponse,
    isError,
    refetch,
    isLoading: isLabLoading,
  } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => {
      return getVirtualLab(virtualLabId);
    },
    enabled: Boolean(virtualLabId),
    gcTime: 0,
    staleTime: 0,
  });

  const virtualLab = labResponse?.data?.virtual_lab;

  if (isLabLoading) {
    return (
      <div className="text-primary-9 flex h-40 items-center justify-center">
        <LoadingOutlined spin />
      </div>
    );
  }

  if (isError || !virtualLab) {
    return (
      <ErrorSoft
        title="Unable to load this virtual lab."
        description="We were unable to load this virtual lab. Please try again later."
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
    <div
      className="flex h-full flex-col justify-between"
      data-testid="workspace-manager-virtual-lab-overview-root"
      id="workspace-manager-virtual-lab-overview-root"
    >
      <VirtualLabOverviewForm
        key={virtualLabId}
        virtualLab={virtualLab}
        virtualLabId={virtualLabId}
      />
    </div>
  );
}
