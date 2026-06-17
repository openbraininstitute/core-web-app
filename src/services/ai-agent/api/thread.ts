import { assertType, isType } from '@/util/type-guards';
import { logError } from '@/utils/logger';

import { fetchJSON, isVoidType } from './util';

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
    query: { title, vlabId: virtualLabId, projectId },
    typeGuard: isThreadCreateResponse,
  });
  return { threadId: data.id };
}

interface ThreadCreateResponse {
  id: string;
}

function isThreadCreateResponse(data: unknown): data is ThreadCreateResponse {
  return isType(data, {
    id: 'string',
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
      typeGuard: isThreadResponse,
    });
    return data.id === threadId;
  } catch (ex) {
    logError(`Unable to check existence of thread "${threadId}":`, ex);
    return false;
  }
}

export async function serviceAiAgentThreadMessages({
  accessToken,
  threadId,
}: {
  accessToken: string;
  threadId: string;
}): Promise<ThreadMessagesResponse> {
  const data = await fetchJSON({
    method: 'GET',
    accessToken,
    path: `threads/${threadId}/messages`,
    params: {
      pageSize: '200',
    },
    typeGuard: isThreadMessagesResponse,
  });
  return data;
}

export interface ThreadMessagesResponse {
  results: Array<{
    id: string;
    role: 'system' | 'user' | 'assistant';
    parts: unknown[];
    createdAt: string;
  }>;
}

function isThreadMessagesResponse(data: unknown): data is ThreadMessagesResponse {
  try {
    assertType(data, {
      results: [
        'array',
        {
          id: 'string',
          role: ['literal', 'system', 'user', 'assistant'],
          parts: ['array', 'unknown'],
        },
      ],
    });
    return true;
  } catch (ex) {
    logError('Unexpected return type when fetching list of messages:', data);
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
  excludeEmpty = true,
  sort = '-updatedAt',
}: {
  accessToken: string;
  virtualLabId: string | null;
  projectId: string | null;
  pageSize?: number;
  cursor?: string | null;
  excludeEmpty?: boolean;
  sort?: string;
}): Promise<ThreadListResponse> {
  const data = await fetchJSON({
    method: 'GET',
    accessToken,
    path: 'threads',
    params: {
      vlabId: virtualLabId,
      projectId,
      cursor,
      pageSize: `${pageSize}`,
      excludeEmpty: `${excludeEmpty}`,
      sort,
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
      firstUserMessage: title,
    },
    typeGuard: isThreadSuggestTitleResponse,
  });
}

export interface ThreadSuggestTitleResponse {
  id: string;
  title: string;
}

function isThreadSuggestTitleResponse(data: unknown): data is ThreadSuggestTitleResponse {
  try {
    assertType(data, {
      id: 'string',
      title: 'string',
    });
    return true;
  } catch (ex) {
    logError('Invalid response for serviceAiAgentThreadSuggestTitle!', ex);
    return false;
  }
}

export interface ThreadResponse {
  id: string;
  userId: string;
  vlabId: string | null;
  projectId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export function isThreadResponse(data: unknown): data is ThreadResponse {
  try {
    assertType(data, {
      id: 'string',
      userId: 'string',
      vlabId: ['|', 'string', 'null'],
      projectId: ['|', 'string', 'null'],
      title: 'string',
      createdAt: 'string',
      updatedAt: 'string',
    });
    return true;
  } catch (ex) {
    logError('Unexpected return type when fetching a thread:', data);
    logError(ex);
    return false;
  }
}

export interface ThreadListResponse {
  nextCursor?: string | null;
  hasMore: boolean;
  pageSize: number;
  results: Array<{
    id: string;
    userId: string;
    vlabId: string | null;
    projectId: string | null;
    title: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export function isThreadListResponse(data: unknown): data is ThreadListResponse {
  try {
    assertType(data, {
      nextCursor: ['?', ['|', 'string', 'null']],
      hasMore: 'boolean',
      pageSize: 'number',
      results: [
        'array',
        {
          id: 'string',
          userId: 'string',
          vlabId: ['|', 'string', 'null'],
          projectId: ['|', 'string', 'null'],
          title: 'string',
          createdAt: 'string',
          updatedAt: 'string',
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

export async function serviceAiAgentThreadSearch({
  accessToken,
  query,
  virtualLabId,
  projectId,
  limit = 20,
}: {
  accessToken: string;
  query: string;
  virtualLabId: string | null;
  projectId: string | null;
  limit?: number;
}): Promise<ThreadSearchResponse> {
  const data = await fetchJSON({
    method: 'GET',
    accessToken,
    path: 'threads/search',
    params: {
      query,
      vlabId: virtualLabId,
      projectId,
      limit: `${limit}`,
    },
    typeGuard: isThreadSearchResponse,
  });
  return data;
}

export interface ThreadSearchResponse {
  resultList: Array<{
    threadId: string;
    messageId: string;
    title: string;
    content: string;
  }>;
}

function isThreadSearchResponse(data: unknown): data is ThreadSearchResponse {
  try {
    assertType(data, {
      resultList: [
        'array',
        {
          threadId: 'string',
          messageId: 'string',
          title: 'string',
          content: 'string',
        },
      ],
    });
    return true;
  } catch (ex) {
    logError('Unexpected return type when searching threads:', data);
    logError(ex);
    return false;
  }
}
