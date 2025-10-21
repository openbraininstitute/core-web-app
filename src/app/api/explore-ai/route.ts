import { captureException } from '@sentry/nextjs';

import { isExploreAiSuggestionsQuery } from './types/suggestions';
import { serviceExploreAiGetSuggestions } from './suggestions';
import { isExploreAiThreadCreateQuery, isExploreAiThreadDeleteQuery } from './types';
import { serviceExploreAiCreateThread, serviceExploreAiDeleteThread } from './threads';
import { getSessionServer } from '@/auth-server';

export const POST = async (request: Request) => {
  const session = await getSessionServer();
  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }
  const { accessToken } = session;

  try {
    const data = await request.json();
    if (isExploreAiSuggestionsQuery(data)) return serviceExploreAiGetSuggestions(accessToken, data);
    if (isExploreAiThreadCreateQuery(data))
      return serviceExploreAiCreateThread(accessToken, data.title);
    if (isExploreAiThreadDeleteQuery(data))
      return serviceExploreAiDeleteThread(accessToken, data.threadId);
  } catch (ex) {
    captureException(ex);
    return new Response('Server Error', {
      status: 500,
      statusText: `${ex}`,
    });
  }

  return new Response('Bad Request', {
    status: 400,
    statusText: 'Invalid request format',
  });
};
