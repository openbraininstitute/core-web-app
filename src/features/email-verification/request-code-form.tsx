'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { RiMailSendLine } from '@remixicon/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, Statistic } from 'antd';
import { useMemo, useState } from 'react';

import {
  EmailVerificationCodeStatusDict,
  generateEmailVerificationCode,
  getEmailVerificationInitialStatus,
} from '@/api/virtual-lab-svc/queries/email-verification';
import { Button } from '@/ui/molecules/button';
import { Input } from '@/ui/molecules/input';
import { createZodFieldValidator } from '@/ui/segments/contribute/shared';
import { cn } from '@/utils/css-class';

import { emailSchema, POLL_INTERVAL } from './constants';

const { Timer } = Statistic;

type RequestCodeFormProps = {
  virtualLabId: string;
  onCodeSent: (value: boolean) => void;
  onEmailChange: (email: string) => void;
  classname?: string;
};

export function RequestCodeForm({
  virtualLabId,
  onCodeSent,
  onEmailChange,
  classname,
}: RequestCodeFormProps) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const email = Form.useWatch('email', form);

  const isValidEmail = !!email && emailSchema.safeParse({ email }).success;

  const { data: initiateStatus } = useQuery({
    queryKey: ['get-email-initial-verification-status', { virtualLabId, email }],
    queryFn: () => getEmailVerificationInitialStatus({ virtualLabId, email }),
    enabled: isValidEmail,
    refetchInterval: POLL_INTERVAL,
  });

  const { mutate: generateNewCode, isPending } = useMutation({
    mutationKey: ['generate-email-verification-code', { virtualLabId }],
    mutationFn: ({ email: nextEmail }: { email: string }) =>
      generateEmailVerificationCode({ virtualLabId, email: nextEmail }),
    onSuccess: (response) => {
      if (response?.data?.status === EmailVerificationCodeStatusDict.CodeSent) {
        onCodeSent(true);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ['get-email-initial-verification-status', { virtualLabId, email }],
      }),
  });

  const status = initiateStatus?.data?.status;
  const isLocked = status === EmailVerificationCodeStatusDict.Locked;
  const [currentTime] = useState(() => Date.now());
  const lockDeadline = useMemo(
    () => currentTime + (initiateStatus?.data?.remaining_time ?? 0) * 1000,
    [currentTime, initiateStatus?.data?.remaining_time]
  );

  return (
    <div
      id="request-code-form"
      data-testid="request-code-form"
      className={cn('text-primary-9 w-full px-2', classname)}
    >
      <h4 className="text-lg font-bold">Verify your email to continue</h4>
      <p className="text-base font-light">
        We'll send a one-time code to your email. Enter it to confirm your identity and proceed with
        your purchase
      </p>
      <div className="w-full mx-auto flex items-center justify-center mt-5!">
        <Form
          form={form}
          name="basic"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          style={{ maxWidth: 600 }}
          onFieldsChange={(changed) => {
            const name = changed.at(0)?.name;
            if (Array.isArray(name) && name[0] === 'email') {
              onEmailChange(changed[0]?.value);
            }
          }}
          autoComplete="off"
          onFinish={generateNewCode}
          className="w-full mx-auto relative"
        >
          <Form.Item
            name="email"
            className={cn(
              'border border-gray-200 rounded-full w-full',
              '[&_.ant-row]:w-full [&_.ant-row]:relative',
              '[&_.ant-form-item-row]:w-full! [&_.ant-form-item-row]:flex!',
              '[&_.ant-form-item-control]:max-w-full! [&_.ant-form-item-control]:flex!',
              '[&_.ant-form-item-control-input-content]:w-full!',
              '[&_.ant-form-item-control-input]:w-full!'
            )}
            rules={[
              {
                required: true,
                validator: createZodFieldValidator(emailSchema, 'email', form),
              },
            ]}
          >
            <Input
              className={cn(
                'h-12 border-none focus-visible:ring-0 pr-52! w-full placeholder:text-white/80',
                'text-primary-8! font-semibold text-lg! rounded-full',
                '[&:-webkit-autofill]:rounded-full'
              )}
              placeholder="Enter the reference email"
              disabled={isLocked}
            />
          </Form.Item>
          <Button
            rounded
            variant="outline"
            className={cn(
              'absolute right-1.5 top-[calc(50%-12px)] -translate-y-1/2 border-gray-200',
              'hover:border-gray-400 hover:bg-primary-8 hover:text-white group'
            )}
            disabled={isLocked}
          >
            {isPending ? (
              <LoadingOutlined />
            ) : (
              <RiMailSendLine className="text-primary-8 group-hover:text-white" />
            )}
            <span>Send verification email</span>
          </Button>
        </Form>
      </div>
      {isLocked && (
        <div className="flex flex-col items-center justify-center">
          <p>Too many attempts. Please wait before trying again ⏳</p>
          <Timer
            className="text-white"
            type="countdown"
            value={lockDeadline}
            valueStyle={{ color: 'white' }}
            onFinish={() =>
              queryClient.invalidateQueries({
                queryKey: ['get-email-initial-verification-status', { virtualLabId, email }],
              })
            }
          />
        </div>
      )}
    </div>
  );
}
