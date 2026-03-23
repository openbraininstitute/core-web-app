import { getSession } from '@/auth-fetch';
import { config } from '@/config';

import type { VerificationCodeEmailResponse } from '@/api/virtual-lab-svc/queries/types';

type VerificationCodeResponse<T extends 'init' | 'verify'> = T extends 'init'
  ? {
      message: string;
      status: 'registered' | 'locked' | 'code_sent' | 'error';
      remaining_time: number | null;
      remaining_attempts: number | null;
      verified_at?: Date | null;
    }
  : T extends 'verify'
    ? {
        message: string;
        status: 'not_match' | 'verified' | 'registered' | 'locked' | 'expired' | 'error';
        remaining_time: number | null;
        remaining_attempts: number | null;
        verified_at?: Date | null;
      }
    : never;

type VerificationCodeInitPayload = {
  email: string;
  name: string;
};
type VerificationCodeVerifyPayload = VerificationCodeInitPayload & {
  code: number;
};

export async function getEmailVerificationCode({
  email,
  name,
}: VerificationCodeInitPayload): Promise<VerificationCodeResponse<'init'>> {
  try {
    const session = await getSession();
    const response = await fetch(
      `${config.VIRTUAL_LAB_API_URL}/virtual-labs/email/initiate-verification`,
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          email,
          virtual_lab_name: name,
        }),
      }
    );
    const result = (await response.json()) as VerificationCodeEmailResponse;
    return result.data as VerificationCodeResponse<'init'>;
  } catch {
    return {
      status: 'error',
      message: 'Error during generating a new verification code',
      remaining_attempts: null,
      remaining_time: null,
    } as VerificationCodeResponse<'init'>;
  }
}

export async function verifyOtpCode({
  email,
  name,
  code,
}: VerificationCodeVerifyPayload): Promise<VerificationCodeResponse<'verify'>> {
  try {
    const session = await getSession();
    const response = await fetch(`${config.VIRTUAL_LAB_API_URL}/virtual-labs/email/verify-code`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify({
        email,
        code,
        virtual_lab_name: name,
      }),
    });
    const result = (await response.json()) as VerificationCodeEmailResponse;
    return result.data as VerificationCodeResponse<'verify'>;
  } catch {
    return {
      status: 'error',
      message: 'Error during verification the code',
      remaining_attempts: null,
      remaining_time: null,
    } as VerificationCodeResponse<'verify'>;
  }
}
