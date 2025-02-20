import { OneshotReservation } from '@/types/accounting';
import { env } from '@/env.mjs';
import {
  convertObjectKeystoCamelCase,
  convertObjectKeysToSnakeCase,
} from '@/util/object-keys-format';
import { auth } from '@/auth';
import authFetch from '@/authFetch';
import { assertApiResponse } from '@/util/utils';

export const POST = async (request: Request) => {
  const oneshotReservation = (await request.json()) as OneshotReservation;
  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  try {
    const res = await authFetch(`${env.ACCOUNTING_BASE_URL}/reservation/oneshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertObjectKeysToSnakeCase(oneshotReservation)),
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
