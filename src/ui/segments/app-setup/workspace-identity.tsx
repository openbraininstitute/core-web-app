'use client';

import { EditOutlined, InfoCircleOutlined, RightOutlined } from '@ant-design/icons';
import { Form, Popover } from 'antd';
import { type ComponentProps, type ReactNode, useEffect, useState } from 'react';
import z from 'zod';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { Card, CardContent } from '@/ui/molecules/card';
import { Input } from '@/ui/molecules/input';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import type { RuleObject } from 'antd/es/form';
import type { TResolvedWorkspace } from '@/ui/segments/app-setup/helpers';

export const WorkspaceIdentitySchema = z.object({
  name: z.string({ message: 'Virtual lab name is required' }).min(1),
  first_name: z
    .string({ message: 'Please enter your first name' })
    .min(1, { message: 'First name is required' })
    .describe('first name of the user'),
  last_name: z
    .string({ message: 'Please enter your last name' })
    .min(1, { message: 'Last name is required' })
    .describe('last name of the user'),
  entity: z
    .string({ message: 'Please enter your affiliation' })
    .nonempty({ message: 'Affiliation is required' })
    .describe('entity or organization associated with the virtual lab'),
});

export type TWorkspaceIdentitySchema = z.infer<typeof WorkspaceIdentitySchema>;

function CustomInput({
  value = '',
  disabled = false,
  onEdit,
  extra,
  editable = true,
  ...rest
}: ComponentProps<'input'> & {
  extra?: ReactNode;
  editable?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="relative">
      <Input
        value={value}
        disabled={disabled}
        className={cn(
          'border-neutral-1 h-auto rounded-full bg-white py-2.5! pr-10 pl-4 shadow-sm md:text-base lg:py-3 lg:text-lg',
          'placeholder:text-sm placeholder:font-light disabled:font-black disabled:opacity-70',
          'focus-visible:text-primary-8! font-black! focus-visible:font-bold! text-primary-8!',
          rest.className
        )}
        {...rest}
      />
      <span className="absolute top-1/2 right-5 -translate-y-1/2 transform">
        {extra ??
          (editable && (
            <EditOutlined
              className="text-neutral-3! hover:text-primary-7! cursor-pointer"
              onClick={onEdit}
            />
          ))}
      </span>
    </div>
  );
}

