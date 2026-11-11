import { captureException } from '@sentry/nextjs';

import { config } from '@/config';
import { type InviteData, InviteErrorCodes } from '@/types/virtual-lab/invites';
import { generateLabUrl } from '@/util/virtual-lab/urls';

import type { ApiErrorCause } from '@/api/error';

const errorPath = '/';

export const getLabUrl = (vlmData: InviteData): string => {
  const { status, virtual_lab_id: labId, origin } = vlmData;
  if (status === 'already_accepted') {
    return `${errorPath}?errorcode=${InviteErrorCodes.INVITE_ALREADY_ACCEPTED}&origin=${origin}&lab_id=${labId}`;
  }

  return `${generateLabUrl(labId)}/overview?invite_accepted=true`;
};

export const getErrorUrl = ({
  error,
  accessToken,
  inviteToken,
}: {
  error: ApiErrorCause | null;
  accessToken?: string;
  inviteToken?: string | null;
}): string => {
  if (!accessToken) {
    return `${errorPath}?errorcode=${InviteErrorCodes.UNAUTHORIZED}`;
  }
  if (!inviteToken) {
    return `${errorPath}?errorcode=${InviteErrorCodes.INVALID_LINK}`;
  }
  if (error && 'code' in error) {
    let extraQueryParams = null;
    if (config.DEPLOYMENT_ENV !== 'production') {
      extraQueryParams = `&original_code=${error.code}&description=${error.message}`;
    }
    captureException(new Error(`User invite could not be accepted because of VLM Error`), {
      extra: { vliError: error, invite: inviteToken },
    });

    if (error.code === 'AUTHORIZATION_ERROR') {
      return `${errorPath}?errorcode=${InviteErrorCodes.UNAUTHORIZED}${extraQueryParams}`;
    }

    if (error.code === 'TOKEN_EXPIRED') {
      return `${errorPath}?errorcode=${InviteErrorCodes.TOKEN_EXPIRED}${extraQueryParams}`;
    }

    if (error.code === 'INVALID_REQUEST') {
      return `${errorPath}?errorcode=${InviteErrorCodes.INVALID_LINK}${extraQueryParams}`;
    }
    if (error.code === 'DATA_CONFLICT') {
      return `${errorPath}?errorcode=${InviteErrorCodes.DATA_CONFLICT}${extraQueryParams}`;
    }

    return `${errorPath}?errorcode=${InviteErrorCodes.UNKNOWN}${extraQueryParams}`;
  }

  return `${errorPath}?errorcode=${InviteErrorCodes.UNKNOWN}`;
};
