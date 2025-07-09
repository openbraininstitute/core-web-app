import { fetchJSON, isVoidType } from './util';
import { logError } from '@/util/logger';
import { assertType, isType } from '@/util/type-guards';

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
    method: 'POST',
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

export async function serviceAiAgentThreadList({
  accessToken,
  virtualLabId,
  projectId,
  pageSize = 100,
}: {
  accessToken: string;
  virtualLabId: string | null;
  projectId: string | null;
  pageSize?: number;
}): Promise<ThreadListResponse> {
  const data = await fetchJSON({
    method: 'GET',
    accessToken,
    path: 'threads',
    params: {
      virtual_lab_id: virtualLabId,
      project_id: projectId,
      sort: '-update_date',
      cursor: null,
      page_size: `${pageSize}`,
    },
    typeGuard: isThreadListResponse,
  });
  return data;
}

export async function serviceAiAgentThreadSuggestTitle({
  accessToken,
  threadId,
  title,
}: {
  accessToken: string;
  threadId: string;
  title: string;
}): Promise<ThreadSuggestTitleResponse> {
  return await fetchJSON({
    method: 'PATCH',
    accessToken,
    path: `threads/${threadId}/generate_title`,
    query: {
      first_user_message: title,
    },
    typeGuard: isThreadSuggestTitleResponse,
  });
}

export interface ThreadSuggestTitleResponse {
  thread_id: string;
  title: string;
}

function isThreadSuggestTitleResponse(data: unknown): data is ThreadSuggestTitleResponse {
  try {
    assertType(data, {
      thread_id: 'string',
      title: 'string',
    });
    return true;
  } catch (ex) {
    logError('Invalid response for serviceAiAgentThreadSuggestTitle!', ex);
    return false;
  }
}

export interface ThreadListResponse {
  next_cursor?: string;
  has_more: boolean;
  page_size: number;
  results: [
    {
      thread_id: string;
      user_id: string;
      vlab_id: string | null;
      project_id: string | null;
      title: string;
      creation_date: string;
      update_date: string;
    },
  ];
}

export function isThreadListResponse(data: unknown): data is ThreadListResponse {
  try {
    assertType(data, {
      next_cursor: ['?', 'string'],
      has_more: 'boolean',
      page_size: 'number',
      results: [
        'array',
        {
          thread_id: 'string',
          user_id: 'string',
          vlab_id: ['|', 'string', 'null'],
          project_id: ['|', 'string', 'null'],
          title: 'string',
          creation_date: 'string',
          update_date: 'string',
        },
      ],
    });
    return true;
  } catch (ex) {
    console.error('Unexpected return type when fetching list of threads:', data);
    console.error(ex);
    return false;
  }
}
