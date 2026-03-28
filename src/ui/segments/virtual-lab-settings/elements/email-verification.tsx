'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { RiArrowLeftLongLine, RiMailSendLine } from '@remixicon/react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, Statistic } from 'antd';
import { useCallback, useState } from 'react';
import z from 'zod';

import {
  EmailVerificationCodeStatusDict,
  generateEmailVerificationCode,
  getEmailVerificationInitialStatus,
  getEmailVerificationVerifyStatus,
  verifyOtpCode,
} from '@/api/virtual-lab-svc/queries/email-verification';
import { VerificationCode as OTPCodeVerification } from '@/components/VirtualLab/create-entity-flows/common/otp-code';
import { Button } from '@/ui/molecules/button';
import { Input } from '@/ui/molecules/input';
import { createZodFieldValidator } from '@/ui/segments/contribute/shared/helpers';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { ApiError } from '@/api/error';

const emailSchema = z.object({ email: z.string().email('Please enter a valid email address') });

const POLL_INTERVAL = 15_000;

const { Timer } = Statistic;

type Props = {
  virtualLabId: string;
  onVerificationComplete?: () => void;
};

export function EmailVerification({ virtualLabId, onVerificationComplete }: Props) {
  const [email, setEmail] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  if (codeSent && email) {
    return (
      <VerificationCode
        virtualLabId={virtualLabId}
        email={email}
        onVerificationComplete={onVerificationComplete}
      />
    );
  }
  return (
    <RequestCode virtualLabId={virtualLabId} onCodeSent={setCodeSent} onEmailChange={setEmail} />
  );
}

export function EmailVerificationWithBack(props: Props & { onBack: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <Button
        rounded
        variant="ghost"
        size="lg"
        className="flex items-center justify-center gap-1.5 text-white max-w-max"
        onClick={props.onBack}
      >
        <RiArrowLeftLongLine />
        <span>Back</span>
      </Button>
      <div className="max-w-3xl mx-auto">
        <EmailVerification {...{ ...props }} />
      </div>
    </div>
  );
}

