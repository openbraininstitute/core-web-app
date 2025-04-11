import { convertObjectKeystoCamelCase } from '@/util/object-keys-format';
import { auth } from '@/auth';
import { accountingBaseUrl } from '@/config';
import authFetch from '@/authFetch';
import { assertApiResponse, RemoteAPIErrorResponse } from '@/util/utils';

export const DELETE = async (
  request: Request,
  props: { params: Promise<{ reservationId: string }> }
) => {
  const params = await props.params;
  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  const { reservationId } = params;

  try {
    const res = await authFetch(`${accountingBaseUrl}/reservation/oneshot/${reservationId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    const resObj = await assertApiResponse(res);

    return Response.json(convertObjectKeystoCamelCase(resObj));
  } catch (error: unknown) {
    return RemoteAPIErrorResponse(error);
  }
};
