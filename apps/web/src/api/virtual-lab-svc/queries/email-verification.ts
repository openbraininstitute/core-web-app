import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';

import type { VlmResponse } from '@/types/virtual-lab/common';

const baseUri = '/users';

export const EmailVerificationCodeStatusDict = {
  Locked: 'locked',
  NotMatch: 'not_match',
  Registered: 'registered',
  CodeSent: 'code_sent',
  Expired: 'expired',
  Verified: 'verified',
  Waiting: 'waiting',
} as const;

export type TEmailVerificationCodeStatus =
  (typeof EmailVerificationCodeStatusDict)[keyof typeof EmailVerificationCodeStatusDict];

type VerificationCodeResponse = {
  message: string;
  status: TEmailVerificationCodeStatus;
  remaining_time: number | null;
  remaining_attempts: number | null;
};

type VerificationCodeInitPayload = {
  email: string;
  virtualLabId: string;
};

type VerificationCodeStatusPayload = {
  email: string;
  virtualLabId: string;
};

type VerificationCodeVerifyPayload = VerificationCodeInitPayload & {
  code: string;
};

export async function getEmailVerificationInitialStatus({
  virtualLabId,
  email,
}: VerificationCodeStatusPayload): Promise<VlmResponse<VerificationCodeResponse>> {
  const api = await virtualLabRootApi();
  const url = `${baseUri}/email/verification/initiate-status`;

  return await api.get(url, {
    queryParams: { email },
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'virtual-lab-id': virtualLabId,
    },
  });
}
export async function getEmailVerificationVerifyStatus({
  virtualLabId,
  email,
}: VerificationCodeStatusPayload): Promise<VlmResponse<VerificationCodeResponse>> {
  const api = await virtualLabRootApi();
  const url = `${baseUri}/email/verification/verify-status`;

  return await api.get(url, {
    queryParams: { email },
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'virtual-lab-id': virtualLabId,
    },
  });
}

export async function generateEmailVerificationCode({
  virtualLabId,
  email,
}: VerificationCodeInitPayload): Promise<VlmResponse<VerificationCodeResponse>> {
  const api = await virtualLabRootApi();
  const url = `${baseUri}/email/verification/generate`;

  return await api.post(url, {
    body: { email },
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'virtual-lab-id': virtualLabId,
    },
  });
}

export async function verifyOtpCode({
  email,
  virtualLabId,
  code,
}: VerificationCodeVerifyPayload): Promise<VlmResponse<VerificationCodeResponse>> {
  const api = await virtualLabRootApi();
  const url = `${baseUri}/email/verification/confirm`;

  return await api.post(url, {
    body: {
      email,
      code,
    },
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'virtual-lab-id': virtualLabId,
    },
  });
}