function RequestCode({
  virtualLabId,
  onCodeSent,
  onEmailChange,
}: {
  virtualLabId: string;
  onCodeSent: (v: boolean) => void;
  onEmailChange: (e: string) => void;
}) {
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
    mutationFn: ({ email: e }: { email: string }) =>
      generateEmailVerificationCode({ virtualLabId, email: e }),
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
  const lockDeadline = Date.now() + (initiateStatus?.data?.remaining_time ?? 0) * 1000;

  return (
    <div className="text-white w-full px-10">
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
          onFinish={generateNewCode}
          className="w-3/4 mx-auto relative"
          autoFocus
        >
          <Form.Item
            name="email"
            className={cn(
              'border border-white rounded-full w-full',
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
              autoFocus
              className={cn(
                'h-12 border-none focus-visible:ring-0 pr-52! w-full placeholder:text-white/80',
                'text-white text-lg!',
                '[&:-webkit-autofill]:rounded-full'
              )}
              placeholder="Enter the reference email"
              disabled={isLocked}
            />
          </Form.Item>
          <Button
            rounded
            variant="outline"
            className="absolute right-1.5 top-[calc(50%-12px)] -translate-y-1/2 border-white"
            disabled={isLocked}
          >
            {isPending ? <LoadingOutlined /> : <RiMailSendLine className="text-primary-8" />}
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

function VerificationCode({
  email,
  virtualLabId,
  onVerificationComplete,
}: {
  email: string;
  virtualLabId: string;
  onVerificationComplete?: () => void;
}) {
  const queryClient = useQueryClient();
  const [otpKey, setOtpKey] = useState(0);
  const [code, setCode] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const [{ data: verifyStatus }, { data: initiateStatus }] = useQueries({
    queries: [
      {
        queryKey: ['get-email-verify-status', { virtualLabId, email }],
        queryFn: () => getEmailVerificationVerifyStatus({ virtualLabId, email }),
        refetchInterval: POLL_INTERVAL,
      },
      {
        queryKey: ['get-email-initial-verification-status', { virtualLabId, email }],
        queryFn: () => getEmailVerificationInitialStatus({ virtualLabId, email }),
        refetchInterval: POLL_INTERVAL,
      },
    ],
  });

  const { mutate: generateNewCode, isPending: pendingGeneration } = useMutation({
    mutationKey: ['generate-email-verification-code', { virtualLabId }],
    mutationFn: () => generateEmailVerificationCode({ virtualLabId, email }),
    onSuccess: () => {
      setCode(null);
      setOtpKey((k) => k + 1);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['get-email-verify-status', { virtualLabId, email }],
      });
      queryClient.invalidateQueries({
        queryKey: ['get-email-initial-verification-status', { virtualLabId, email }],
      });
    },
  });

  const {
    mutate: onSubmitCode,
    isPending: pendingSubmit,
    error: confirmError,
    reset: resetSubmit,
  } = useMutation({
    mutationKey: ['verify-email-verification-code', { virtualLabId }],
    mutationFn: (c: string) => verifyOtpCode({ virtualLabId, email, code: c }),
    onSuccess: () => {
      setVerified(true);
      onVerificationComplete?.();
    },
    onSettled: (data) => {
      if (data?.data.status !== EmailVerificationCodeStatusDict.Verified) {
        queryClient.invalidateQueries({
          queryKey: ['get-email-verify-status', { virtualLabId, email }],
        });
      }
      queryClient.invalidateQueries({
        queryKey: keyBuilder.getOneLab({ virtualLabId }),
      });
    },
  });

  const vStatus = verifyStatus?.data?.status;
  const iStatus = initiateStatus?.data?.status;

  // verify lock: user exceeded max verify attempts
  const isVerifyLocked = vStatus === EmailVerificationCodeStatusDict.Locked;
  const verifyLockDeadline = Date.now() + (verifyStatus?.data?.remaining_time ?? 0) * 1000;

  // verified: code was accepted
  const isVerified = verified || vStatus === EmailVerificationCodeStatusDict.Verified;

  // code expired: no active code to verify against
  const isCodeExpired = vStatus === EmailVerificationCodeStatusDict.Expired && !isVerified;

  // code is active and user can submit
  const canSubmitCode = vStatus === EmailVerificationCodeStatusDict.CodeSent && !isVerifyLocked;

  // generation lock: user exceeded max initiate attempts
  const isGenerationLocked = iStatus === EmailVerificationCodeStatusDict.Locked;
  const generationLockDeadline = Date.now() + (initiateStatus?.data?.remaining_time ?? 0) * 1000;

  // error from submit attempt (not_match)
  const submitError = confirmError as ApiError | null;
  const isNotMatch =
    submitError?.cause?.details?.status === EmailVerificationCodeStatusDict.NotMatch;

  const handleComplete = useCallback(
    (c: string) => {
      setCode(c);
      if (canSubmitCode) {
        onSubmitCode(c);
      }
    },
    [canSubmitCode, onSubmitCode]
  );

  return (
    <div className="flex flex-col gap-8 items-center justify-center mx-auto relative rounded-md p-10">
      <div className="flex flex-col items-center justify-center text-white">
        <h4 className="font-bold text-2xl">Enter Verification Code</h4>
        <p className="text-lg">
          We sent a 6-digit code to <strong className="text-white">{email}</strong>
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <form id="verification-otp-code" className="flex items-center justify-center">
          <OTPCodeVerification
            key={otpKey}
            cls={{
              container: cn('bg-white'),
              slot: cn('bg-white h-18 w-13 font-bold text-primary-8', {
                'bg-destructive/40 text-white border-none': isNotMatch && code?.length === 6,
              }),
              caret: 'text-primary-9 [&_#caret]:bg-primary-8!',
            }}
            disabled={isVerifyLocked || isCodeExpired}
            onChange={(v) => {
              if (submitError) resetSubmit();
              setCode(v);
            }}
            onComplete={handleComplete}
          />
        </form>

        {isNotMatch && (
          <p className="text-center text-red-300 text-sm">
            Incorrect code. {verifyStatus?.data?.remaining_attempts ?? 0} attempt(s) remaining.
          </p>
        )}

        {isVerifyLocked && (
          <div className="flex flex-col items-center justify-center text-white">
            <p>Too many incorrect attempts. Please wait before trying again.</p>
            <Timer
              className="text-white!"
              type="countdown"
              value={verifyLockDeadline}
              valueStyle={{ color: 'white' }}
              onFinish={() =>
                queryClient.invalidateQueries({
                  queryKey: ['get-email-verify-status', { virtualLabId, email }],
                })
              }
            />
          </div>
        )}

        {isCodeExpired && !isGenerationLocked && (
          <div className="flex flex-col items-center justify-center text-white gap-2">
            <p>Your code has expired. Please request a new one.</p>
            <Button
              rounded
              type="button"
              onClick={() => generateNewCode()}
              variant="outline"
              size="lg"
              className="border-white w-82"
              disabled={pendingGeneration}
            >
              {pendingGeneration ? (
                <LoadingOutlined />
              ) : (
                <RiMailSendLine className="text-primary-8" />
              )}
              <span>Send new verification email</span>
            </Button>
          </div>
        )}

        {canSubmitCode && (
          <Button
            rounded
            type="button"
            onClick={() => {
              if (code?.length === 6) onSubmitCode(code);
            }}
            variant="outline"
            size="lg"
            className="border-white w-82 mx-auto"
            disabled={code?.trim()?.length !== 6 || pendingSubmit}
          >
            {pendingSubmit && <LoadingOutlined />}
            <span>Verify code</span>
          </Button>
        )}

        {isGenerationLocked && (
          <div className="flex flex-col items-center justify-center text-white">
            <p>Too many code requests. Please wait before requesting again.</p>
            <Timer
              className="text-white!"
              type="countdown"
              value={generationLockDeadline}
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

      {canSubmitCode && !isGenerationLocked && (
        <div className="flex flex-col items-center justify-center gap-2.5 text-white">
          Didn't receive the code?
          <Button
            rounded
            onClick={() => generateNewCode()}
            variant="ghost"
            size="sm"
            className="w-max underline disabled:pointer-events-none disabled:cursor-not-allowed"
            disabled={pendingGeneration}
          >
            {pendingGeneration ? <LoadingOutlined /> : 'Resend Code'}
          </Button>
        </div>
      )}
    </div>
  );
}
