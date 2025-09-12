/* eslint-disable no-nested-ternary */

'use client';

import { ComponentProps, ReactNode, useEffect, useState, useTransition } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@bprogress/next/app';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  EditOutlined,
  LoadingOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Form } from 'antd';

import Link from 'next/link';
import z from 'zod';

import { updateVirtualLab, checkVirtualLabExists } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { updateProject, checkProjectExists } from '@/api/virtual-lab-svc/queries/project';
import { setUserRecentWorkspace } from '@/api/virtual-lab-svc/queries/user';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useAppNotification } from '@/components/notification';
import { ROOT_ROUTE } from '@/config';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';
import { Card, CardContent } from '@/ui/molecules/card';
import { Button } from '@/ui/molecules/button';
import { Input } from '@/ui/molecules/input';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

export type Props = {
  virtualLabId: string;
  virtualLabName: string;
  projectName: string;
  projectId: string;
};

const virtualLabNameSchema = z
  .string({ message: 'Please enter your virtual lab name' })
  .min(2, { message: 'Please enter your virtual lab name' })
  .max(80, { message: 'Please enter your virtual lab name' })
  .superRefine(async (name, ctx) => {
    try {
      const exists = await checkVirtualLabExists({ name });
      if (exists) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Another virtual lab with same name already exists, Please use a different name.',
        });
      }
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Failed to validate virtual lab name',
      });
    }
  });

const projectNameSchema = z
  .string({ message: 'Please enter your project name' })
  .min(2, { message: 'Please enter your project name' })
  .max(80, { message: 'Please enter your project name' });

export const createProjectNameSchema = (virtualLabId: string) =>
  projectNameSchema.superRefine(async (name, ctx) => {
    try {
      const exists = await checkProjectExists({ vlabId: virtualLabId, name });
      if (exists) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'You already have a project with this name',
        });
      }
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Failed to validate project name',
      });
    }
  });

export const FinalFormSchema = z.object({
  virtual_lab_name: virtualLabNameSchema,
  project_name: projectNameSchema,
});

type FinalFormType = z.infer<typeof FinalFormSchema>;

function CustomInput({
  value = '',
  disabled = false,
  onEdit,
  name,
  extra,
  ...rest
}: ComponentProps<'input'> & {
  extra?: ReactNode;
  onEdit?: () => void;
}) {
  const form = Form.useFormInstance();
  const field = Form.useWatch(name, form);
  const hasError = !!form.getFieldError(name).length;
  const validating = form.isFieldValidating(name);

  return (
    <div className="relative">
      <Input
        value={value}
        disabled={disabled}
        className={cn(
          'border-neutral-1 text-primary-9! h-auto rounded-full bg-white py-2.5! pr-10 pl-4 shadow-sm md:text-base lg:py-3 lg:text-lg',
          'placeholder:text-sm placeholder:font-light disabled:font-black disabled:opacity-70',
          'focus-visible:text-primary-9! font-black! focus-visible:font-bold!'
        )}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...rest}
      />
      <span className="absolute top-1/2 right-5 -translate-y-1/2 transform">
        {(() => {
          if (disabled) {
            return (
              <EditOutlined
                className="text-neutral-3! hover:text-primary-7! cursor-pointer"
                onClick={onEdit}
              />
            );
          }
          if (!validating && field && !hasError) {
            return <CheckCircleFilled className="text-lg text-green-500" />;
          }
          if (hasError && !validating) {
            return <CloseCircleFilled className="text-lg text-red-500" />;
          }
          if (extra) {
            return extra;
          }
          return null;
        })()}
      </span>
    </div>
  );
}

