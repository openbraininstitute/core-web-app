'use client';

import { keepPreviousData, type UseQueryResult, useQueries, useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getSimulatableExtracellularRecordingArray } from '@/api/entitycore/queries/model/simulatable-extracellular-recording-array';
import { EntityTypeDict, type TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import { extracellularLocationsBlockDictionarySummary } from '@/api/one/generated/extracellular-locations-block-dictionary-summary';
import {
  downloadElectrodeLocations,
  findElectrodeLocationsAsset,
} from '@/features/scan-config/components/model-preview/electrode-locations-asset';
import {
  ELECTRODE_LOCATIONS_CONFIG_KEY,
  electrodeDictionaryToPlaceholderOverlays,
  electrodeSummaryToOverlays,
  hasElectrodeLocationsDictionary,
  type IElectrodeOverlaySource,
  mergeElectrodeOverlays,
  resolveElectrodeScanSelection,
  scanValueSelectionAtom,
} from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import {
  type IReferencedArrayRef,
  referencedArrayOverlays,
  selectReferencedArrayRefs,
} from '@/features/scan-config/components/model-preview/referenced-arrays';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type {
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
} from '@/api/entitycore/types/shared/global';
import type { TElectrodeLocationsDictionarySummary } from '@/api/one/generated/extracellular-locations-block-dictionary-summary';
import type { Config } from '@/features/scan-config/types';

/** Debounce before POSTing `block_dictionary_summary` on live form edits. */
const DEBOUNCE_MS = 80;

/** An array with no stored locations draws nothing, and is not an error. */
const NO_LOCATIONS: TElectrodeLocationsDictionarySummary = {};

/** Any entity carrying an `electrode_locations` asset. */
export type TElectrodeArrayEntity = EntityCoreIdentifiable &
  EntityCoreBaseAsset & {
    type?: string;
  };

interface IElectrodeOverlaysOptions {
  /** Live scan-config root object (reads `electrode_locations`). */
  config?: Config | null;
  /**
   * Existing simulatable extracellular recording array (or any entity carrying
   * an `electrode_locations` asset). Used when config has no live dictionary.
   */
  arrayEntity?: TElectrodeArrayEntity | null;
}

export interface IReferencedElectrodeOverlays extends IElectrodeOverlaySource {
  /** The config blocks that contributed overlays, in drawing order. */
  arrayRefs: IReferencedArrayRef[];
}

export interface IElectrodeOverlays extends IElectrodeOverlaySource {
  /** Overlay ids the 3D gizmo may move — only the array the form owns. */
  draggableOverlayIds: ReadonlySet<string>;
  /** Overlay id per {@link electrodeBlockPath}, for form-selection highlighting. */
  overlayIdByBlockPath: ReadonlyMap<string, string>;
}

type TArraySummaryResult = UseQueryResult<TElectrodeLocationsDictionarySummary, Error>;

/**
 * Debounces a value, coalescing rapid origin/rotation edits into one request.
 *
 * @param value - Value to debounce
 * @param delayMs - Quiet period before the value is published
 */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Builds the key of {@link IElectrodeOverlays.overlayIdByBlockPath}.
 *
 * Matching on the full path rather than the block name alone keeps an unrelated
 * block that shares a name from highlighting an overlay.
 *
 * @param rootElement - Schema root element, e.g. `recordings`
 * @param block - Block-dictionary entry name
 */
export function electrodeBlockPath(rootElement: string, block: string): string {
  return `${rootElement}/${block}`;
}

/**
 * Overlays for the array a scan-config is placing, or for one stored array.
 *
 * Resolution order:
 * 1. `config.electrode_locations` non-empty → debounced POST to
 *    `block_dictionary_summary`, merged over placeholders built from the form so
 *    markers appear before the response lands.
 * 2. Otherwise → download `arrayEntity`'s `electrode_locations` asset.
 *
 * `keepPreviousData` holds the last summary while a moved probe refetches, which
 * prevents a flash back to an unrotated placeholder.
 *
 * @param options.config - Scan-config with optional `electrode_locations`
 * @param options.arrayEntity - Stored array entity for the asset fallback
 * @returns Overlay groups plus availability / loading / error for the chrome
 *
 * @example
 * const { overlays, available } = usePlacedElectrodeOverlays({ config: scanConfig });
 */
export function usePlacedElectrodeOverlays({
  config,
  arrayEntity,
}: IElectrodeOverlaysOptions = {}): IElectrodeOverlaySource {
  const ctx = useWorkspace();
  const rawDictionary = config?.[ELECTRODE_LOCATIONS_CONFIG_KEY];
  const scanSelection = useAtomValue(scanValueSelectionAtom);
  // Only one coordinate of a sweep may be drawn, so collapse every swept
  // parameter to its active value before it reaches the API or the placeholders.
  const liveDictionary = useMemo(
    () => resolveElectrodeScanSelection(rawDictionary, scanSelection),
    [rawDictionary, scanSelection]
  );
  const hasLive = hasElectrodeLocationsDictionary(liveDictionary);

  // Primitive query dep: serialize so deep edits invalidate without object identity.
  const liveSerialized = useMemo(
    () => (hasLive ? JSON.stringify(liveDictionary) : ''),
    [hasLive, liveDictionary]
  );
  const debouncedSerialized = useDebouncedValue(liveSerialized, DEBOUNCE_MS);
  const debouncedPayload = useMemo((): Record<string, unknown> | null => {
    if (!debouncedSerialized) return null;
    try {
      return JSON.parse(debouncedSerialized) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [debouncedSerialized]);

  const liveQuery = useQuery({
    queryKey: [
      'electrode-locations-block-dictionary-summary',
      ctx.virtualLabId,
      ctx.projectId,
      debouncedSerialized,
    ],
    queryFn: () =>
      extracellularLocationsBlockDictionarySummary({
        ctx,
        payload: debouncedPayload ?? {},
      }),
    enabled: !!debouncedPayload && !!ctx.virtualLabId && !!ctx.projectId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const asset = findElectrodeLocationsAsset(arrayEntity?.assets);
  const entityType = arrayEntity?.type ?? EntityTypeDict.SimulatableExtracellularRecordingArray;

  const assetQuery = useQuery({
    queryKey: [
      'electrode-locations-asset',
      ctx.virtualLabId,
      ctx.projectId,
      arrayEntity?.id,
      asset?.id,
    ],
    queryFn: () => {
      if (!arrayEntity?.id || !asset?.id) {
        throw new Error('Missing electrode_locations asset');
      }
      return downloadElectrodeLocations({
        ctx,
        entityType: entityType as TEntityTypeDict,
        entityId: arrayEntity.id,
        assetId: asset.id,
      });
    },
    enabled: !hasLive && !!arrayEntity?.id && !!asset?.id && !!ctx.virtualLabId && !!ctx.projectId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const summary = hasLive ? liveQuery.data : assetQuery.data;
  const apiOverlays = useMemo(() => electrodeSummaryToOverlays(summary), [summary]);
  const placeholderOverlays = useMemo(() => {
    if (!hasLive || !liveDictionary || typeof liveDictionary !== 'object') return [];
    return electrodeDictionaryToPlaceholderOverlays(liveDictionary as Record<string, unknown>);
  }, [hasLive, liveDictionary]);
  const overlays = useMemo(
    () => mergeElectrodeOverlays(placeholderOverlays, apiOverlays),
    [placeholderOverlays, apiOverlays]
  );

  return {
    overlays,
    available: hasLive || Boolean(asset),
    isLoading: hasLive
      ? liveQuery.isLoading && placeholderOverlays.length === 0
      : assetQuery.isLoading,
    error: (hasLive ? liveQuery.error : assetQuery.error) as Error | null,
  };
}

/**
 * Overlays for the recording arrays a scan-config references.
 *
 * Geometry comes from each array's stored `electrode_locations` asset, keyed by
 * entity so two blocks on the same array share one download. Nothing here writes
 * back to the config.
 *
 * @param config - Live scan-config root
 * @returns Overlay groups plus the block references that produced them
 *
 * @example
 * const { overlays, arrayRefs } = useReferencedElectrodeOverlays(scanConfig);
 */
export function useReferencedElectrodeOverlays(
  config: Config | null | undefined
): IReferencedElectrodeOverlays {
  const ctx = useWorkspace();
  // Serialize, then parse back: the config object is new on every form edit, so
  // memoising on it alone would rebuild every overlay (and its Float32Array) per
  // keystroke. The round-trip keys the list on its contents.
  const arrayRefsKey = useMemo(() => JSON.stringify(selectReferencedArrayRefs(config)), [config]);
  const arrayRefs = useMemo(
    () => JSON.parse(arrayRefsKey) as IReferencedArrayRef[],
    [arrayRefsKey]
  );

  const queries = useMemo(
    () =>
      arrayRefs.map((ref) => ({
        queryKey: [
          'referenced-electrode-array-locations',
          ctx.virtualLabId,
          ctx.projectId,
          ref.entityId,
        ],
        queryFn: async (): Promise<TElectrodeLocationsDictionarySummary> => {
          const array = await getSimulatableExtracellularRecordingArray({
            id: ref.entityId,
            context: ctx,
          });
          const asset = findElectrodeLocationsAsset(array.assets);
          if (!asset) return NO_LOCATIONS;
          return downloadElectrodeLocations({
            ctx,
            entityId: ref.entityId,
            assetId: asset.id,
          });
        },
        enabled: !!ctx.virtualLabId && !!ctx.projectId,
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      })),
    [arrayRefs, ctx]
  );

  // `combine` rather than a `useMemo` over the results: that array is new on
  // every render, so overlays would be rebuilt and re-uploaded to morphoviewer.
  const combine = useCallback(
    (results: TArraySummaryResult[]) => ({
      overlays: results.flatMap((result, index) =>
        result.data ? referencedArrayOverlays(arrayRefs[index].block, result.data) : []
      ),
      isLoading: results.some((result) => result.isLoading),
      error: results.find((result) => result.error)?.error ?? null,
    }),
    [arrayRefs]
  );

  const { overlays, isLoading, error } = useQueries({ queries, combine });

  return { overlays, arrayRefs, available: arrayRefs.length > 0, isLoading, error };
}

/**
 * Every electrode overlay a circuit viewer should draw, from all sources:
 *
 * - {@link usePlacedElectrodeOverlays} — the array a form is placing under
 *   `electrode_locations`, or a stored array in a detail view. Editable in 3D.
 * - {@link useReferencedElectrodeOverlays} — arrays simulation recording blocks
 *   reference. Read-only.
 *
 * A new source is a hook returning {@link IElectrodeOverlaySource} plus one line
 * here.
 *
 * @param options.config - Live scan-config; omit to disable both sources
 * @param options.arrayEntity - Stored array to inspect (detail view)
 * @returns Combined overlays, the ids the gizmo may move, and the selection index
 *
 * @example
 * const { overlays, draggableOverlayIds } = useElectrodeOverlays({ config });
 */
export function useElectrodeOverlays({
  config,
  arrayEntity,
}: IElectrodeOverlaysOptions = {}): IElectrodeOverlays {
  const placed = usePlacedElectrodeOverlays({ config, arrayEntity });
  const referenced = useReferencedElectrodeOverlays(config);

  const overlays = useMemo(
    () => [...placed.overlays, ...referenced.overlays],
    [placed.overlays, referenced.overlays]
  );

  const draggableOverlayIds = useMemo(
    () => new Set(placed.overlays.map((group) => group.id)),
    [placed.overlays]
  );

  const overlayIdByBlockPath = useMemo(() => {
    const byPath = new Map<string, string>();
    for (const group of placed.overlays) {
      byPath.set(electrodeBlockPath(ELECTRODE_LOCATIONS_CONFIG_KEY, group.id), group.id);
    }
    for (const ref of referenced.arrayRefs) {
      byPath.set(electrodeBlockPath(ref.root, ref.block), ref.block);
    }
    return byPath;
  }, [placed.overlays, referenced.arrayRefs]);

  return {
    overlays,
    draggableOverlayIds,
    overlayIdByBlockPath,
    available: placed.available || referenced.available,
    isLoading: placed.isLoading || referenced.isLoading,
    error: placed.error ?? referenced.error,
  };
}
