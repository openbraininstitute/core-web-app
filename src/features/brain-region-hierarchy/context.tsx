'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';
import { capitalize, isNil } from 'es-toolkit/compat';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { parseAsString, useQueryStates } from 'nuqs';

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

import { getBrainRegionHierarchy } from '@/api/entitycore/queries/general/brain-region';
import {
  findNodeByKey,
  flattenTreeAsObject,
  renameKeyDeep,
} from '@/components/tree/elements/helpers';
import { config } from '@/config';
import { useBrainRegionAtlasQuery } from '@/features/brain-atlas-viewer/context';
import {
  getLeavesForEachRegion,
  getLeavesForEachRegionExtended,
  injectHierarchyId,
  mergeHierarchyWithAtlas,
} from '@/features/brain-region-hierarchy/helpers';
import { useRemoteUserPreferenceHierarchySpeciesQuery } from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { keyBuilderHierarchy } from '@/ui/use-query-keys/atlas';
import { log } from '@/utils/logger';

export const defaultExploreRegion = {
  id: 'http://api.brain-map.org/api/v2/data/Structure/567',
  title: 'Cerebrum',
};

export const VERSIONED__SPECIES_BRAIN_REGION_SELECTION_SNAPSHOT =
  'species-brain-region-selection-snapshot-v06-02-2026';

/**
 * url parameter keys for brain region hierarchy
 */
export const URL_PARAMS = {
  BRAIN_REGION_ID: 'br_id',
  HIERARCHY_ID: 'h_id',
} as const;

export const {
  APP_DEFAULT__BRAIN_ATLAS__ID,
  APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID,
  // MOUSE
  MOUSE_ROOT__BRAIN_REGION_ID,
  MOUSE_ROOT__BRAIN_REGION_ANNOTATION_VALUE, // 997
  MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID,
  MOUSE_PRIMARY__DIVISION_ANNOTATION_VALUE, // 8
  MOUSE_ATLAS__ID,
  // HUMAN
  HUMAN_ROOT__BRAIN_REGION_ID,
  HUMAN_ROOT__BRAIN_REGION_ANNOTATION_VALUE, // 999
  HUMAN_DEFAULT__SELECTED_BRAIN_REGION_ID,
  HUMAN_PRIMARY__DIVISION_ANNOTATION_VALUE, // 999
  HUMAN_ATLAS__ID,
} = config;

// MOUSE
// Awful but requested from entitycore for the moment
export const MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ANNOTATION_VALUE = 567; // Cerebrum
export const MOUSE_DEFAULT__SELECTED_BRAIN_REGION_NAME = 'Cerebrum';

// HUMAN
// Awful but requested from entitycore for the moment
export const HUMAN_DEFAULT__SELECTED_BRAIN_REGION_ANNOTATION_VALUE = 525; // Telencephalon
export const HUMAN_DEFAULT__SELECTED_BRAIN_REGION_NAME = 'telencephalon';

// Query
export const DEFAULT_BRAIN_REGION_ANNOTATION_FIELD = 'annotation_value';
export const DEFAULT_BRAIN_REGION_QUERY_ID = 'br_id';
export const DEFAULT_BRAIN_REGION_QUERY_ANNOTATION_VALUE = 'br_av';

export const AppSpeciesBrainRegionConfig = {
  Common: {
    name: 'Common',
    DefaultHierarchyId: config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID,
    DefaultAtlasId: config.APP_DEFAULT__BRAIN_ATLAS__ID,
  },
  Human: {
    name: 'Human',
    atlasId: HUMAN_ATLAS__ID,
    RootId: HUMAN_ROOT__BRAIN_REGION_ID,
    RootAnnotationValue: HUMAN_ROOT__BRAIN_REGION_ANNOTATION_VALUE, // 999
    PrimaryDivisionAnnotationValue: HUMAN_PRIMARY__DIVISION_ANNOTATION_VALUE, // 999
    DefaultSelectedId: HUMAN_DEFAULT__SELECTED_BRAIN_REGION_ID,
    DefaultSelectedAnnotationValue: HUMAN_DEFAULT__SELECTED_BRAIN_REGION_ANNOTATION_VALUE,
    DefaultSelectedName: HUMAN_DEFAULT__SELECTED_BRAIN_REGION_NAME,
  },
  Mouse: {
    name: 'Mouse',
    atlasId: MOUSE_ATLAS__ID,
    RootId: MOUSE_ROOT__BRAIN_REGION_ID,
    RootAnnotationValue: MOUSE_ROOT__BRAIN_REGION_ANNOTATION_VALUE, // 997
    PrimaryDivisionAnnotationValue: MOUSE_PRIMARY__DIVISION_ANNOTATION_VALUE, // 8
    DefaultSelectedId: MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID,
    DefaultSelectedAnnotationValue: MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ANNOTATION_VALUE,
    DefaultSelectedName: MOUSE_DEFAULT__SELECTED_BRAIN_REGION_NAME,
  },
};

