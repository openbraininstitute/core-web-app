/* eslint-disable no-nested-ternary */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, ConfigProvider, Input } from 'antd';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  InfoCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

import { makeTriggerWorkspaceConfigurationClickEvent } from '@/ui/segments/workspaces/space-manager/event';
import { checkProjectExists, createProject } from '@/api/virtual-lab-svc/queries/project';
import { setUserRecentWorkspace } from '@/api/virtual-lab-svc/queries/user';
import { useAppNotification } from '@/components/notification';
import { ProjectPayload } from '@/api/virtual-lab-svc/types';
import { config } from '@/config';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

export function CreationForm() {
  const { virtualLabId } = useWorkspace();
  const { success: notifySuccess, error: notifyError } = useAppNotification();
  const queryClient = useQueryClient();

  const { push: navigate } = useRouter();
  const [form] = Form.useForm<ProjectPayload & { virtual_lab_id: string }>();

  const mutateRecentWorkspace = useMutation({
    mutationFn: ({ vlabId, prjId }: { vlabId: string; prjId: string }) =>
      setUserRecentWorkspace({ workspace: { virtualLabId: vlabId, projectId: prjId } }),
  });

  const { isPending, mutateAsync } = useMutation({
    mutationKey: [virtualLabId, 'create-project'],
    mutationFn: async (values: ProjectPayload) => createProject(virtualLabId, values),
    onError(error) {
      if (error) {
        notifyError({
          message: 'Project creation failed. Please check your details and try again.',
          placement: 'topRight',
        });
      }
    },
    onSuccess(data, variables) {
      mutateRecentWorkspace.mutate({ vlabId: virtualLabId, prjId: data.data?.project.id! });
      notifySuccess({
        message: `Your Project ${variables.name} has been created successfully and is now ready to use.`,
        placement: 'topRight',
      });
    },
    onSettled: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.listWorkspaceProjects({ virtualLabId }),
      });
      if (result && result.data?.project) {
        const virLabId = result.data.project.virtual_lab_id;
        const projectId = result.data.project.id;
        navigate(`${config.ROOT_ROUTE}/${virLabId}/${projectId}`);
        makeTriggerWorkspaceConfigurationClickEvent({ on: false, data: null, type: null });
      }
    },
  });

  const onFormSubmit = async (values: ProjectPayload) => {
    await mutateAsync(values);
  };

  const [validName, setValidName] = useState<{
    loading: boolean;
    status: 'valid' | 'non-valid' | null;
  }>({
    loading: false,
    status: null,
  });
  const nameRef = useRef<string | null>(null);
  return (
    <ConfigProvider theme={{ hashed: false }}>
      <Form
        name="project-creation-flow"
        form={form}
        layout="vertical"
        onFinish={onFormSubmit}
        className="flex h-full flex-col p-2"
        requiredMark={false}
        validateTrigger={['onChange']}
        initialValues={{
          name: '',
          description: '',
          include_members: [],
        }}
        disabled={isPending}
      >
        <div className="relative flex flex-col">
          {virtualLabId && (
            <Form.Item hidden name="virtual_lab_id">
              <input name="virtual_lab_id" type="text" value={virtualLabId} hidden />
            </Form.Item>
          )}
          <Form.Item
            validateDebounce={800}
            label={<span className="font-semibold text-white">Project&#39;s Name</span>}
            name="name"
            className="w-full"
            rules={[
              { required: true, message: 'Please enter project name' },
              {
                max: 60,
                message: 'Project name cannot exceed 60 characters',
              },
              {
                validator: async (_: any, name: string) => {
                  if (name === nameRef.current) return;
                  if (!name?.trim()) {
                    setValidName({ loading: false, status: 'non-valid' });
                    return Promise.reject();
                  }
                  nameRef.current = name;
                  try {
                    setValidName({ loading: true, status: null });
                    const exists = await checkProjectExists({ vlabId: virtualLabId, name });
                    if (exists) {
                      setValidName({ loading: false, status: 'non-valid' });
                      return Promise.reject(new Error(`This project name is already taken.`));
                    }
                    setValidName({ loading: false, status: 'valid' });
                    return Promise.resolve();
                  } catch (error) {
                    setValidName({ loading: false, status: 'non-valid' });
                  }
                },
              },
            ]}
          >
            <Input
              autoComplete="off"
              size="large"
              placeholder="Enter your project's name here..."
              className={cn(
                'border-primary-3 rounded-none border-0 border-b px-3 text-white! focus:ring-0 [&_input]:placeholder:text-sm',
                'focus:border-primary-4 hover:border-primary-4 [&_input]:placeholder:text-primary-4! focus:border-b-2',
                'focus-within:border-primary-4! focus-within:border-b-2! focus-within:ring-0!',
                '[&.ant-input-status-error]:border-0! [&.ant-input-status-error]:border-b-2! [&.ant-input-status-error]:border-red-300!',
                'bg-primary-9! focus-within:[&_input]:text-white! [&.ant-input-status-error]:focus:ring-0!',
                '[&_.ant-input-disabled]:opacity-40!'
              )}
              suffix={
                validName.loading ? (
                  <LoadingOutlined className="text-primary-4 text-base" />
                ) : validName.status === 'valid' ? (
                  <CheckCircleFilled className="text-accent-light text-base" />
                ) : validName.status === 'non-valid' ? (
                  <CloseCircleFilled className="text-destructive text-base" />
                ) : (
                  <span />
                )
              }
            />
          </Form.Item>
          <Form.Item
            label={<span className="font-semibold text-white">Description</span>}
            name="description"
            rules={[
              {
                max: 600,
                message: 'Project description cannot exceed 600 characters',
              },
            ]}
          >
            <Input.TextArea
              rows={4}
              autoComplete="off"
              size="large"
              className={cn(
                'border-primary-3 rounded-md px-3 text-white! focus:ring-0',
                'focus:border-primary-4 hover:border-primary-4 placeholder:text-primary-4! placeholder:text-sm focus:border-b-2',
                'focus-within:border-primary-4! focus-within:border-b-2! focus-within:ring-0!',
                '[&.ant-input-status-error]:border-0! [&.ant-input-status-error]:border-b-2! [&.ant-input-status-error]:border-red-300!',
                'bg-primary-9! focus-within:text-white! [&.ant-input-status-error]:focus:ring-0!',
                'disabled:opacity-40'
              )}
              placeholder="Write your description here"
            />
          </Form.Item>
        </div>
        <div className="mt-4 flex w-full items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <InfoCircleOutlined className="text-primary-4 mt-1.5 text-lg" />
            <p className="text-base text-white">
              You will be able to add members and credits later to your projects through the project{' '}
              <br />
              home page section members and credits.
            </p>
          </div>
          <Button
            rounded
            type="submit"
            variant="default"
            size="lg"
            className={cn(
              'border-primary-4! w-max border shadow-2xl',
              'hover:bg-primary-8/40',
              'hover:shadow-[1px_2px_4px_0px_#00000099]',
              'shadow-[8px_12px_24px_0px_#00000099]',
              'shadow-[-8px_-8px_42px_0px_#FFFFFF29]'
            )}
            disabled={isPending}
          >
            <div className="flex items-center gap-2 px-6">
              Create project
              {isPending && <LoadingOutlined className="ml-2 text-white" />}
            </div>
          </Button>
        </div>
      </Form>
    </ConfigProvider>
  );
}
