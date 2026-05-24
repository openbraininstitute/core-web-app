'use client';

/**
 * @module use-resolved-entities
 *
 * react query hook that hydrates fromID / session refs into named entity records
 * for summary cards and browse cart seeding.
 */

import { useQueries } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';

import { retrieveEntities } from '@/entity-configuration/domain/requests';
import {
  isFromIdRef,
  resolveEntityFetchTarget,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { TFromIdRef } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/types';
import type { TWorkflowSessionSelectionRef } from '@/features/scan-config/workflow/workflow-session-selection';
import type { WorkspaceContext } from '@/types/common';

const ENTITY_ID_IN_CHUNK_SIZE = 20;

type TResolvableRef = TFromIdRef | TWorkflowSessionSelectionRef;

type TResolvedFetch = {
  entityType: TExtendedEntitiesTypeDict;
  id: string;
  fromIdType: string;
};

type TEntityBatch = {
  entityType: TExtendedEntitiesTypeDict;
  ids: string[];
};

function buildEntityBatches(resolvedFetches: readonly TResolvedFetch[]): TEntityBatch[] {
  const idsByType = new Map<TExtendedEntitiesTypeDict, Set<string>>();

  for (const fetch of resolvedFetches) {
    const current = idsByType.get(fetch.entityType) ?? new Set<string>();
    current.add(fetch.id);
    idsByType.set(fetch.entityType, current);
  }

  return [...idsByType.entries()].flatMap(([entityType, idSet]) => {
    const sortedIds = [...idSet].sort();
    const batches: TEntityBatch[] = [];

    for (let index = 0; index < sortedIds.length; index += ENTITY_ID_IN_CHUNK_SIZE) {
      batches.push({
        entityType,
        ids: sortedIds.slice(index, index + ENTITY_ID_IN_CHUNK_SIZE),
      });
    }

    return batches;
  });
}

function entityCacheKey(entityType: TExtendedEntitiesTypeDict, id: string): string {
  return `${entityType}:${id}`;
}

function pruneEntityCache(
  cache: Map<string, EntityCoreIdentifiableNamed>,
  activeKeys: ReadonlySet<string>
): void {
  for (const key of cache.keys()) {
    if (!activeKeys.has(key)) {
      cache.delete(key);
    }
  }
}
function findBatchIndexForFetch(
  entityBatches: readonly TEntityBatch[],
  fetch: TResolvedFetch
): number {
  return entityBatches.findIndex(
    (batch) => batch.entityType === fetch.entityType && batch.ids.includes(fetch.id)
  );
}

/**
 * fetches entity core records for config refs and optional session refs
 *
 * session refs matching by `id` take precedence for fetch target resolution
 * (browse extended types); badge labels in summary still use FromID mapping
 *
 * @param refs: fromID refs from parsed config (or session refs during hydration)
 * @param sessionRefs: optional workflow session refs for browse → configure handoff
 * @param context: virtual lab + project workspace context for API calls
 * @returns `{ entities, isLoading, pendingIds }` - batched list queries with 60s stale time
 */
export function useResolvedModelIdentifierEntities({
  refs,
  sessionRefs,
  context,
}: {
  refs: readonly TResolvableRef[];
  sessionRefs?: readonly TWorkflowSessionSelectionRef[];
  context: WorkspaceContext;
}) {
  const resolvedFetches = useMemo((): TResolvedFetch[] => {
    const sessionById = new Map(
      (sessionRefs ?? []).map((sessionRef) => [sessionRef.id, sessionRef] as const)
    );

    return refs.flatMap((ref) => {
      const refId = 'id_str' in ref ? ref.id_str : ref.id;
      const fromIdType = isFromIdRef(ref) ? ref.type : '';
      const sessionMatch = sessionById.get(refId);

      if (sessionMatch) {
        return [{ entityType: sessionMatch.type, id: sessionMatch.id, fromIdType }];
      }

      const fetchTarget = resolveEntityFetchTarget(ref);
      if (!fetchTarget) {
        return [];
      }

      return [{ ...fetchTarget, fromIdType }];
    });
  }, [refs, sessionRefs]);

  const entityBatches = useMemo(() => buildEntityBatches(resolvedFetches), [resolvedFetches]);
  const entityCacheRef = useRef(new Map<string, EntityCoreIdentifiableNamed>());

  const queryOptions = useMemo(
    () =>
      entityBatches.map((batch) => ({
        queryKey: keyBuilder.entities({
          context,
          type: batch.entityType,
          filters: { id__in: batch.ids },
          withFacets: false,
        }),
        queryFn: () => retrieveEntities({ type: batch.entityType, ids: batch.ids, ctx: context }),
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      })),
    [context, entityBatches]
  );

  return useQueries({
    queries: queryOptions,
    combine: (results) => {
      results.forEach((result, index) => {
        const batch = entityBatches[index];
        if (!result.data || !batch) {
          return;
        }

        for (const entity of result.data) {
          entityCacheRef.current.set(entityCacheKey(batch.entityType, entity.id), entity);
        }
      });

      const activeKeys = new Set(
        resolvedFetches.map((fetch) => entityCacheKey(fetch.entityType, fetch.id))
      );
      pruneEntityCache(entityCacheRef.current, activeKeys);

      const entityByKey = new Map(entityCacheRef.current);

      const entities = resolvedFetches.flatMap((fetch) => {
        const entity = entityByKey.get(entityCacheKey(fetch.entityType, fetch.id));
        if (!entity) {
          return [];
        }

        return [
          {
            ...entity,
            entityType: fetch.entityType,
            fromIdType: fetch.fromIdType,
          },
        ];
      });

      const pendingIds = new Set<string>();

      for (const fetch of resolvedFetches) {
        const key = entityCacheKey(fetch.entityType, fetch.id);
        if (entityByKey.has(key)) {
          continue;
        }

        const batchIndex = findBatchIndexForFetch(entityBatches, fetch);
        if (batchIndex >= 0 && results[batchIndex]?.isPending) {
          pendingIds.add(fetch.id);
        }
      }

      return {
        entities,
        isLoading: results.some((result) => result.isLoading),
        pendingIds,
      };
    },
  });
}
