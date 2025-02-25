import { OneshotReservation, ServiceType } from '@/types/accounting';
import { convertObjectKeystoCamelCase } from '@/util/object-keys-format';
import { auth } from '@/auth';
import { accountingBaseUrl } from '@/config';
import authFetch from '@/authFetch';
import { assertApiResponse, RemoteAPIErrorResponse } from '@/util/utils';
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
      body: JSON.stringify({
        proj_id: projectId,
        user_id: session.user.id,
        type: ServiceType.Oneshot,
        subtype: reservationRequest.subtype,
        count: reservationRequest.count,
      }),
    });

    const resObj = await assertApiResponse(res);

    return Response.json(convertObjectKeystoCamelCase(resObj));
  } catch (error) {
    return RemoteAPIErrorResponse(error);
  }
};
