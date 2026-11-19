// Who wrote in one research log, for its card: asked by the card itself, once it is on screen
// (LogWriters, useInView), so a list of 100 logs asks for the few shown, never for every id.
// Cached per log: the rail and the home grid share the answer.
import { queryOptions, useQuery } from '@tanstack/react-query';

import { getResearchContributors } from '@/api/logbook/queries/research';

import type { IProject } from '@/features/logbook/auth/session';

export const contributorsQuery = (project: IProject, logId: string) =>
  queryOptions({
    queryKey: ['contributors', project.projectId, logId],
    // The server's list call, with one id: it answers only logs anchored in this project.
    queryFn: async ({ signal }) => {
      const answer = await getResearchContributors({ ids: [logId], context: project, signal });
      return answer.items[0]?.contributors ?? [];
    },
    // Names change rarely; a new writer shows within half a minute or on the next list load.
    staleTime: 30_000,
  });

// `shown`: the card is on screen. Until then nothing is fetched; once fetched, it stays cached.
export const useContributors = (project: IProject, logId: string, shown: boolean) =>
  useQuery({ ...contributorsQuery(project, logId), enabled: shown });
