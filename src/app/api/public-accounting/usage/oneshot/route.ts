import { OneshotUsage, ServiceType } from '@/types/accounting';
import { convertObjectKeystoCamelCase } from '@/util/object-keys-format';
import { auth } from '@/auth';
import { accountingBaseUrl } from '@/config';
import authFetch from '@/authFetch';
import { assertApiResponse, RemoteAPIErrorResponse } from '@/util/utils';

export const POST = async (request: Request) => {
  const usage = (await request.json()) as OneshotUsage;
  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  try {
    const res = await authFetch(`${accountingBaseUrl}/usage/oneshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: ServiceType.Oneshot,
        subtype: usage.subtype,
        proj_id: usage.projectId,
        count: usage.count,
        job_id: usage.jobId,
        timestamp: usage.timestamp,
      }),
    });

    const resObj = await assertApiResponse(res);

    return Response.json(convertObjectKeystoCamelCase(resObj));
  } catch (error: unknown) {
    return RemoteAPIErrorResponse(error);
  }
};