export function WorkspaceIdentity({
  data,
  move,
}: {
  data: TResolvedWorkspace;
  move: (v: TWorkspaceIdentitySchema & { name: string }) => void;
}) {
  const breakpoint = useDefaultBreakpoint();
  const [submittable, setSubmittable] = useState<boolean>(false);
  const [form] = Form.useForm<TWorkspaceIdentitySchema>();
  const formValues = Form.useWatch([], form);

  const [editableField, setEditableField] = useState<{
    firstName: boolean;
    lastName: boolean;
    affiliation: boolean;
  }>({
    firstName: false,
    lastName: false,
    affiliation: false,
  });

  const handleEdit = (fieldName: keyof typeof editableField) => {
    setEditableField((prev) => ({
      ...prev,
      [fieldName]: true,
    }));
  };

  useEffect(() => {
    void formValues;
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, formValues]);

  const fullName =
    [data?.profile?.first_name, data?.profile?.last_name].filter(Boolean).join(' ') ||
    data?.profile?.preferred_username ||
    '';

  const virtualLabName = fullName ? `${fullName}'s Virtual lab` : undefined;

  const onFormSubmit = async (vs: TWorkspaceIdentitySchema) =>
    move({
      ...vs,
      name: `${
        [vs.first_name, vs.last_name].filter(Boolean).join(' ') ||
        data?.profile?.preferred_username ||
        ''
      }'s virtual lab`,
    });

  return (
    <HydrateWrapper>
      <div className="relative z-10 mx-auto flex h-screen w-screen flex-col items-center justify-center md:mt-0">
        <div className="text-neutral-2 flex items-center justify-center gap-2">
          <span className="text-primary-9 font-bold">Account</span>
          <RightOutlined className="text-sm" />
          <span className="text-[#8C8C8C]">Virtual Lab</span>
        </div>
        <div className="flex items-center justify-center">
          <div className="scale-100 transform opacity-100 transition-all duration-500 ease-in-out">
            <Form
              name="virtual-lab-creation-flow-step"
              form={form}
              layout="vertical"
              onFinish={onFormSubmit}
              className={cn(
                'relative flex h-full grow flex-col px-4 py-2 [&_.ant-form-item-explain-error]:pl-2',
                '[&_.ant-form-item-explain-error]:text-sm! [&_.ant-form-item-explain-error]:select-none',
                '[&_.ant-form-item-label]:pb-0!'
              )}
              requiredMark={false}
              initialValues={{
                first_name: data?.profile?.first_name ?? undefined,
                last_name: data?.profile?.last_name ?? undefined,
                entity: undefined,
                name: virtualLabName,
              }}
              validateTrigger={['onBlur']}
            >
              <Card className="mr-4 ml-4 flex w-full max-w-lg min-w-lg flex-col bg-transparent shadow-none backdrop-blur-sm">
                <CardContent>
                  <Form.Item hidden name="name">
                    <input
                      name="name"
                      value={virtualLabName}
                      type="text"
                      hidden
                      defaultValue={virtualLabName}
                    />
                  </Form.Item>
                  <Form.Item
                    name="first_name"
                    className="flex-1"
                    label={
                      <span className="block text-sm text-[#8C8C8C]">
                        First name <sup className="text-red-500">*</sup>
                      </span>
                    }
                    rules={[
                      {
                        validator: async (_rule: RuleObject, value: string) => {
                          try {
                            await WorkspaceIdentitySchema.pick({
                              first_name: true,
                            }).shape.first_name.parseAsync(value);
                          } catch (error) {
                            return Promise.reject(
                              error instanceof z.ZodError
                                ? error.issues.at(0)?.message
                                : 'First name is required'
                            );
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <CustomInput
                      placeholder="Enter your first name"
                      disabled={!editableField.firstName}
                      onEdit={() => handleEdit('firstName')}
                    />
                  </Form.Item>
                  <Form.Item
                    name="last_name"
                    className="flex-1"
                    label={
                      <span className="block text-sm text-[#8C8C8C]">
                        Last name <sup className="text-red-500">*</sup>
                      </span>
                    }
                    rules={[
                      {
                        validator: async (_rule: RuleObject, value: string) => {
                          try {
                            await WorkspaceIdentitySchema.pick({
                              last_name: true,
                            }).shape.last_name.parseAsync(value);
                          } catch (error) {
                            return Promise.reject(
                              error instanceof z.ZodError
                                ? error.issues.at(0)?.message
                                : 'Last name is required'
                            );
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <CustomInput
                      placeholder="Enter your last name"
                      disabled={!editableField.lastName}
                      onEdit={() => handleEdit('lastName')}
                    />
                  </Form.Item>
                  <Form.Item
                    label={
                      <div className="flex items-center gap-2">
                        <span className="block text-sm text-[#8C8C8C]">Affiliation</span>
                        <Popover
                          placement="top"
                          trigger="hover"
                          classNames={{
                            root: cn(
                              '[&_.ant-popover-inner]:p-0! [&_.ant-popover-inner]:bg-primary-8! max-w-[260px]',
                              '[&_.ant-popover-arrow:before]:bg-primary-8!'
                            ),
                          }}
                          content={
                            <div className="bg-primary-8 flex flex-col items-center justify-center gap-4 rounded-lg px-5 py-3 text-white">
                              Organization, University, Company
                            </div>
                          }
                        >
                          <InfoCircleOutlined className="text-[#8C8C8C]!" />
                        </Popover>
                      </div>
                    }
                    className="w-full flex-1"
                    name="entity"
                    rules={[
                      {
                        validator: async (_rule: RuleObject, value: string) => {
                          try {
                            await WorkspaceIdentitySchema.pick({
                              entity: true,
                            }).shape.entity.parseAsync(value);
                          } catch (error) {
                            return Promise.reject(
                              error instanceof z.ZodError
                                ? error.issues.at(0)?.message
                                : 'Affiliation is required'
                            );
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <CustomInput
                      placeholder="Enter your affiliation here..."
                      disabled={false}
                      editable={false}
                    />
                  </Form.Item>
                </CardContent>
              </Card>
              <div className="mt-6 text-center">
                <Button
                  rounded
                  size={breakpoint === 'xl' ? 'lg' : 'md'}
                  type="submit"
                  variant="success"
                  className="disabled:bg-neutral-1 disabled:text-neutral-4! hover:disabled:border-neutral-4! h-auto px-8! py-3! font-bold disabled:hover:border"
                  disabled={!submittable}
                >
                  Create virtual lab
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </HydrateWrapper>
  );
}
