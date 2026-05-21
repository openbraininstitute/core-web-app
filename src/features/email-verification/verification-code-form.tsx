'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { RiMailSendLine } from '@remixicon/react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { Statistic } from 'antd';
import { useCallback, useMemo, useState } from 'react';

import {
  EmailVerificationCodeStatusDict,
  generateEmailVerificationCode,
  getEmailVerificationInitialStatus,
  getEmailVerificationVerifyStatus,
  verifyOtpCode,
} from '@/api/virtual-lab-svc/queries/email-verification';
import { VerificationCode as OTPCodeVerification } from '@/components/VirtualLab/create-entity-flows/common/otp-code';
import { Button } from '@/ui/molecules/button';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import { POLL_INTERVAL } from './constants';

import type { ApiError } from '@/api/error';

const { Timer } = Statistic;

type VerificationCodeFormProps = {
  email: string;
  virtualLabId: string;
  onVerificationComplete?: () => void;
};

export function VerificationCodeForm({
  email,
  virtualLabId,
  onVerificationComplete,
}: VerificationCodeFormProps) {
  const queryClient = useQueryClient();
  const [otpKey, setOtpKey] = useState(0);
  const [code, setCode] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [currentTime] = useState(() => Date.now());

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
      setOtpKey((key) => key + 1);
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
    mutationFn: (nextCode: string) => verifyOtpCode({ virtualLabId, email, code: nextCode }),
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
  const isVerifyLocked = vStatus === EmailVerificationCodeStatusDict.Locked;
  const verifyLockDeadline = useMemo(
    () => currentTime + (verifyStatus?.data?.remaining_time ?? 0) * 1000,
    [currentTime, verifyStatus?.data?.remaining_time]
  );
  const isVerified = verified || vStatus === EmailVerificationCodeStatusDict.Verified;
  const isCodeExpired = vStatus === EmailVerificationCodeStatusDict.Expired && !isVerified;
  const canSubmitCode = vStatus === EmailVerificationCodeStatusDict.CodeSent && !isVerifyLocked;
  const isGenerationLocked = iStatus === EmailVerificationCodeStatusDict.Locked;
  const generationLockDeadline = useMemo(
    () => currentTime + (initiateStatus?.data?.remaining_time ?? 0) * 1000,
    [currentTime, initiateStatus?.data?.remaining_time]
  );
  const submitError = confirmError as ApiError | null;
  const isNotMatch =
    submitError?.cause?.details?.status === EmailVerificationCodeStatusDict.NotMatch;

  const handleComplete = useCallback(
    (nextCode: string) => {
      setCode(nextCode);
      if (canSubmitCode) {
        onSubmitCode(nextCode);
      }
    },
    [canSubmitCode, onSubmitCode]
  );

  return (
    <div className="flex flex-col gap-8 items-center justify-center mx-auto relative rounded-md p-10">
      <div className="flex flex-col items-center justify-center text-white">
        <h4 className="font-semibold text-2xl">Enter Verification Code</h4>
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
            onChange={(value) => {
              if (submitError) resetSubmit();
              setCode(value);
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
