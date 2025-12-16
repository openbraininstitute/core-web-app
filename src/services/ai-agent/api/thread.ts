import { AiMessage } from '../assistant/types';
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

export async function serviceAiAgentThreadExists({
  accessToken,
  threadId,
}: {
  accessToken: string;
  threadId: string;
}): Promise<boolean> {
  try {
    const data = await fetchJSON({
      method: 'GET',
      accessToken,
      path: `threads/${threadId}`,
      params: {
        thread_id: threadId,
      },
      typeGuard: isThreadResponse,
    });
    return data.thread_id === threadId;
  } catch (ex) {
    logError(`Unable to check existence of thread "${threadId}":`, ex);
    return false;
  }
}

export async function serviceAiAgentThreadMessages({
  accessToken,
  virtualLabId,
  projectId,
  threadId,
}: {
  accessToken: string;
  virtualLabId: string | null;
  projectId: string | null;
  threadId: string;
}): Promise<ThreadMessagesResponse> {
  const data = await fetchJSON({
    method: 'GET',
    accessToken,
    path: `threads/${threadId}/messages`,
    params: {
      virtual_lab_id: virtualLabId,
      project_id: projectId,
      vercel_format: 'true',
      sort: '-creation_date',
      page_size: '1000',
    },
    typeGuard: isThreadMessagesResponse,
  });
  return data;
}

export interface ThreadMessagesResponse {
  results: AiMessage[];
}

function isThreadMessagesResponse(data: unknown): data is ThreadMessagesResponse {
  try {
    assertType(data, {
      results: [
        'array',
        {
          id: 'string',
          role: ['literal', 'user', 'assistant', 'data'],
          isComplete: 'boolean',
          parts: ['?', ['array', 'unknown']],
          metadata: ['?', ['|', { toolCalls: ['array', 'unknown'] }, 'null']],
        },
      ],
    });
    return true;
  } catch (ex) {
    logError('Unexpected return type when fetching list of threads:', data);
    logError(ex);
    return false;
  }
}

export async function serviceAiAgentThreadList({
  accessToken,
  virtualLabId,
  projectId,
  pageSize = 10,
  cursor = null,
  excludeEmptyThreads = true,
}: {
  accessToken: string;
  virtualLabId: string | null;
  projectId: string | null;
  pageSize?: number;
  cursor?: string | null;
  excludeEmptyThreads?: boolean;
}): Promise<ThreadListResponse> {
  const data = await fetchJSON({
    method: 'GET',
    accessToken,
    path: 'threads',
    params: {
      virtual_lab_id: virtualLabId,
      project_id: projectId,
      sort: '-update_date',
      cursor,
      page_size: `${pageSize}`,
      exclude_empty: `${excludeEmptyThreads}`,
    },
    typeGuard: isThreadListResponse,
  });
  return data;
}

export async function serviceAiAgentThreadRename({
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
    path: `threads/${threadId}`,
    query: {
      title,
    },
    typeGuard: isThreadSuggestTitleResponse,
  });
}

export async function serviceAiAgentThreadDelete({
  accessToken,
  threadId,
}: {
  accessToken: string;
  threadId: string;
}): Promise<void> {
  return await fetchJSON({
    method: 'DELETE',
    accessToken,
    path: `threads/${threadId}`,
    typeGuard: isVoidType,
  });
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

export interface ThreadResponse {
  thread_id: string;
  user_id: string;
  vlab_id: string | null;
  project_id: string | null;
  title: string;
  creation_date: string;
  update_date: string;
}

export function isThreadResponse(data: unknown): data is ThreadResponse {
  try {
    assertType(data, {
      thread_id: 'string',
      user_id: 'string',
      vlab_id: ['|', 'string', 'null'],
      project_id: ['|', 'string', 'null'],
      title: 'string',
      creation_date: 'string',
      update_date: 'string',
    });
    return true;
  } catch (ex) {
    logError('Unexpected return type when fetching a thread:', data);
    logError(ex);
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
      next_cursor: ['?', ['|', 'string', 'null']],
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
    logError('Unexpected return type when fetching list of threads:', data);
    logError(ex);
    return false;
  }
}
