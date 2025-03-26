import { captureException } from '@sentry/nextjs';

import { AcceptInviteResponse, InviteDetailsResponse } from '@/types/virtual-lab/invites';
import { VlmError } from '@/types/virtual-lab/common';
import { virtualLabApi } from '@/config';

export const acceptInvite = async (
  sessionToken: string,
  inviteToken: string
): Promise<AcceptInviteResponse | VlmError> => {
  return fetch(`${virtualLabApi.url}/invites?token=${inviteToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
  })
    .then<AcceptInviteResponse | VlmError>((response) => {
      // Valid response or client errors (40X)
      // This is not always the case, as, for example, a 404 can be return by the load balancer,
      // or the server itself without reaching the target endpoint, if the routes are misconfigured.
      // TODO: refactor to throw an error if the response.status is not 20x
      return response.json();
    })
    .catch((err) => {
      // Server errors (50X)
      captureException(new Error('User could not accept invite because of an unknown error'), {
        extra: { err, inviteToken },
      });
      return { error_code: 'INTERNAL_SERVER_ERROR', message: 'Vlm server is down' } as VlmError;
    });
};

export const getInviteDetails = async (
  sessionToken: string,
  inviteToken: string
): Promise<InviteDetailsResponse | VlmError> => {
  return fetch(`${virtualLabApi.url}/invites?token=${inviteToken}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
  })
    .then<InviteDetailsResponse | VlmError>((response) => {
      // Valid response or client errors (40X)
      return response.json();
    })
    .catch((err) => {
      // Server errors (50X)
      captureException(new Error('User could not get invite details because of an unknown error'), {
        extra: { err, inviteToken },
      });
      return { error_code: 'INTERNAL_SERVER_ERROR', message: 'Vlm server is down' } as VlmError;
    });
};
