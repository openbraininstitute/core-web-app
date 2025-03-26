import { fetchJSON, isVoidType } from './util';
import { isType } from '@/util/type-guards';

export async function serviceAiAgentThreadCreate({
  accessToken,
  title,
  virtualLabId,
  projectId,
}: {
  accessToken: string;
  title: string;
  virtualLabId: string | null;
  projectId: string | null;
}): Promise<{ threadId: string }> {
  const data = await fetchJSON({
    accessToken,
    path: 'threads',
    query: { title, virtual_lab_id: virtualLabId, project_id: projectId },
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
