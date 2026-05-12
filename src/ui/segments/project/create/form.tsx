'use client';

import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select } from 'antd';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { checkProjectExists, createProject } from '@/api/virtual-lab-svc/queries/project';
import { setUserRecentWorkspace } from '@/api/virtual-lab-svc/queries/user';
import { listTenantVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { makeTriggerWorkspaceConfigurationClickEvent } from '@/ui/segments/workspaces/space-manager/event';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import { Label, XInput } from '../../profile/sections/profile-form/elements';
import { GhostRoundedIconButton } from '../../workspaces/space-manager/sections/elements';

import type { TProjectPayload } from '@/api/virtual-lab-svc/validation';

type ProjectCreationFormValues = TProjectPayload & { virtual_lab_id: string };

export function CreationForm({
  fixedVirtualLabId,
  showVirtualLabSelect,
}: {
  fixedVirtualLabId?: string;
  showVirtualLabSelect?: boolean;
}) {
  const { virtualLabId } = useWorkspace();
  const selectedVirtualLabId = fixedVirtualLabId ?? virtualLabId;
  const { success: notifySuccess, error: notifyError } = useAppNotification();
  const queryClient = useQueryClient();

  const { push: navigate } = useRouter();
  const [form] = Form.useForm<ProjectCreationFormValues>();

  const queryParams = {
    scope: 'all',
    order_by: 'creation_date',
    order_direction: 'desc',
  } as const;

  const { data: virtualLabs, isLoading: virtualLabsLoading } = useQuery({
    queryKey: keyBuilder.listTenantVirtualLabs(queryParams),
    queryFn: () => listTenantVirtualLabs(queryParams),
    enabled: !!showVirtualLabSelect,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const mutateRecentWorkspace = useMutation({
    mutationFn: ({ vlabId, prjId }: { vlabId: string; prjId: string }) =>
      setUserRecentWorkspace({ workspace: { virtualLabId: vlabId, projectId: prjId } }),
  });

  const { isPending, mutateAsync } = useMutation({
    mutationKey: [selectedVirtualLabId, 'create-project'],
    mutationFn: async (values: ProjectCreationFormValues) => {
      const targetVirtualLabId = values.virtual_lab_id;
      const { virtual_lab_id: _virtualLabId, ...payload } = values;
      return createProject(targetVirtualLabId, payload);
    },
    onError(error) {
      if (error) {
        notifyError({
          message: 'Project creation failed. Please check your details and try again.',
          placement: 'topRight',
        });
      }
    },
    onSuccess(data, variables) {
      if (data.data?.project.id) {
        mutateRecentWorkspace.mutate({
          vlabId: variables.virtual_lab_id,
          prjId: data.data.project.id,
        });
      }
      notifySuccess({
        message: `Your Project ${variables.name} has been created successfully and is now ready to use.`,
        placement: 'topRight',
      });
    },
    onSettled: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.listWorkspaceProjects({
          virtualLabId: form.getFieldValue('virtual_lab_id'),
        }),
      });
      if (result?.data?.project) {
        const virLabId = result.data.project.virtual_lab_id;
        const projectId = result.data.project.id;
        makeTriggerWorkspaceConfigurationClickEvent({ on: false, data: null, type: null });
        navigate(`${config.ROOT_ROUTE}/${virLabId}/${projectId}`);
      }
    },
  });

  const onFormSubmit = async (values: ProjectCreationFormValues) => {
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

  const values = Form.useWatch([], form);
  const hasErrors = form.getFieldsError().some(({ errors }) => errors.length > 0);
  const requiredFilled = !!values?.name?.trim() && !!(fixedVirtualLabId ?? values?.virtual_lab_id);
  const submittable = requiredFilled && !hasErrors && validName.status === 'valid';

  return (
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
        virtual_lab_id: selectedVirtualLabId,
      }}
      disabled={isPending}
    >
      <div className="relative flex flex-col">
        {showVirtualLabSelect ? (
          <Form.Item
            label={<Label title="Virtual Lab" className="text-primary-9" required />}
            name="virtual_lab_id"
            className="w-full"
            rules={[{ required: true, message: 'Please select a virtual lab' }]}
          >
            <Select
              showSearch
              loading={virtualLabsLoading}
              placeholder="Select virtual lab"
              optionFilterProp="label"
              size="large"
              className={cn(
                '[&_.ant-select-selector]:bg-white! [&_.ant-select-selector]:rounded-lg [&_.ant-select-selector]:border-gray-300!',
                '[&_.ant-select-selector]:rounded-gray-200!',
                '[&_.ant-select-selector]:border-b! [&_.ant-select-selection-placeholder]:text-primary-9!',
                '[&_.ant-select-selection-item]:text-primary-9!',
                'placeholder:text-gray-400! placeholder:text-sm! placeholder:font-light!'
              )}
              options={(virtualLabs?.data?.data ?? []).map((lab) => ({
                label: lab.name,
                value: lab.id,
              }))}
            />
          </Form.Item>
        ) : (
          <Form.Item hidden name="virtual_lab_id">
            <input name="virtual_lab_id" type="text" value={selectedVirtualLabId} hidden />
          </Form.Item>
        )}
        <Form.Item
          validateDebounce={800}
          label={<Label title="Project&#39;s Name" className="text-primary-9" required />}
          name="name"
          className="w-full"
          rules={[
            { required: true, message: 'Please enter project name' },
            {
              max: 60,
              message: 'Project name cannot exceed 60 characters',
            },
            {
              validator: async (_rule: unknown, name: string) => {
                if (name === nameRef.current) return;
                if (!name?.trim()) {
                  setValidName({ loading: false, status: 'non-valid' });
                  return Promise.reject();
                }
                nameRef.current = name;
                setValidName({ loading: true, status: null });
                const formVirtualLabId = form.getFieldValue('virtual_lab_id');
                if (!formVirtualLabId) {
                  setValidName({ loading: false, status: 'non-valid' });
                  return Promise.reject(new Error('Please select a virtual lab first.'));
                }
                try {
                  const exists = await checkProjectExists({ vlabId: formVirtualLabId, name });
                  if (exists) {
                    setValidName({ loading: false, status: 'non-valid' });
                    return Promise.reject(new Error('This project name is already taken.'));
                  }
                  setValidName({ loading: false, status: 'valid' });
                  return Promise.resolve();
                } catch (err) {
                  setValidName({ loading: false, status: 'non-valid' });
                  throw err instanceof Error
                    ? err
                    : new Error('Unable to verify project name. Please try again.');
                }
              },
            },
          ]}
        >
          <XInput
            autoComplete="off"
            size="large"
            maxLength={60}
            placeholder="Enter your project's name here..."
            className={cn(
              '[&_.ant-input]:placeholder:text-sm! [&_.ant-input]:placeholder:text-gray-400! [&_.ant-input]:placeholder:font-light'
            )}
            suffix={
              <LoadingOutlined
                className={cn(
                  'text-primary-4 text-base',
                  validName.loading ? 'visible' : 'invisible'
                )}
              />
            }
          />
        </Form.Item>
        <Form.Item
          label={<Label title="Description" className="text-primary-9" />}
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
              'border-gray-300 rounded-lg px-3 text-primary-9! focus:ring-0',
              'focus:border-gray-300 hover:border-gray-300 focus:border-b-2',
              'focus-within:border-gray-300! focus-within:border-b-2! focus-within:ring-0!',
              '[&.ant-input-status-error]:border-0! [&.ant-input-status-error]:border-b-2! [&.ant-input-status-error]:border-red-300!',
              'bg-white! focus-within:text-primary-9! [&.ant-input-status-error]:focus:ring-0!',
              'placeholder:text-gray-400! placeholder:text-sm! placeholder:font-light!',
              'disabled:opacity-40'
            )}
            placeholder="Write your description here"
          />
        </Form.Item>
      </div>
      <div className="mt-4 flex w-full items-end justify-end gap-3">
        <GhostRoundedIconButton
          label="Create project"
          disabled={isPending || !submittable}
          onClick={() => form.submit()}
          icon={isPending ? <LoadingOutlined spin /> : <PlusOutlined />}
          classNames={{
            root: 'bg-primary-9 text-white hover:bg-primary-8 group',
            label: 'text-white',
            iconWrapper: 'bg-primary-9 text-white! group-hover:bg-primary-8!',
          }}
        />
      </div>
    </Form>
  );
}
