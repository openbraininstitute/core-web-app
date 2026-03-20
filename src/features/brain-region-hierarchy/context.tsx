'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';
import { capitalize, isNil } from 'es-toolkit/compat';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { parseAsString, useQueryStates } from 'nuqs';
import { createContext, useContext } from 'react';

import { getBrainRegionHierarchy } from '@/api/entitycore/queries/general/brain-region';
import { flattenTreeAsObject, renameKeyDeep } from '@/components/tree/elements/helpers';
import { config } from '@/config';
import { useBrainRegionAtlasQuery } from '@/features/brain-atlas-viewer/context';
import {
  BrainRegionUrlBoundaryMode,
  type TBrainRegionUrlBoundaryMode,
} from '@/features/brain-region-hierarchy/constants';
import {
  getLeavesForEachRegion,
  getLeavesForEachRegionExtended,
  injectHierarchyId,
  mergeHierarchyWithAtlas,
  normalizeBrainRegionName,
} from '@/features/brain-region-hierarchy/helpers';
import {
  useHierarchyRuntimeMetadataQuery,
  useRemoteUserPreferenceHierarchySpeciesQuery,
} from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { keyBuilderHierarchy } from '@/ui/use-query-keys/atlas';
import { log } from '@/utils/logger';

import type { IBrainAtlasRegion } from '@/api/entitycore/types/entities/brain-atlas';
import type {
  BrainRegionHierarchyBase,
  IBrainRegionHierarchy,
} from '@/api/entitycore/types/entities/brain-region';
import type {
  BrainRegionHierarchySelection,
  IBrainRegionHierarchyExtended,
  IWorkspaceSpecies,
  TBrainRegionHierarchyExtendedOption,
  TBrainRegionHierarchyOption,
} from '@/features/brain-region-hierarchy/types';

export const VERSIONED__SPECIES_BRAIN_REGION_SELECTION_SNAPSHOT =
  'species-brain-region-selection-snapshot-v06-02-2026';

/**
 * url parameter keys for brain region hierarchy
 */
export const URL_PARAMS = {
  BRAIN_REGION_ID: 'br_id',
  HIERARCHY_ID: 'h_id',
} as const;

export const { APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID, MOUSE_ATLAS__ID } = config;

export const brainRegionSidebarAtom = atom(false);
export const selectedBrainRegionAtom = atom<BrainRegionHierarchyBase | null>(null);

export type BrainRegionUrlOverride = {
  brainRegionId: string;
  hierarchyId: string;
};
export const BrainRegionUrlBoundaryContext = createContext<{
  mode: TBrainRegionUrlBoundaryMode;
  urlOverride: BrainRegionUrlOverride | null;
}>({
  mode: BrainRegionUrlBoundaryMode.None,
  urlOverride: null,
});

export function useBrainRegionUrlBoundaryContext() {
  return useContext(BrainRegionUrlBoundaryContext);
}

/**
 * atom for storing the currently selected species information
 * used for multi-species brain region hierarchy support
 */
export const workspaceHierarchySpeciesAtom = atom<IWorkspaceSpecies | null>(null);

/**
 * write brain-region and hierarchy identifiers from the URL query string.
 *
 * uses `useQueryStates` to manage two query parameters:
 * - `brainRegionId` (mapped to `URL_PARAMS.BRAIN_REGION_ID`)
 * - `hierarchyId` (mapped to `URL_PARAMS.HIERARCHY_ID`)
 */
export function useHierarchyBrainRegionUrlState() {
  const [urlState, setUrlState] = useQueryStates(
    {
      brainRegionId: parseAsString.withDefault(''),
      hierarchyId: parseAsString.withDefault(''),
    },
    {
      urlKeys: {
        brainRegionId: URL_PARAMS.BRAIN_REGION_ID,
        hierarchyId: URL_PARAMS.HIERARCHY_ID,
      },
      shallow: false,
      clearOnDefault: false,
    }
  );
  return { urlState, setUrlState };
}

/**
 * resolves the root brain-region hierarchy and prepares a selectable list of regions.
 */
/**
 * Retrieves the root brain-region hierarchy and provides a flattened list of options for UI controls.
 *
 * Resolution priority for the hierarchy id:
 * 1. Transient URL override (when a sync boundary is mounted)
 * 2. Remote user preference
 * 3. Local storage
 * 4. APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID
 *
 * @Remarks
 * - The query is enabled only when a resolved hierarchyId is truthy and the remote preference is not loading.
 * - While the query is loading, or if an error occurs, or if root is unavailable, the returned options array is empty.
 * - Once loaded, the hierarchy tree is returned as `root` and a flattened `options` array is produced by flattenTreeAsObject.
 * - Each option has the shape { value, label, data } where data contains the region plus hierarchy_id set to the resolved hierarchy id.
 */