export function getSpeciesConfigByHierarchyId(hId: string) {
  return hId === AppSpeciesBrainRegionConfig.Common.DefaultHierarchyId
    ? AppSpeciesBrainRegionConfig.Mouse
    : AppSpeciesBrainRegionConfig.Human;
}
/**
 * Get the species config by atlas ID
 * @param aId string
 * @returns species configuration
 *
 * @remarks this is only for debugging purposes, generally you should use getSpeciesConfigByHierarchyId
 */
export function getSpeciesConfigByAtlasId(aId: string) {
  return aId === AppSpeciesBrainRegionConfig.Common.DefaultAtlasId
    ? AppSpeciesBrainRegionConfig.Mouse
    : AppSpeciesBrainRegionConfig.Human;
}

export const brainRegionSidebarAtom = atom(false);
export const selectedBrainRegionAtom = atom<BrainRegionHierarchyBase | null>(null);

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
 * 1. UrlState
 * 2. Remote user preference)
 * 3. Local storage
 * 4. AppSpeciesBrainRegionConfig.Global.DefaultHierarchyId
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
  const { urlState } = useHierarchyBrainRegionUrlState();
  const [browserStorageHierarchy] = useLocalStorage<BrainRegionHierarchySelection | null>(
    VERSIONED__SPECIES_BRAIN_REGION_SELECTION_SNAPSHOT,
    null
  );
  // Priority: Url hierarchy ID > Remote ID > browser storage selection > config default
  const hierarchyId =
    urlState.hierarchyId ||
    remoteUserPreferenceHierarchySpecies?.hierarchy_id ||
    browserStorageHierarchy?.hierarchyId ||
    AppSpeciesBrainRegionConfig.Common.DefaultHierarchyId;

  const usedHierarchyId = config?.hId ?? hierarchyId;

  function select(result: IBrainRegionHierarchy) {
    return {
      root: injectHierarchyId(result, usedHierarchyId),
      options: flattenTreeAsObject<IBrainRegionHierarchy>(result).map((region) => ({
        value: region.id,
        label: capitalize(`${region.name}`),
        data: { ...region, hierarchy_id: usedHierarchyId },
      })),
    };
  }

  const queryOption = (id: string, enabled?: boolean) =>
    queryOptions({
      queryKey: keyBuilderHierarchy.hierarchy({ id }),
      queryFn: () => getBrainRegionHierarchy({ id }),
      enabled,
      select,
      staleTime: Infinity,
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
    result: { root: master, workspaceHierarchyId },
    loading: loadingRootHierarchy,
    error,
  } = useBrainRegionRootHierarchyQuery();

  const primaryDivisionAnnotationValue =
    getSpeciesConfigByHierarchyId(workspaceHierarchyId).PrimaryDivisionAnnotationValue;

  if (master) {
    const root = findNodeByKey<IBrainRegionHierarchy>(
      DEFAULT_BRAIN_REGION_ANNOTATION_FIELD,
      primaryDivisionAnnotationValue,
      master
    );
    if (!root) {
      log(
        'warn',
        `Brain region with annotation_value ${primaryDivisionAnnotationValue} not found.`
      );
      return {
        result: null,
        error: new Error('No root found'),
        loading: loadingRootHierarchy,
      };
    }
    let options: Array<TBrainRegionHierarchyOption> = [];
    let leaves: Map<string, IBrainRegionHierarchy[]> = new Map();
    const nodes = renameKeyDeep<IBrainRegionHierarchy>(root, 'color_hex_triplet', 'color', true);

    if (root) {
      options = flattenTreeAsObject<IBrainRegionHierarchy>(root)
        .map((region) => {
          return {
            av: region.annotation_value,
            value: region.id,
            label: capitalize(`${region.name}`),
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
  const SpeciesConfig = getSpeciesConfigByHierarchyId(workspaceHierarchyId);
  const {
    result: { atlas },
    loadingAtlas,
    error: atlasError,
  } = useBrainRegionAtlasQuery({ id: SpeciesConfig.atlasId });

  if (atlasError || !atlas || !master) {
    log('warn', 'Failed to fetch brain atlas regions:', atlasError);
    return {
      result: null,
      loading: loadingAtlas || loadingRootHierarchy,
    };
  }

  const atlasMap = new Map<string, IBrainAtlasRegion>();
  for (const region of atlas) {
    atlasMap.set(region.brain_region_id, region);
  }
  const primaryDivisionAnnotationValue = SpeciesConfig.PrimaryDivisionAnnotationValue;

  const baseRoot = findNodeByKey<IBrainRegionHierarchy>(
    DEFAULT_BRAIN_REGION_ANNOTATION_FIELD,
    primaryDivisionAnnotationValue,
    master
  );

  if (!baseRoot) {
    log('warn', `Brain region with annotation_value ${primaryDivisionAnnotationValue} not found.`);
    return {
      result: null,
      loading: loadingAtlas || loadingRootHierarchy,
    };
  }

  // merge hierarchy with atlas data
  const root = mergeHierarchyWithAtlas(baseRoot, atlasMap);

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
    loading: loadingAtlas || loadingRootHierarchy,
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
