import { OneshotReservation, ServiceType } from '@/types/accounting';
import {
  convertObjectKeystoCamelCase,
  convertObjectKeysToSnakeCase,
} from '@/util/object-keys-format';
import { auth } from '@/auth';
import { accountingBaseUrl } from '@/config';
import authFetch from '@/authFetch';
import { assertApiResponse } from '@/util/utils';
import { getVirtualLabProjectUsers } from '@/services/virtual-lab/projects';

export const POST = async (request: Request) => {
  const reservationRequest = (await request.json()) as Omit<OneshotReservation, 'type' | 'userId'>;
  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  const { virtualLabId, projectId } = reservationRequest;

  const projectUsers = await getVirtualLabProjectUsers(virtualLabId, projectId);
  const projectUser = projectUsers.data.users.find((user) => user.id === session.user.id);
  if (!projectUser) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  try {
    const res = await authFetch(`${accountingBaseUrl}/reservation/oneshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        convertObjectKeysToSnakeCase({
          ...reservationRequest,
          userId: session.user.id,
          type: ServiceType.Oneshot,
        })
      ),
    });

    const resObj = assertApiResponse(res);

    return Response.json(convertObjectKeystoCamelCase(resObj));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return new Response('Failed to create oneshot reservation', {
      status: 502,
      statusText: errorMessage,
    });
  }
};
