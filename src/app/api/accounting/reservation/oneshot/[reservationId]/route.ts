import { env } from '@/env.mjs';
import { convertObjectKeystoCamelCase } from '@/util/object-keys-format';
import { auth } from '@/auth';
import authFetch from '@/authFetch';
import { assertApiResponse } from '@/util/utils';

export const DELETE = async (
  request: Request,
  { params }: { params: { reservationId: string } }
) => {
  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  const { reservationId } = params;

  try {
    const res = await authFetch(`${env.ACCOUNTING_BASE_URL}/reservation/oneshot/${reservationId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    const resObj = assertApiResponse(res);

    return Response.json(convertObjectKeystoCamelCase(resObj));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return new Response('Failed to cancel oneshot reservation', {
      status: 502,
      statusText: errorMessage,
    });
  }
};
