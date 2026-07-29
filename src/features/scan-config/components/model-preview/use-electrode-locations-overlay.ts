'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import {
  AssetLabel,
  type EntityCoreBaseAsset,
  type EntityCoreIdentifiable,
  type IAsset,
} from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import {
  type ElectrodeLocationsDictionarySummary,
  extracellularLocationsBlockDictionarySummary,
} from '@/api/one/generated/extracellular-locations-block-dictionary-summary';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import {
  type CircuitOverlayGroup,
  ELECTRODE_LOCATIONS_CONFIG_KEY,
  electrodeDictionaryToPlaceholderOverlays,
  electrodeSummaryToOverlays,
  hasElectrodeLocationsDictionary,
  mergeElectrodeOverlays,
  resolveElectrodeScanSelection,
  scanValueSelectionAtom,
} from './electrode-locations-overlay';

import type { Config } from '@/features/scan-config/types';

/** Debounce before POSTing `block_dictionary_summary` on live form edits. */
const DEBOUNCE_MS = 80;

/**
 * Debounce any value by `delayMs` (used to coalesce rapid origin/rotation edits).
 *
 * Why: each keystroke / drag-end would otherwise spam Obi-One summary.
 */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

type ArrayEntity = EntityCoreIdentifiable &
  EntityCoreBaseAsset & {
    type?: string;
  };

interface Options {
  /** Live scan-config root object (reads `electrode_locations`). */
  config?: Config | null;
  /**
   * Existing simulatable extracellular recording array (or any entity carrying
   * an `electrode_locations` asset). Used when config has no live dictionary.
   */
  arrayEntity?: ArrayEntity | null;
}

/**
 * Find the `electrode_locations` asset on an entity, if any.
 *
 * Why: read-only preview of a stored array entity when the form has no live dict.
 */
function findElectrodeLocationsAsset(assets: IAsset[] | undefined): IAsset | undefined {
  return getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.electrode_locations,
  });
}

/**
 * Live + stored electrode overlays for the circuit viewer.
 *
 * How:
 * 1. If `config.electrode_locations` is a non-empty dict → debounce → POST
 *    `block_dictionary_summary` → {@link electrodeSummaryToOverlays}.
 * 2. In parallel, build placeholders from the live form so markers appear
 *    immediately ({@link electrodeDictionaryToPlaceholderOverlays}).
 * 3. {@link mergeElectrodeOverlays} prefers API geometry per id.
 * 4. Else fall back to downloading the entity’s `electrode_locations` asset.
 *
 * Why `keepPreviousData`: after a 3D move the query key changes; without it the
 * UI briefly drops to unrotated placeholders (rotation-0 flash).
 *
 * @param options.config - Scan-config with optional `electrode_locations`
 * @param options.arrayEntity - Optional stored array entity for asset fallback
 * @returns Overlay groups plus availability / loading / error for the chrome
 *
 * @example
 * const { overlays, available } = useElectrodeLocationsOverlay({ config: scanConfig });
 */
export function useElectrodeLocationsOverlay({ config, arrayEntity }: Options = {}): {
  overlays: CircuitOverlayGroup[];
  /** True when live config or a stored asset can supply electrode locations. */
  available: boolean;
  isLoading: boolean;
  error: Error | null;
} {
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
    // Keep the last summary while origin/rotation refetch so the probe does not
    // flash to an unrotated placeholder between drag-end and the new response.
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
    queryFn: async () => {
      if (!arrayEntity?.id || !asset?.id) {
        throw new Error('Missing electrode_locations asset');
      }
      return downloadAsset<ElectrodeLocationsDictionarySummary>({
        ctx,
        entityType: entityType as typeof EntityTypeDict.SimulatableExtracellularRecordingArray,
        entityId: arrayEntity.id,
        id: asset.id,
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
    /** True when live config or a stored asset can supply electrode locations. */
    available: hasLive || Boolean(asset),
    isLoading: hasLive
      ? liveQuery.isLoading && placeholderOverlays.length === 0
      : assetQuery.isLoading,
    error: (hasLive ? liveQuery.error : assetQuery.error) as Error | null,
  };
}
