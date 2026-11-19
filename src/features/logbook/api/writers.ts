// Who the Yjs clients of a page are, from the text the logbook server stored
// (GET /v1/page/:pageId/authorship, at most 100 clients). History asks for the clients that nobody
// on the page can name now (their writer is gone); the answer never changes for a client.
import { queryOptions } from '@tanstack/react-query';

import { getPageAuthorship } from '@/api/logbook/queries/page';
import { ActorVia } from '@/api/logbook/types';
import { agentActor, personActor } from '@/features/logbook/collaboration/actors';

import type { IWriter } from '@/api/logbook/types';
import type { IProject } from '@/features/logbook/auth/session';
import type { IActor } from '@/features/logbook/ui/Avatar';

export const WRITERS_MAX_CLIENTS = 100;

// The same actor shapes as the live page: a person by user id, an agent by its label.
// Any shape with these three fields: a stored writer, or a `writer` notice's actor (notices.ts).
export const actorOfWriter = (writer: Pick<IWriter, 'userId' | 'label' | 'via'>): IActor =>
  writer.via === ActorVia.Agent
    ? agentActor(writer.label)
    : personActor(writer.userId, writer.label);

export const writersQuery = (project: IProject, pageId: string, clientIds: readonly number[]) =>
  queryOptions({
    queryKey: ['writers', pageId, clientIds],
    queryFn: async ({ signal }) => {
      const answer = await getPageAuthorship({
        pageId,
        context: project,
        clientIds: clientIds.slice(0, WRITERS_MAX_CLIENTS),
        signal,
      });
      return answer.items;
    },
    staleTime: Number.POSITIVE_INFINITY, // a client's writer never changes
  });
