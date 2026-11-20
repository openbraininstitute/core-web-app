import { queryOptions, useQuery } from '@tanstack/react-query';

import { getResearchContributors } from '@/api/logbook/queries/research';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IProject } from '@/features/logbook/auth/session';

export const contributorsQuery = (project: IProject, logId: string) =>
  queryOptions({
    queryKey: keyBuilderLogbook.contributors(project.projectId, logId),
    queryFn: async ({ signal }) => {
      const answer = await getResearchContributors({ ids: [logId], context: project, signal });
      return answer.items[0]?.contributors ?? [];
    },
    staleTime: 30_000,
  });

// Fetch only once the card is on screen.
export const useContributors = (project: IProject, logId: string, shown: boolean) =>
  useQuery({ ...contributorsQuery(project, logId), enabled: shown });
