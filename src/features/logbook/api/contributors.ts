import { queryOptions, useQuery } from '@tanstack/react-query';

import { getResearchContributors } from '@/api/logbook/queries/research';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IResearchContributors } from '@/api/logbook/types';
import type { IProject } from '@/features/logbook/types';

const contributorsOfFirst = (answer: IResearchContributors) => answer.items[0]?.contributors ?? [];

export const contributorsQuery = (project: IProject, logId: string) =>
  queryOptions({
    queryKey: keyBuilderLogbook.contributors(project.projectId, logId),
    queryFn: ({ signal }) => getResearchContributors({ ids: [logId], context: project, signal }),
    select: contributorsOfFirst,
    staleTime: 30_000,
  });

export const useContributors = (project: IProject, logId: string, shown: boolean) =>
  useQuery({ ...contributorsQuery(project, logId), enabled: shown });
