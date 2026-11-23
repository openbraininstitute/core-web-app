import { queryOptions, useQuery } from '@tanstack/react-query';

import { getResearchContributors } from '@/api/logbook/queries/research';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IResearchContributors } from '@/api/logbook/types';
import type { WorkspaceContext } from '@/types/common';

const contributorsOfFirst = (answer: IResearchContributors) => answer.items[0]?.contributors ?? [];

const contributorsQuery = (project: WorkspaceContext, logId: string) =>
  queryOptions({
    queryKey: keyBuilderLogbook.contributors(project.projectId, logId),
    queryFn: ({ signal }) => getResearchContributors({ ids: [logId], context: project, signal }),
    select: contributorsOfFirst,
    staleTime: 30_000,
  });

export const useContributors = (project: WorkspaceContext, logId: string, shown: boolean) =>
  useQuery({ ...contributorsQuery(project, logId), enabled: shown });
