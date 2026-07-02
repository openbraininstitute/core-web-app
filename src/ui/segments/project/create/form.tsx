'use client';

import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select } from 'antd';
import { get } from 'es-toolkit/compat';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { checkProjectExists, createProject } from '@/api/virtual-lab-svc/queries/project';
import { setUserRecentWorkspace } from '@/api/virtual-lab-svc/queries/user';
import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { notify } from '@/components/notification';
import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Label, XInput } from '@/ui/segments/profile/sections/profile-form/elements';
import { makeTriggerWorkspaceConfigurationClickEvent } from '@/ui/segments/workspaces/space-manager/event';
import { GhostRoundedIconButton } from '@/ui/segments/workspaces/space-manager/sections/elements';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

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

  const queryClient = useQueryClient();

  const { push: navigate } = useRouter();
  const [form] = Form.useForm<ProjectCreationFormValues>();

  useEffect(() => {
    if (!showVirtualLabSelect && selectedVirtualLabId) {
      form.setFieldsValue({ virtual_lab_id: selectedVirtualLabId });
    }
  }, [form, showVirtualLabSelect, selectedVirtualLabId]);

  const filters = {
    scope: 'all',
    order_by: 'owner',
    order_direction: 'desc',
    admin_access_only: true,
  } as const;

  const { data: virtualLabs, isLoading: virtualLabsLoading } = useQuery({
    queryKey: keyBuilder.listTenantVirtualLabs({ filters }),
    queryFn: () => listVirtualLabs({ filters }),
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
      const code = get(error, 'cause.code', 'DEFAULT');
      const description = {
        LIMIT_EXCEEDED:
          'You have reached the maximum number of projects allowed. Please delete an existing project or contact support for more details.',
        DEFAULT: 'Project creation failed. Please check your details and try again.',
      };
      if (error) {
        notify.error({
          title: 'Error creating project',
          description: description[code],
          key: 'create-project-error',
        });
      }
    },
    onSuccess(data, variables) {
      if (data.id) {
        mutateRecentWorkspace.mutate({
          vlabId: variables.virtual_lab_id,
          prjId: data.id,
        });
      }
      notify.success({
        title: 'Project created',
        description: `Your Project ${variables.name} has been created successfully and is now ready to use.`,
      });
    },
    onSettled: async (result) => {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as [string, { virtualLabId?: string }];
          const [key, params] = queryKey;
          return key === `workspace/projects-list` && params?.virtualLabId === selectedVirtualLabId;
        },
      });
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as [string, { virtualLabId?: string }];
          const [key] = queryKey;
          return key === 'workspace/list-filtered-virtual-labs';
        },
      });
      if (result?.id) {
        const virLabId = result.virtual_lab_id;
        const projectId = result.id;
        makeTriggerWorkspaceConfigurationClickEvent({ on: false, data: null, type: null });
        navigate(`${config.ROOT_ROUTE}/${virLabId}/${projectId}`);
      }
    },
  });

  const onFormSubmit = async (values: ProjectCreationFormValues) => {
    const virtual_lab_id = showVirtualLabSelect
      ? values.virtual_lab_id
      : (selectedVirtualLabId ?? values.virtual_lab_id);
    if (!virtual_lab_id) return;
    await mutateAsync({ ...values, virtual_lab_id });
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
  const resolvedVirtualLabId = showVirtualLabSelect
    ? values?.virtual_lab_id
    : (selectedVirtualLabId ?? values?.virtual_lab_id);
  const requiredFilled = !!values?.name?.trim() && !!resolvedVirtualLabId;
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
        virtual_lab_id: undefined,
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
              options={(virtualLabs?.data ?? []).map((lab) => ({
                label: lab.name,
                value: lab.id,
              }))}
            />
          </Form.Item>
        ) : (
          <Form.Item name="virtual_lab_id" hidden>
            <Input type="hidden" />
          </Form.Item>
        )}
        <Form.Item
          validateDebounce={800}
          label={<Label title="Project&#39;s Name" className="text-primary-9" required />}
          name="name"
          className="w-full"
          dependencies={['virtual_lab_id']}
          rules={[
            { required: true, message: 'Please enter project name' },
            {
              max: 60,
              message: 'Project name cannot exceed 60 characters',
            },
            {
              validator: async (_rule: unknown, name: string) => {
                if (!name?.trim()) {
                  setValidName({ loading: false, status: 'non-valid' });
                  return Promise.reject();
                }
                const virtualLabIdForCheck = showVirtualLabSelect
                  ? form.getFieldValue('virtual_lab_id')
                  : (selectedVirtualLabId ?? form.getFieldValue('virtual_lab_id'));

                if (!virtualLabIdForCheck) {
                  setValidName({ loading: false, status: 'non-valid' });
                  return Promise.reject(new Error('Please select a virtual lab first.'));
                }

                const validationCacheKey = `${virtualLabIdForCheck}::${name.trim()}`;
                if (validationCacheKey === nameRef.current) {
                  return Promise.resolve();
                }

                setValidName({ loading: true, status: null });
                try {
                  const exists = await checkProjectExists({ vlabId: virtualLabIdForCheck, name });
                  if (exists) {
                    setValidName({ loading: false, status: 'non-valid' });
                    return Promise.reject(new Error('This project name is already taken.'));
                  }
                  nameRef.current = validationCacheKey;
                  setValidName({ loading: false, status: 'valid' });
                  return Promise.resolve();
                } catch (err) {
                  nameRef.current = null;
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
