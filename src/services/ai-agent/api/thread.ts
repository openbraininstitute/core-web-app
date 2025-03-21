import { fetchJSON, isVoidType } from './util';
import { isType } from '@/util/type-guards';

export async function serviceAiAgentThreadCreate({
  accessToken,
  title,
}: {
  accessToken: string;
  title: string;
}): Promise<{ threadId: string }> {
  const data = await fetchJSON({
    accessToken,
    path: 'threads',
    query: { title },
    typeGuard: isThreadCreateResponse,
  });
  return { threadId: data.thread_id };
}

interface ThreadCreateResponse {
  thread_id: string;
}

function isThreadCreateResponse(data: unknown): data is ThreadCreateResponse {
  return isType(data, {
    thread_id: 'string',
  });
}

export async function serviceAiAgentThreadDelete({
  accessToken,
  threadId,
}: {
  accessToken?: string;
  threadId: string;
}) {
  await fetchJSON({
    accessToken,
    path: `threads/${threadId}`,
    method: 'DELETE',
    typeGuard: isVoidType,
  });
}
