/* eslint-disable no-nested-ternary */
/* eslint-disable react/jsx-props-no-spreading */

'use client';

import {
  CheckCircleFilled,
  EditOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { Alert, Form, Popover } from 'antd';
import type { RuleObject } from 'antd/es/form';
import { type ComponentProps, type ReactNode, useEffect, useState } from 'react';
import z from 'zod';
import {
  getEmailVerificationCode,
  verifyOtpCode,
} from '@/api/virtual-lab-svc/queries/email-verification';
import { EmailStatusSchema, type TEmailStatus } from '@/api/virtual-lab-svc/validation';
import { VerificationCode } from '@/components/VirtualLab/create-entity-flows/common/otp-code';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { Card, CardContent } from '@/ui/molecules/card';
import { Input } from '@/ui/molecules/input';
import type { TResolvedWorkspace } from '@/ui/segments/app-setup/helpers';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

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
  email: z
    .string({ message: 'Please enter your email' })
    .email({ message: 'Email must be in a valid format' })
    .nonempty({ message: 'Email is required' })
    .describe('reference email associated with the virtual lab'),
  entity: z
    .string({ message: 'Please enter your affiliation' })
    .nonempty({ message: 'Affiliation is required' })
    .describe('entity or organization associated with the virtual lab'),
  email_status: EmailStatusSchema.describe('status of the reference email verification')
    .default('none')
    .or(z.string({ message: 'Email verification is required' })),
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
          'border-neutral-1 text-primary-9! h-auto rounded-full bg-white py-2.5! pr-10 pl-4 shadow-sm md:text-base lg:py-3 lg:text-lg',
          'placeholder:text-sm placeholder:font-light disabled:font-black disabled:opacity-70',
          'focus-visible:text-primary-9! font-black! focus-visible:font-bold!',
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
  const [verificationMsg, setVerificationMsg] = useState<string | null>(null);

  const [verificationLoading, setVerificationLoading] = useState(false);
  const [sendCode, setSendCode] = useState(false);
  const [submittable, setSubmittable] = useState<boolean>(true);

  const [form] = Form.useForm<TWorkspaceIdentitySchema>();
  const fields = Form.useWatch([], form);

  const [editableField, setEditableField] = useState<{
    firstName: boolean;
    lastName: boolean;
    email: boolean;
    affiliation: boolean;
  }>({
    firstName: false,
    lastName: false,
    email: false,
    affiliation: false,
  });

  const handleEdit = (fieldName: keyof typeof editableField) => {
    setEditableField((prev) => ({
      ...prev,
      [fieldName]: true,
    }));
  };

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form]);

  const fullName =
    [data?.profile?.first_name, data?.profile?.last_name].filter(Boolean).join(' ') ||
    data?.profile?.preferred_username ||
    '';

  const virtualLabName = fullName ? `${fullName}'s Virtual lab` : undefined;
  const disableSendCode =
    ((WorkspaceIdentitySchema.safeParse(fields).error?.issues.length || 0) > 0 ||
      fields?.email_status === 'locked' ||
      fields?.email_status === 'verified') &&
    !form.isFieldsTouched(['email']);

  // const errors =
  //   WorkspaceIdentitySchema.safeParse(fields).error?.formErrors.fieldErrors &&
  //   Object.entries(
  //     WorkspaceIdentitySchema.safeParse(fields ?? {}).error?.formErrors.fieldErrors ?? {}
  //   ).map(([key, value]) => (
  //     <li className="text-destructive/80 list-disc" key={key}>
  //       {value}
  //     </li>
  //   ));

  const onFormSubmit = async (vs: TWorkspaceIdentitySchema) =>
    move({
      ...vs,
      name: `${
        [vs.first_name, vs.last_name].filter(Boolean).join(' ') ||
        data?.profile?.preferred_username ||
        ''
      }'s virtual lab`,
    });

  const openVerificationCode = () => setSendCode(true);

  const mutateVerification = useMutation({
    mutationFn: async () => {
      const fv = form.getFieldsValue();
      return await getEmailVerificationCode({
        email: fv.email,
        name: virtualLabName ?? '',
      });
    },
    onSuccess: (result) => {
      form.setFieldValue('email_status', result.status);
      if (result.status === 'code_sent') {
        openVerificationCode();
        setVerificationMsg(result.message);
      } else {
        setVerificationMsg(result.message);
      }
    },
    onError() {
      setVerificationMsg(
        'Something went wrong while sending the verification code. Please try again in a moment.'
      );
    },
  });

  const onCodeVerificationComplete = async (code: number) => {
    setVerificationLoading(true);
    const vcfv = form.getFieldsValue();
    const result = await verifyOtpCode({
      code,
      email: vcfv.email,
      name: vcfv.name,
    });

    if (result) {
      form.setFieldValue('email_status', result.status);
      setVerificationMsg(result.message);
    } else {
      setVerificationMsg("We couldn't verify the code right now. Please try again in a moment.");
    }
    setVerificationLoading(false);
  };

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
                email: data?.profile?.email ?? undefined,
                entity: undefined,
                name: virtualLabName,
                email_status: 'none',
              }}
              validateTrigger={['onBlur']}
            >
              <Card className="mr-4 ml-4 flex w-full max-w-lg min-w-lg flex-col bg-transparent shadow-none backdrop-blur-sm">
                <CardContent>
                  {/* {!!errors?.length && (
                  <ul className="border-destructive/30 mb-5 rounded border px-3 py-2 pl-6">
                    {errors}
                  </ul>
                )} */}
                  <Form.Item
                    hidden
                    name="email_status"
                    rules={[
                      {
                        required: true,
                        validator(_rule: RuleObject, value: TEmailStatus) {
                          if (
                            !EmailStatusSchema.options.includes(value) ||
                            value !== EmailStatusSchema.Enum.verified
                          )
                            return Promise.reject();
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <input
                      name="email_status"
                      defaultValue="none"
                      value="none"
                      type="text"
                      hidden
                    />
                  </Form.Item>
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
                                ? error.errors.at(0)?.message
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
                                ? error.errors.at(0)?.message
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
                                ? error.errors.at(0)?.message
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
                  <Form.Item
                    label={<span className="block text-sm text-[#8C8C8C]">Email</span>}
                    name="email"
                    className="flex-1"
                    rules={[
                      {
                        validator: async (_rule: RuleObject, value: string) => {
                          try {
                            await WorkspaceIdentitySchema.pick({
                              email: true,
                            }).shape.email.parseAsync(value);
                          } catch (error) {
                            return Promise.reject(
                              error instanceof z.ZodError
                                ? error.errors.at(0)?.message
                                : 'Email must be in a valid format'
                            );
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <CustomInput
                      placeholder="Enter your email"
                      disabled={!editableField.email}
                      onEdit={() => handleEdit('email')}
                    />
                  </Form.Item>
                  {!sendCode && (
                    <div className="mb-6 ml-auto flex flex-col text-center">
                      <Button
                        rounded
                        type="button"
                        variant="outline"
                        disabled={disableSendCode || mutateVerification.isPending}
                        onClick={() => mutateVerification.mutateAsync()}
                        className="ml-auto h-auto self-end bg-transparent px-6 py-2! text-base"
                      >
                        Send verification code
                      </Button>
                    </div>
                  )}
                  {(fields?.email_status || verificationMsg) && (
                    <Alert
                      banner
                      closable
                      type={['registered'].includes(fields?.email_status) ? 'warning' : 'error'}
                      className={cn(
                        'mb-1 w-full flex-nowrap items-start! rounded-md',
                        '[&_.anticon-close-circle]:mt-1.5',
                        '[&_.ant-alert-close-icon]:mt-1.5',
                        ['error', 'locked', 'expired', 'registered', 'not_match'].includes(
                          fields?.email_status
                        )
                          ? 'flex!'
                          : 'hidden'
                      )}
                      message={verificationMsg}
                    />
                  )}
                  {sendCode && (
                    <div className="flex w-full flex-col items-center justify-center gap-3">
                      <Card
                        borderless
                        data-testid="verification-code-form"
                        className="animate-fade-in text-label w-full bg-white p-3"
                      >
                        <CardContent>
                          <h2 className="h-auto text-left text-lg font-bold">
                            Enter your code here
                            {verificationLoading && <LoadingOutlined className="ml-2" />}
                            {fields?.email_status === 'verified' && (
                              <CheckCircleFilled className="text-accent-dark! ml-2" />
                            )}
                          </h2>
                          <p className="text-justify text-base font-light">
                            We have just sent you an email to the address provided containing the
                            code to validate your administrator’s role
                          </p>
                          <div className="text-primary-8 my-4 flex h-auto items-center justify-center">
                            <VerificationCode
                              disabled={
                                fields?.email_status === 'verified' ||
                                fields?.email_status === 'locked'
                              }
                              onComplete={onCodeVerificationComplete}
                            />
                          </div>
                        </CardContent>
                      </Card>
                      {fields?.email_status !== 'verified' && (
                        <Button
                          rounded
                          type="button"
                          variant="outline"
                          disabled={disableSendCode || mutateVerification.isPending}
                          onClick={() => mutateVerification.mutateAsync()}
                          className="ml-auto h-auto self-end bg-transparent px-6 py-2! text-base"
                        >
                          Send the code again
                        </Button>
                      )}
                    </div>
                  )}
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
                  Create Virtual Lab
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </HydrateWrapper>
  );
}
