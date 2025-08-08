/* eslint-disable no-nested-ternary */
/* eslint-disable react/jsx-props-no-spreading */

'use client';

import { ComponentProps, Dispatch, ReactNode, SetStateAction, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  EditOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { Alert, Form, Popover } from 'antd';
import delay from 'lodash/delay';

import { checkVirtualLabExists, createVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { validateEMail } from '@/components/VirtualLab/create-entity-flows/profile/validator';
import { VerificationCode } from '@/components/VirtualLab/create-entity-flows/common/otp-code';
import { VirtualLabPayloadSchema } from '@/api/virtual-lab-svc/validation';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { VirtualLabPayload } from '@/api/virtual-lab-svc/types';
import { Card, CardContent } from '@/ui/molecules/card';
import { Button } from '@/ui/molecules/button';
import { Input } from '@/ui/molecules/input';
import {
  getEmailVerificationCode,
  verifyOtpCode,
} from '@/api/virtual-lab-svc/queries/email-verification';
import { cn } from '@/utils/css-class';

type Step = 'auth' | 'virtual-lab' | 'project';
const schema = VirtualLabPayloadSchema.partial({
  entity: true,
  email_status: true,
});

function CustomInput({
  value = '',
  disabled = false,
  onEdit,
  extra,
  ...rest
}: ComponentProps<'input'> & {
  extra?: ReactNode;
  onEdit?: () => void;
}) {
  return (
    <div className="relative">
      <Input
        value={value}
        disabled={disabled}
        className={cn(
          'border-neutral-1 text-primary-9 h-auto rounded-full bg-white py-2.5! pr-10 pl-4 shadow-sm md:text-base lg:py-3 lg:text-lg',
          'disabled:font-black disabled:opacity-70'
        )}
        {...rest}
      />
      <span className="absolute top-1/2 right-5 -translate-y-1/2 transform">
        {extra ?? (
          <EditOutlined
            className="text-neutral-3! hover:text-primary-7! cursor-pointer"
            onClick={onEdit}
          />
        )}
      </span>
    </div>
  );
}

export function VirtualLabStep({
  onTransition,
  onNextStep,
}: {
  onTransition: Dispatch<SetStateAction<boolean>>;
  onNextStep: Dispatch<
    SetStateAction<{
      step: Step;
      meta: {
        virtualLabId: string;
        virtualLabName: string;
      } | null;
    }>
  >;
}) {
  const [codeButtonText, setCodeButtonText] = useState<'Send verification code' | 'Resend'>(
    'Send verification code'
  );
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const nameRef = useRef<string | null>(null);
  const [sendCode, setSendCode] = useState(false);
  const breakpoint = useDefaultBreakpoint();
  const { data } = useSession();

  const [creationResult, setCreationResult] = useState<{
    status: 'created' | 'failed';
    message: string;
  } | null>();

  const [verificationMsg, setVerificationMsg] = useState<string | null>(null);
  const [form] = Form.useForm<VirtualLabPayload>();
  const fields = Form.useWatch([], form);

  const userName = data?.user.name ?? data?.user.username;

  const [editableField, setEditableField] = useState<{
    name: boolean;
    reference_email: boolean;
  }>({
    name: false,
    reference_email: false,
  });

  const [validName, setValidName] = useState<{
    loading: boolean;
    status: 'valid' | 'non-valid' | null;
  }>({
    loading: false,
    status: null,
  });

  const handleEdit = (fieldName: 'name' | 'reference_email') => {
    setEditableField((prev) => ({
      ...prev,
      [fieldName]: true,
    }));
  };

  const onValuesChange = (changedValues: VirtualLabPayload, values: VirtualLabPayload) => {
    if ('reference_email' in changedValues && values?.email_status !== 'none') {
      form.setFieldValue('email_status', 'none');
    }
    form
      .validateFields()
      .then(() => {
        setIsFormValid(true);
      })
      .catch((error) => {
        setIsFormValid(!(error.errorFields.length > 0));
      });
  };

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (values: VirtualLabPayload) => createVirtualLab(values),
    onError: (error) => {
      setCreationResult({
        status: 'failed',
        message: error.message,
      });
    },
    onSuccess: (res) => {
      if (res) {
        setCreationResult({
          status: 'created',
          message:
            'Congratulations, your account has been created. Review the virtual lab name before starting your first steps with OBI',
        });
        onTransition(true);
        delay(() => {
          onNextStep({
            step: 'project',
            meta: {
              virtualLabId: res.data?.virtual_lab.id!,
              virtualLabName: res.data?.virtual_lab.name!,
            },
          });
          onTransition(false);
        }, 1000);
      }
    },
  });

  const onFormSubmit = async (values: VirtualLabPayload) => await mutateAsync(values);

  const disableSendCode =
    (schema.safeParse(fields).error?.issues?.length || 0) > 0 ||
    fields?.email_status === 'locked' ||
    fields?.email_status === 'verified';

  const openVerificationCode = () => setSendCode(true);

  const onAskNewCode = async () => {
    const values = form.getFieldsValue();
    setCodeLoading(true);

    const result = await getEmailVerificationCode({
      email: values.reference_email,
      name: values.name,
    });

    if (result) {
      if (result.status === 'code_sent') {
        openVerificationCode();
        setCodeButtonText('Resend');
      }

      form.setFieldValue('email_status', result.status);
      setVerificationMsg(result.message);
    } else {
      setVerificationMsg(
        'Something went wrong while sending the verification code. Please try again in a moment.'
      );
    }
    setCodeLoading(false);
  };

  const onCodeComplete = async (code: number) => {
    setVerificationLoading(true);
    const values = form.getFieldsValue();
    const result = await verifyOtpCode({
      code,
      email: values.reference_email,
      name: values.name,
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
    <Form
      name="virtual-lab-creation-flow-step"
      form={form}
      layout="vertical"
      onFinish={onFormSubmit}
      className={cn(
        'relative flex h-full grow flex-col px-4 py-2 [&_.ant-form-item-explain-error]:pl-2',
        '[&_.ant-form-item-explain-error]:text-sm xl:[&_.ant-form-item-explain-error]:text-base'
      )}
      requiredMark={false}
      validateTrigger={['onChange']}
      initialValues={{
        name: `${userName}'s virtual lab`,
        reference_email: `${data?.user.email}`,
        description: '',
        entity: null,
        include_members: [],
      }}
      onValuesChange={onValuesChange}
      disabled={isPending}
    >
      <Card className="mr-4 ml-4 flex w-full max-w-lg min-w-lg flex-col bg-transparent shadow-none backdrop-blur-sm">
        <CardContent>
          {creationResult && (
            <div className={cn('mb-6 flex items-start gap-3 rounded-lg border p-4')}>
              {creationResult.status === 'failed' && (
                <CloseCircleFilled className="mt-1.5 flex-shrink-0 text-red-600!" />
              )}
              {creationResult.status === 'created' && (
                <CheckCircleFilled className="mt-1.5 flex-shrink-0 text-green-600" />
              )}
              <p className="text-primary-9 max-w-md text-left">
                Sorry, something occurred during creation of your virtual lab, please try again or
                contact support if the issue persist.
              </p>
            </div>
          )}
          <Form.Item hidden name="email_status">
            <input name="email_status" value="none" type="text" hidden />
          </Form.Item>
          <Form.Item
            validateDebounce={800}
            validateTrigger={['onBlur']}
            name="name"
            className="flex-1"
            label={<span className="text-neutral-4 block text-sm">Virtual Lab Name</span>}
            rules={[
              { required: true, message: 'Please enter lab name' },
              {
                max: 80,
                message: 'Virtual lab name cannot exceed 80 characters!',
              },
              {
                validator: async (_: any, name: string) => {
                  if (name === nameRef.current) return;
                  if (!name?.trim()) return;
                  nameRef.current = name;
                  try {
                    setValidName({ loading: true, status: null });
                    const exists = await checkVirtualLabExists({ name });
                    if (exists) {
                      setValidName({ loading: false, status: 'non-valid' });
                      return Promise.reject(
                        new Error(
                          'Another virtual lab with same name already exists, Please use a different name.'
                        )
                      );
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
            <CustomInput
              placeholder="Enter the name of virtual lab"
              disabled={!editableField.name}
              onEdit={() => handleEdit('name')}
              extra={
                validName.loading ? (
                  <LoadingOutlined className="text-primary-7! text-base" />
                ) : validName.status === 'valid' ? (
                  <CheckCircleFilled className="text-accent-dark! text-base" />
                ) : validName.status === 'non-valid' ? (
                  <CloseCircleFilled className="text-destructive! text-base" />
                ) : null
              }
            />
          </Form.Item>
          <Form.Item
            label={
              <div className="flex items-center gap-2">
                <span className="text-neutral-4 block text-sm">Affiliated entity</span>
                <Popover
                  //   destroyTooltipOnHide
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
                  <InfoCircleOutlined className="text-neutral-4!" />
                </Popover>
              </div>
            }
            className="w-full flex-1"
            name="entity"
            rules={[{ required: true, message: 'Please enter affiliated entity' }]}
          >
            <CustomInput placeholder="Enter your entity here..." />
          </Form.Item>

          <Form.Item
            label={<span className="text-neutral-4 block text-sm">Administrator email</span>}
            name="reference_email"
            className="flex-1"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
              { validator: validateEMail },
            ]}
          >
            <CustomInput
              placeholder="Enter the administrator email"
              disabled={!editableField.reference_email}
              onEdit={() => handleEdit('reference_email')}
            />
          </Form.Item>
          {fields?.email_status !== 'verified' && (
            <div className="mb-6 ml-auto flex flex-col text-center">
              <Button
                rounded
                type="button"
                variant="outline"
                disabled={disableSendCode || codeLoading}
                onClick={onAskNewCode}
                className="ml-auto h-auto self-end bg-transparent px-6 py-2! text-base"
              >
                {codeButtonText}
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
            <Card
              borderless
              data-testid="verification-code-form"
              className="animate-fade-in text-neutral-4 mt-6 w-full bg-white p-3"
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
                  We have just sent you an email to the address provided containing the code to
                  validate your administrator’s role
                </p>
                <div className="text-primary-8 my-4 flex h-auto items-center justify-center">
                  <VerificationCode
                    disabled={
                      fields?.email_status === 'verified' || fields?.email_status === 'locked'
                    }
                    onComplete={onCodeComplete}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
      <div className="mt-6 text-center">
        <Button
          rounded
          size={breakpoint === 'xl' ? 'lg' : 'md'}
          type="submit"
          variant="success"
          className="h-auto px-8! py-3!"
          disabled={isPending || !isFormValid}
        >
          Create Virtual Lab
          {isPending && <LoadingOutlined spin />}
        </Button>
      </div>
    </Form>
  );
}
