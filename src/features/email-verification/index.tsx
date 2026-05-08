'use client';

import { RiArrowLeftLongLine } from '@remixicon/react';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { RequestCodeForm } from './request-code-form';
import { VerificationCodeForm } from './verification-code-form';

import type { EmailVerificationProps } from './types';

export function EmailVerification({
  virtualLabId,
  onVerificationComplete,
}: EmailVerificationProps) {
  const [email, setEmail] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  if (codeSent && email) {
    return (
      <VerificationCodeForm
        virtualLabId={virtualLabId}
        email={email}
        onVerificationComplete={onVerificationComplete}
      />
    );
  }

  return (
    <RequestCodeForm
      virtualLabId={virtualLabId}
      onCodeSent={setCodeSent}
      onEmailChange={setEmail}
    />
  );
}

export function EmailVerificationWithBack({
  onBack,
  ...verificationProps
}: EmailVerificationProps & { onBack: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <Button
        rounded
        variant="ghost"
        size="lg"
        className="flex items-center justify-center gap-1.5 text-white max-w-max"
        onClick={onBack}
      >
        <RiArrowLeftLongLine />
        <span>Back</span>
      </Button>
      <div className="max-w-3xl mx-auto">
        <EmailVerification {...verificationProps} />
      </div>
    </div>
  );
}
