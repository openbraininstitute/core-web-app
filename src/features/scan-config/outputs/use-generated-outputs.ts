import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { invalidateDataListings } from '@/features/scan-config/outputs/invalidate-listings';
import { orderOutputFiles } from '@/features/scan-config/outputs/order';
import {
  getOutputStrategyById,
  resolveStrategyForRef,
} from '@/features/scan-config/outputs/registry';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TResolvedOutput } from '@/features/scan-config/outputs/types';
import type { TActivityCustomFile } from '@/features/scan-config/types';
import type { WorkspaceContext } from '@/types/common';

type Args = {
  /** Task activity whose `generated` refs are resolved; `undefined` while the run is unknown. */
  execution?: ITaskActivity;
  /** Virtual lab and project the entities are read from. */
  context: WorkspaceContext;
  /**
   * Whether strategies may poll for assets written after a run finishes.
   *
   * @defaultValue true
   */
  pollingEnabled?: boolean;
};

type Result = {
  /**
   * One row per file the resolved outputs expose, in `generated` order — each output's own files
   * arranged by {@link orderOutputFiles}.
   */
  files: TActivityCustomFile[];
  /** `true` while at least one generated ref is still resolving. */
  isLoading: boolean;
};

/**
 * Resolves a run's `generated` refs into the output files its panel lists.
 *
 * @param args - See {@link Args}.
 * @returns The resolved files and their loading state; see {@link Result}.
 *
 * @remarks
 * Each ref is resolved through the output strategy that claims it, so a run producing several
 * entities lists all of them, and a workflow producing an unanticipated shape still renders once a
 * strategy is registered for it.
 *
 * As a side effect, the Data listings the resolved entities belong to are refetched once every ref
 * has settled — see {@link invalidateDataListings}.
 */
export function useGeneratedOutputs({ execution, context, pollingEnabled = true }: Args): Result {
  const queryClient = useQueryClient();
  const refs = useMemo(() => execution?.generated ?? [], [execution?.generated]);

  const queries = useQueries({
    queries: refs.map((ref) => ({
      // the ref's own type is deliberately not in the key: it may be absent and get resolved
      // inside the query, and the entity behind an id cannot change type
      queryKey: ['scan-config-generated-output', context.virtualLabId, context.projectId, ref.id],
      queryFn: async (): Promise<TResolvedOutput | null> => {
        const resolved = await resolveStrategyForRef({ ref, context });
        if (!resolved) return null;

        return resolved.strategy.resolve({ ref: resolved.ref, context });
      },
      enabled: !!ref.id,
      refetchInterval: (query: {
        state: { data: TResolvedOutput | null | undefined; dataUpdateCount: number };
      }) => {
        const data = query.state.data ?? undefined;
        const strategy = getOutputStrategyById(data?.strategyId);
        if (!pollingEnabled || !strategy?.refetchInterval) return false;

        return strategy.refetchInterval({ data, dataUpdateCount: query.state.dataUpdateCount });
      },
    })),
  });

  const files = useMemo(
    () =>
      queries.flatMap(({ data }) => {
        if (!data) return [];

        const strategy = getOutputStrategyById(data.strategyId);
        if (!strategy) return [];

        return orderOutputFiles(strategy.toFiles(data), data.extendedType);
      }),
    [queries]
  );

  // Settled means no query is in flight, not that every ref produced data: a ref with no id keeps
  // its query disabled and therefore pending forever, which must not block the rest of the run.
  const settled = queries.every((query) => !query.isFetching);
  const listingTypes = settled
    ? [
        ...new Set(
          queries
            .map((query) => query.data?.extendedType)
            .filter((type): type is TExtendedEntitiesTypeDict => !!type)
        ),
      ].sort()
    : [];
  // Identifies the run as well as its types: two configs of one campaign feed the same listing,
  // and selecting the second must refresh it again rather than read as already handled.
  const invalidation = listingTypes.length
    ? `${execution?.id ?? ''}|${listingTypes.join(',')}`
    : '';
  const invalidated = useRef<string | null>(null);

  useEffect(() => {
    // Runs once per (run, types) pair, so a strategy polling for a late asset does not
    // re-invalidate on every poll tick.
    if (!invalidation || invalidated.current === invalidation) return;

    invalidated.current = invalidation;
    invalidateDataListings({ queryClient, listingTypes });
  }, [invalidation, listingTypes, queryClient]);

  return { files, isLoading: queries.some((query) => query.isLoading) };
}