export function WorkspaceCustomization({
  virtualLabId,
  projectId,
  virtualLabName,
  projectName,
}: Props) {
  const breakpoint = useDefaultBreakpoint();
  const { error: notifyError } = useAppNotification();
  const { replace } = useRouter();
  const [isTransitioning, startTransition] = useTransition();
  const [editableField, setEditableField] = useState<{
    virtual_lab_name: boolean;
    project_name: boolean;
  }>({
    virtual_lab_name: false,
    project_name: false,
  });
  const [form] = Form.useForm();
  const [submittable, setSubmittable] = useState<boolean>(true);
  const values = Form.useWatch([], form);

  useEffect(() => {
    if (!editableField.project_name && !editableField.virtual_lab_name) {
      setSubmittable(true);
      return;
    }

    if (editableField.project_name || editableField.virtual_lab_name) {
      form
        .validateFields({ validateOnly: true })
        .then(() => setSubmittable(true))
        .catch(() => setSubmittable(false));
    }
  }, [form, values, editableField]);

  const handleEdit = (fieldName: keyof typeof editableField) => {
    setEditableField((prev) => ({
      ...prev,
      [fieldName]: true,
    }));
  };

  const mutateVirtualLab = useMutation({
    mutationFn: async ({ vlabName }: { vlabName: string }) => {
      await updateVirtualLab({
        virtualLabId,
        updatePayload: { name: vlabName },
      });
    },
    onError(error, variables) {
      notifyError({
        message: <h2 className="text-primary-9">{variables.vlabName}</h2>,
        description: (
          <p className="text-primary-9">{error.message ?? 'Failed to update virtual lab name'}</p>
        ),
        placement: 'topRight',
        key: 'virtual-lab-name-update-error',
      });
    },
  });

  const mutateProject = useMutation({
    mutationFn: async ({ projName }: { projName: string }) => {
      await updateProject({ virtualLabId, projectId, payload: { name: projName } });
    },
    onError(error, variables) {
      notifyError({
        message: <h2 className="text-primary-9">{variables.projName}</h2>,
        description: (
          <p className="text-primary-9">{error.message ?? 'Failed to update project name'}</p>
        ),
      });
    },
  });

  const mutateRecentWorkspace = useMutation({
    mutationFn: () => setUserRecentWorkspace({ workspace: { virtualLabId, projectId } }),
    onError(error, variables) {
      log('error', error, variables);
    },
  });

  const onSubmitForm = async (_values: FinalFormType) => {
    if (editableField.virtual_lab_name) {
      await mutateVirtualLab.mutateAsync({ vlabName: _values.virtual_lab_name });
    }
    if (editableField.project_name) {
      await mutateProject.mutateAsync({ projName: _values.project_name });
    }
    await mutateRecentWorkspace.mutateAsync();

    startTransition(() => {
      replace(`${ROOT_ROUTE}/${virtualLabId}/${projectId}`, {
        showProgress: true,
      });
    });
  };

  const pending = mutateProject.isPending || mutateVirtualLab.isPending || isTransitioning;
  const disabled = pending || !submittable;

  return (
    <HydrateWrapper>
      <div className="w-full max-w-md space-y-2">
        <div className="text-neutral-2 flex items-center justify-center gap-2 select-none">
          <span className="text-[#8C8C8C]">Account</span>
          <RightOutlined className="text-sm" />
          <span className="text-primary-9 font-bold">Virtual Lab</span>
        </div>
        <Card className="flex w-full flex-col bg-transparent shadow-none backdrop-blur-sm">
          <div className="mx-auto mb-2 flex w-full max-w-sm items-start justify-center gap-3 px-1.5">
            <CheckCircleFilled className="mt-1.5 flex-shrink-0 text-green-600" />
            <p className="text-primary-9 text-left">
              Congratulations! Your virtual lab{' '}
              <strong className="font-bold">{virtualLabName}</strong> has been created. We have
              created for you your first project. It means that you are ready to go!
            </p>
          </div>
          <CardContent>
            <Form<FinalFormType>
              form={form}
              name="final-form-flow-step"
              layout="vertical"
              className={cn(
                'relative flex h-full grow flex-col px-4 py-2 [&_.ant-form-item-explain-error]:pl-2',
                '[&_.ant-form-item-explain-error]:text-sm xl:[&_.ant-form-item-explain-error]:text-base',
                '[&_.ant-form-item-label]:pb-0!'
              )}
              requiredMark={false}
              initialValues={{
                virtual_lab_name: virtualLabName,
                project_name: projectName,
              }}
              onFinish={onSubmitForm}
              validateTrigger={['onChange']}
            >
              <Form.Item
                validateDebounce={500}
                validateTrigger={['onChange']}
                name="virtual_lab_name"
                className="flex-1"
                label={<span className="block text-sm text-[#8C8C8C]">Virtual lab name</span>}
                rules={[
                  {
                    validator: async (_rule, value: string) => {
                      if (value.trim() !== virtualLabName) {
                        try {
                          await virtualLabNameSchema.parseAsync(value);
                        } catch (error) {
                          return Promise.reject(
                            error instanceof z.ZodError
                              ? error.errors.at(0)?.message
                              : 'Virtual lab name is required !'
                          );
                        }
                        return Promise.resolve();
                      }
                    },
                  },
                ]}
              >
                <CustomInput
                  placeholder="Enter your virtual lab name"
                  disabled={!editableField.virtual_lab_name}
                  onEdit={() => handleEdit('virtual_lab_name')}
                  name="virtual_lab_name"
                  extra={
                    mutateVirtualLab.isPending ? (
                      <LoadingOutlined />
                    ) : mutateVirtualLab.isSuccess ? (
                      <CheckCircleFilled className="text-secondary-3" />
                    ) : null
                  }
                />
              </Form.Item>
              <Form.Item
                validateDebounce={500}
                validateTrigger={['onChange']}
                name="project_name"
                className="flex-1"
                label={<span className="block text-sm text-[#8C8C8C]">Project name</span>}
                rules={[
                  {
                    validator: async (_rule, value: string) => {
                      if (value.trim() !== projectName) {
                        const projectNameSchemaWithValidation =
                          createProjectNameSchema(virtualLabId);
                        try {
                          await projectNameSchemaWithValidation.parseAsync(value);
                        } catch (error) {
                          return Promise.reject(
                            error instanceof z.ZodError
                              ? error.errors.at(0)?.message
                              : 'Project name is required !'
                          );
                        }
                        return Promise.resolve();
                      }
                    },
                  },
                ]}
              >
                <CustomInput
                  placeholder="Enter your project name"
                  disabled={!editableField.project_name}
                  name="project_name"
                  onEdit={() => handleEdit('project_name')}
                  extra={
                    mutateProject.isPending ? (
                      <LoadingOutlined />
                    ) : mutateProject.isSuccess ? (
                      <CheckCircleFilled className="text-secondary-3" />
                    ) : null
                  }
                />
              </Form.Item>
              <Form.Item className="mt-5">
                <Button
                  rounded
                  variant="success"
                  size={breakpoint === 'xl' ? 'lg' : 'md'}
                  type="submit"
                  className="disabled:bg-neutral-1 disabled:text-neutral-4! w-full px-8! py-6! font-bold hover:text-white"
                  disabled={disabled}
                >
                  <div className="flex items-center justify-center gap-3.5">
                    <span>Go to project</span>
                    {pending && <LoadingOutlined spin />}
                  </div>
                </Button>
              </Form.Item>
            </Form>
          </CardContent>
        </Card>

        <div className="w-full">
          <p className="mb-2 text-left text-sm text-[#8C8C8C]">Just before you go</p>
          <div className="grid justify-items-stretch gap-4 md:grid-cols-2">
            <Link href="/">
              <Card
                borderless
                className="h-full cursor-pointer bg-white/95 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl"
              >
                <CardContent>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs tracking-wide text-[#8C8C8C] uppercase">Video</span>
                  </div>
                  <h3 className="text-xl leading-tight font-bold text-blue-900">
                    How to use the OBI platform?
                  </h3>
                </CardContent>
              </Card>
            </Link>

            <Link href="/">
              <Card
                borderless
                className="h-full cursor-pointer bg-white/95 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl"
              >
                <CardContent>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs tracking-wide text-[#8C8C8C] uppercase">Guides</span>
                  </div>
                  <h3 className="text-xl leading-tight font-bold text-blue-900">
                    How to launch workflows?
                  </h3>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </HydrateWrapper>
  );
}
