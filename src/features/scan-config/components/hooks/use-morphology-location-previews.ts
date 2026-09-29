'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { previewMorphologyLocations } from '@/api/one/morphology-locations';
import { getObiOneErrorReason, toObiOneErrorBody } from '@/api/one/utils';
import {
  type ITaggedLocation,
  readGeneratedBlocks,
  readLocationsDictionary,
} from '@/features/scan-config/components/model-preview/morphology-locations-block';
import { useDebouncedValue } from '@/hooks/hooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { Config } from '@/features/scan-config/types';

/** Quiet period after an edit before the blocks are previewed again. */
const DEBOUNCE_MS = 300;

const NO_BLOCKS = '[]';
const NO_LOCATIONS: ITaggedLocation[] = [];

type TBlockPreview = {
  entry: string;
  locations: ITaggedLocation[];
  /** Why the backend would not preview this block, e.g. it holds a parameter sweep. */
  error: string | null;
};

/**
 * Where each generated `morphology_locations` block would place its locations, before any
 * workflow runs.
 *
 * One POST per block, each cached on the block's own content, so editing one block does not
 * refetch the others. The previous locations stay on screen while an edited block refetches.
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
  const queryClient = useQueryClient();
  const dictionary = readLocationsDictionary(config);
  // Read through the dictionary, whose identity survives edits elsewhere in the form.
  const serialized = useMemo(
    () => (enabled ? JSON.stringify(readGeneratedBlocks(dictionary)) : NO_BLOCKS),
    [enabled, dictionary]
  );
  const debounced = useDebouncedValue(serialized, DEBOUNCE_MS);

  const query = useQuery({
    queryKey: [
      'morphology-locations-previews',
      ctx.virtualLabId,
      ctx.projectId,
      entityId,
      debounced,
    ],
    queryFn: () => {
      const blocks = JSON.parse(debounced) as Array<[string, Record<string, unknown>]>;
      return Promise.all(
        blocks.map(async ([entry, block]): Promise<TBlockPreview> => {
          try {
            const locations = await queryClient.fetchQuery({
              queryKey: [
                'morphology-locations-preview',
                ctx.virtualLabId,
                ctx.projectId,
                entityId,
                JSON.stringify(block),
              ],
              queryFn: ({ signal }) => previewMorphologyLocations({ ctx, entityId, block, signal }),
              staleTime: Infinity,
            });
            return {
              entry,
              locations: locations.map((location, index) => ({
                ...location,
                entry,
                index,
                generated: true,
              })),
              error: null,
            };
          } catch (error) {
            const body = toObiOneErrorBody(error);
            return {
              entry,
              locations: NO_LOCATIONS,
              error: body ? getObiOneErrorReason(body) : String(error),
            };
          }
        })
      );
    },
    enabled: debounced !== NO_BLOCKS && Boolean(ctx.virtualLabId && ctx.projectId),
    // Real data rather than nothing: a disabled query would show the last block's placeholder,
    // and hand it on to the next block's preview, bringing a deleted block's markers back.
    initialData: debounced === NO_BLOCKS ? [] : undefined,
    placeholderData: keepPreviousData,
    // A block that failed is held as a result, not thrown, so it would be cached for good. Left
    // stale, it is asked for again on the next mount or reconnect.
    staleTime: ({ state }) => (state.data?.some(({ error }) => error !== null) ? 0 : Infinity),
    refetchOnWindowFocus: false,
  });

  const previews = query.data;
  const locations = useMemo(
    () => previews?.flatMap((preview) => preview.locations) ?? NO_LOCATIONS,
    [previews]
  );
  const errors = useMemo(
    () =>
      new Map(previews?.flatMap(({ entry, error }) => (error ? [[entry, error] as const] : []))),
    [previews]
  );

  return {
    locations,
    /** Why a block could not be previewed, by entry. */
    errors,
    /** An edit is waiting out the debounce, or its preview is on its way. */
    isPending: serialized !== debounced || query.isFetching,
  };
}
