// Names Yjs clients whose writer is no longer on the page.
import { queryOptions } from '@tanstack/react-query';

import { getPageAuthorship } from '@/api/logbook/queries/page';
import { ActorVia } from '@/api/logbook/types';
import { agentActor, personActor } from '@/features/logbook/collaboration/actors';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IWriter } from '@/api/logbook/types';
import type { IProject } from '@/features/logbook/auth/session';
import type { IActor } from '@/features/logbook/ui/Avatar';

export const WRITERS_MAX_CLIENTS = 100;

export const actorOfWriter = (writer: Pick<IWriter, 'userId' | 'label' | 'via'>): IActor =>
  writer.via === ActorVia.Agent
    ? agentActor(writer.label)
    : personActor(writer.userId, writer.label);

export const writersQuery = (project: IProject, pageId: string, clientIds: readonly number[]) =>
  queryOptions({
    queryKey: keyBuilderLogbook.writers(pageId, clientIds),
    queryFn: async ({ signal }) => {
      const answer = await getPageAuthorship({
        pageId,
        context: project,
        clientIds: clientIds.slice(0, WRITERS_MAX_CLIENTS),
        signal,
      });
      return answer.items;
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
