'use client';

import { type UseQueryResult, useQueries } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import {
  previewMorphologyLocations,
  type TPreviewedMorphologyLocation,
} from '@/api/one/morphology-locations';
import { getObiOneErrorReason, toObiOneErrorBody } from '@/api/one/utils';
import {
  type ITaggedLocation,
  readGeneratedBlocks,
  readLocationsDictionary,
} from '@/features/scan-config/components/model-preview/morphology-locations-block';
import { useDebouncedValue } from '@/hooks/hooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { logError } from '@/utils/logger';

import type { Config } from '@/features/scan-config/types';

/**
 * Quiet period after an edit before a block is previewed again. Aborting a superseded request
 * does not stop the backend, which resolves previews synchronously in its shared API process.
 */
const DEBOUNCE_MS = 600;

/** For a failure the backend did not explain: a dropped connection, or a reply of the wrong shape. */
const UNEXPLAINED_ERROR = 'The preview service could not be reached. Try again later.';

const NO_BLOCKS = '[]';

type TPreviewResult = UseQueryResult<TPreviewedMorphologyLocation[]>;

/** Where the query key holds a block's entry, which a placeholder must share. */
const ENTRY_KEY_INDEX = 4;

/**
 * Where each generated `morphology_locations` block would place its locations, before any
 * workflow runs.
 *
 * One query per block, keyed on its content: editing one block does not refetch the others, each
 * block is drawn as soon as its own reply arrives, and a superseded request is aborted. An edited
 * block keeps its previous locations on screen while it refetches.
 *
 * @param options.entityId - MEModel or single-neuron circuit the blocks are sampled on
 * @param options.enabled - Off for models the endpoint does not accept
 */
export function useMorphologyLocationPreviews({
  config,
  entityId,
  enabled,
}: {
  config?: Config | null;
  entityId: string;
  enabled: boolean;
}) {
  const ctx = useWorkspace();
  const dictionary = readLocationsDictionary(config);
  // Read through the dictionary, whose identity survives edits elsewhere in the form.
  const live = useMemo(
    () =>
      new Map(
        enabled
          ? readGeneratedBlocks(dictionary).map(([entry, block]) => [entry, JSON.stringify(block)])
          : []
      ),
    [enabled, dictionary]
  );
  const serialized = useMemo(
    () => (live.size === 0 ? NO_BLOCKS : JSON.stringify([...live])),
    [live]
  );
  const debounced = useDebouncedValue(serialized, DEBOUNCE_MS);
  // Content as a string, so the key and the placeholder compare blocks without a deep walk.
  const blocks = useMemo(() => JSON.parse(debounced) as Array<[string, string]>, [debounced]);

  const queries = useMemo(
    () =>
      blocks.map(([entry, block]) => ({
        queryKey: [
          'morphology-locations-preview',
          ctx.virtualLabId,
          ctx.projectId,
          entityId,
          entry,
          block,
        ],
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
          try {
            return await previewMorphologyLocations({
              ctx,
              entityId,
              block: JSON.parse(block),
              signal,
            });
          } catch (error) {
            if (!signal.aborted && !toObiOneErrorBody(error)) {
              logError('Morphology-locations preview failed', error);
            }
            throw error;
          }
        },
        enabled: Boolean(ctx.virtualLabId && ctx.projectId),
        staleTime: Infinity,
        // A 422 says the same on every try, and the backend is costly to ask.
        retry: false,
        // Only the same block's last locations may stand in while it refetches.
        placeholderData: (
          previous: TPreviewedMorphologyLocation[] | undefined,
          previousQuery?: { queryKey: readonly unknown[] }
        ) => (previousQuery?.queryKey[ENTRY_KEY_INDEX] === entry ? previous : undefined),
        refetchOnWindowFocus: false,
      })),
    [blocks, ctx, entityId]
  );

  // `combine` keeps its result while the results do not change, so the markers are not rebuilt.
  const combine = useCallback(
    (results: TPreviewResult[]) => {
      const entries: string[] = [];
      const locations: ITaggedLocation[] = [];
      const errors = new Map<string, string>();
      const pending = new Set<string>();
      results.forEach((result, index) => {
        const [entry, block] = blocks[index];
        const current = live.get(entry);
        // Deleted while the debounce runs: nothing of it may linger.
        if (current === undefined) return;
        entries.push(entry);
        if (result.isFetching || current !== block) pending.add(entry);
        if (result.error) errors.set(entry, previewErrorReason(result.error));
        result.data?.forEach((location, row) => {
          locations.push({ ...location, entry, index: row, generated: true });
        });
      });
      // Added, and waiting out the debounce.
      for (const entry of live.keys()) if (!entries.includes(entry)) pending.add(entry);
      return { entries, locations, errors, pending };
    },
    [blocks, live]
  );

  return useQueries({ queries, combine });
}

function previewErrorReason(error: unknown): string {
  const body = toObiOneErrorBody(error);
  return body ? getObiOneErrorReason(body) : UNEXPLAINED_ERROR;
}
