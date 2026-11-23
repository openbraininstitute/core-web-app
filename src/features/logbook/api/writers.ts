import { queryOptions } from '@tanstack/react-query';

import { getPageAuthorship } from '@/api/logbook/queries/page';
import { WRITERS_MAX_CLIENTS } from '@/features/logbook/constants';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { WorkspaceContext } from '@/types/common';

export const writersQuery = (
  project: WorkspaceContext,
  pageId: string,
  clientIds: readonly number[]
) =>
  queryOptions({
    queryKey: keyBuilderLogbook.writers(pageId, clientIds),
    queryFn: ({ signal }) =>
      getPageAuthorship({
        pageId,
        context: project,
        clientIds: clientIds.slice(0, WRITERS_MAX_CLIENTS),
        signal,
      }),
    staleTime: Number.POSITIVE_INFINITY,
  });
