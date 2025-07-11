import { captureException } from '@sentry/nextjs';
import { deleteJSON, postJSON } from './common';
import { isExploreAiThreadCreateResponse, isExploreAiThreadDeleteResponse } from './types';

export async function serviceExploreAiCreateThread(
  accessToken: string,
  title: string
): Promise<Response> {
  try {
    const data = await postJSON(
      'threads',
      accessToken,
      {
        title,
      },
      isExploreAiThreadCreateResponse
    );
    return Response.json(data);
  } catch (error) {
    captureException(error);
    return new Response('ServerError: Fetch AI backend failed', {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}

export async function serviceExploreAiDeleteThread(
  accessToken: string,
  threadId: string
): Promise<Response> {
  try {
    const data = await deleteJSON(
      `threads/${threadId}`,
      accessToken,
      {},
      isExploreAiThreadDeleteResponse
    );
    return Response.json(data);
  } catch (error) {
    captureException(error);
    return new Response('ServerError: Fetch AI backend failed', {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
