import { isType } from '@/util/type-guards';

interface ExploreAiThreadCreateQuery {
  type: 'thread-create';
  title: string;
}

export function isExploreAiThreadCreateQuery(data: unknown): data is ExploreAiThreadCreateQuery {
  return isType(data, { type: ['literal', 'thread-create'] });
}

interface ExploreAiThreadCreateResponse {
  thread_id: string;
}

export function isExploreAiThreadCreateResponse(
  data: unknown
): data is ExploreAiThreadCreateResponse {
  return isType(data, { thread_id: 'string' });
}

interface ExploreAiThreadDeleteQuery {
  type: 'thread-delete';
  threadId: string;
}

export function isExploreAiThreadDeleteQuery(data: unknown): data is ExploreAiThreadDeleteQuery {
  return isType(data, { type: ['literal', 'thread-delete'], threadId: 'string' });
}

interface ExploreAiThreadDeleteResponse {}

export function isExploreAiThreadDeleteResponse(
  data: unknown
): data is ExploreAiThreadDeleteResponse {
  return isType(data, {});
}