export const useBrainRegionRootHierarchyQuery = (config?: { hId?: string }) => {
  const { remoteUserPreferenceHierarchySpecies, loading: loadingRemote } =
    useRemoteUserPreferenceHierarchySpeciesQuery();
  const { urlOverride } = useBrainRegionUrlBoundaryContext();
  const [browserStorageHierarchy] = useLocalStorage<BrainRegionHierarchySelection | null>(
    VERSIONED__SPECIES_BRAIN_REGION_SELECTION_SNAPSHOT,
    null
  );
  // Priority: URL override > Remote ID > browser storage selection > config default
  const hierarchyId =
    urlOverride?.hierarchyId ||
    remoteUserPreferenceHierarchySpecies?.hierarchy_id ||
    browserStorageHierarchy?.hierarchyId ||
    APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID;

  const usedHierarchyId = config?.hId ?? hierarchyId;

  function select(result: IBrainRegionHierarchy, explicitHierarchyId = usedHierarchyId) {
    return {
      root: injectHierarchyId(result, explicitHierarchyId),
      options: flattenTreeAsObject<IBrainRegionHierarchy>(result).map((region) => ({
        value: region.id,
        label: capitalize(`${region.name}`),
        data: { ...region, hierarchy_id: explicitHierarchyId },
      })),
    };
  }

  const queryOption = (id: string, enabled?: boolean) =>
    queryOptions({
      queryKey: keyBuilderHierarchy.hierarchy({ id }),
      queryFn: () => getBrainRegionHierarchy({ id }),
      enabled,
      select: (result) => select(result, id),
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnWindowFocus: false,
    });

  const { data, isLoading, error } = useQuery(
    queryOption(config?.hId ?? hierarchyId, !!usedHierarchyId && !loadingRemote)
  );

  if (isLoading || error || !data) {
    return {
      select,
      queryOption,
      result: {
        root: data?.root || null,
        workspaceHierarchyId: usedHierarchyId,
        options: [],
      },
      error,
      loading: isLoading,
    };
  }

  const loadingRootHierarchy = isLoading || loadingRemote;

  return {
    select,
    queryOption,
    result: {
      root: data.root,
      workspaceHierarchyId: usedHierarchyId,
      options: data.options,
    },
    loading: loadingRootHierarchy,
    error,
  };
};

export const usePrimaryHierarchyOfCurrentSpeciesQuery = () => {
  const {
    result: { root: master },
    loading: loadingRootHierarchy,
    error,
  } = useBrainRegionRootHierarchyQuery();

  if (master) {
    const root = master;
    let options: Array<TBrainRegionHierarchyOption> = [];
    let leaves: Map<string, IBrainRegionHierarchy[]> = new Map();
    const nodes = renameKeyDeep<IBrainRegionHierarchy>(root, 'color_hex_triplet', 'color', true);

    if (root) {
      options = flattenTreeAsObject<IBrainRegionHierarchy>(root)
        .map((region) => {
          return {
            av: region.annotation_value,
            value: region.id,
            label: normalizeBrainRegionName(`${region.name}`),
            data: {
              ...region,
              children: region.children.filter((o) => !isNil(o)),
              color_hex_triplet: region.color_hex_triplet,
              color: region.color_hex_triplet,
            },
          };
        })
        .filter((o) => !isNil(o));
      leaves = getLeavesForEachRegion(root);
    }

    return {
      error,
      result: { root, nodes, options, leaves },
      loading: loadingRootHierarchy,
    };
  }

  return {
    error: new Error('No master found'),
    result: null,
    loading: loadingRootHierarchy,
  };
};

export const usePrimaryExtendedHierarchySpeciesQuery = () => {
  const {
    result: { root: master, workspaceHierarchyId },
    loading: loadingRootHierarchy,
  } = useBrainRegionRootHierarchyQuery();
  const { runtimeHierarchyById } = useHierarchyRuntimeMetadataQuery();
  const resolvedAtlasId = runtimeHierarchyById.get(workspaceHierarchyId)?.atlasId;
  const {
    result: { atlas },
    loadingAtlas,
    error: atlasError,
  } = useBrainRegionAtlasQuery({ id: resolvedAtlasId });

  if (!master) {
    return {
      result: null,
      loading: loadingRootHierarchy,
    };
  }

  if (atlasError) {
    log('warn', 'Failed to fetch brain atlas regions:', atlasError);
  }

  const atlasMap = new Map<string, IBrainAtlasRegion>();
  for (const region of atlas ?? []) {
    atlasMap.set(region.brain_region_id, region);
  }

  // merge hierarchy with atlas data
  const root = mergeHierarchyWithAtlas(master, atlasMap);

  const nodes = renameKeyDeep<IBrainRegionHierarchyExtended>(
    root,
    'color_hex_triplet',
    'color',
    true
  );

  const options: Array<TBrainRegionHierarchyExtendedOption> =
    flattenTreeAsObject<IBrainRegionHierarchyExtended>(root)
      .map((region) => ({
        av: region.annotation_value,
        value: region.id,
        label: capitalize(`${region.name}`),
        data: {
          ...region,
          children: region.children.filter((o) => !isNil(o)),
          color_hex_triplet: region.color_hex_triplet,
          color: region.color_hex_triplet,
        } as IBrainRegionHierarchyExtended,
      }))
      .filter((o) => !isNil(o));

  const leaves = getLeavesForEachRegionExtended(root);

  return {
    result: { root, nodes, options, leaves },
    loading: loadingRootHierarchy || (!!resolvedAtlasId && loadingAtlas),
  };
};

export const useSetSelectedBrainRegion = () => {
  const updateSelectedBrainRegion = useSetAtom(selectedBrainRegionAtom);
  return { updateSelectedBrainRegion };
};

export const useGetSelectedBrainRegion = () => {
  const selectedBrainRegion = useAtomValue(selectedBrainRegionAtom);
  return { selectedBrainRegion };
};
