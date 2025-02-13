import { getSession } from 'next-auth/react';

interface VerificationCodeEmailResponseData {
  verified_at?: Date | null;
  is_verified: boolean;
  remaining_attempts: number;
  remaining_time: number;
  locked: boolean;
  expired?: boolean;
  code_sent?: boolean | null;
}

interface VerificationCodeEmailResponse {
  message: string;
  data: VerificationCodeEmailResponseData;
}

export type VerificationCodeResponse<T extends 'init' | 'verify'> = T extends 'init'
  ? {
      status: 'already_verified' | 'code_sent' | 'locked' | 'failed' | 'none';
      attempts?: number | null;
      wait?: number | null;
      // Other properties specific to Function A
    }
  : T extends 'verify'
    ? {
        status: 'expired' | 'verified' | 'locked' | 'failed' | 'none';
        attempts?: number | null;
        wait?: number | null;
        // Other properties specific to Function B
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
    const response = await fetch(`http://localhost:8000/virtual-labs/email/initiate-verification`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify({
        email,
        virtual_lab_name: name,
      }),
    });
    if (response.ok) {
      const result = (await response.json()) as VerificationCodeEmailResponse;
      if (result.data.code_sent) {
        return {
          status: 'code_sent',
          attempts: result.data.remaining_attempts,
          wait: null,
        };
      }
      return { status: 'none' };
    }
    const result = (await response.json()) as VerificationCodeEmailResponse;
    return {
      // eslint-disable-next-line no-nested-ternary
      status: result.data.locked ? 'locked' : result.data.is_verified ? 'already_verified' : 'none',
      attempts: result.data.remaining_attempts,
      wait: result.data.remaining_time,
    };
  } catch (error) {
    return {
      status: 'failed',
      attempts: null,
      wait: null,
    };
  }
}

export async function verifyOtpCode({
  email,
  name,
  code,
}: VerificationCodeVerifyPayload): Promise<VerificationCodeResponse<'verify'>> {
  try {
    const session = await getSession();
    const response = await fetch(`http://localhost:8000/virtual-labs/email/verify-code`, {
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
    if (response.ok) {
      const result = (await response.json()) as VerificationCodeEmailResponse;

      if (result.data.expired) {
        return {
          status: 'expired',
        };
      }
      if (result.data.is_verified) {
        return {
          status: 'verified',
          attempts: result.data.remaining_attempts,
          wait: null,
        };
      }
      return { status: 'none' };
    }
    const result = (await response.json()) as VerificationCodeEmailResponse;
    if (result.data.locked) {
      return {
        status: 'locked',
        attempts: result.data.remaining_attempts,
        wait: result.data.remaining_time,
      };
    }
    return {
      status: 'failed',
      attempts: result.data.remaining_attempts,
      wait: result.data.remaining_time,
    };
  } catch (error) {
    return {
      status: 'failed',
      attempts: null,
      wait: null,
    };
  }
}
