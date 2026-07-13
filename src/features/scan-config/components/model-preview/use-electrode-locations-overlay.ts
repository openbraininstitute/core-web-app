'use client';

import { useQuery } from '@tanstack/react-query';
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
  electrodeSummaryToOverlays,
  hasElectrodeLocationsDictionary,
} from './electrode-locations-overlay';

import type { Config } from '@/features/scan-config/types';

const DEBOUNCE_MS = 350;

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

function findElectrodeLocationsAsset(assets: IAsset[] | undefined): IAsset | undefined {
  return getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.electrode_locations,
  });
}

/**
 * Live + stored electrode overlays for the circuit viewer.
 *
 * Discovery is hardcoded to the `electrode_locations` config key (no schema
 * metadata). Live edits POST `block_dictionary_summary` via React Query with a
 * debounced payload; stored arrays fall back to the `electrode_locations` asset.
 */
export function useElectrodeLocationsOverlay({ config, arrayEntity }: Options = {}): {
  overlays: CircuitOverlayGroup[];
  /** True when live config or a stored asset can supply electrode locations. */
  available: boolean;
  isLoading: boolean;
  error: Error | null;
} {
  const ctx = useWorkspace();
  const liveDictionary = config?.[ELECTRODE_LOCATIONS_CONFIG_KEY];
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
  const overlays = useMemo(() => electrodeSummaryToOverlays(summary), [summary]);

  return {
    overlays,
    /** True when live config or a stored asset can supply electrode locations. */
    available: hasLive || Boolean(asset),
    isLoading: hasLive ? liveQuery.isLoading : assetQuery.isLoading,
    error: (hasLive ? liveQuery.error : assetQuery.error) as Error | null,
  };
}
