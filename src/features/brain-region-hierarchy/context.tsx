"use client";

import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { isNil } from "es-toolkit/compat";

import { getBrainRegionHierarchy } from "@/api/entitycore/queries/general/brain-region";
import type { IBrainAtlasRegion } from "@/api/entitycore/types/entities/brain-atlas";
import type {
  BrainRegionHierarchyBase,
  IBrainRegionHierarchy,
} from "@/api/entitycore/types/entities/brain-region";
import { tryCatch } from "@/api/utils";
import {
  findNodeByKey,
  flattenTreeAsObject,
  renameKeyDeep,
} from "@/components/tree/elements/helpers";
import { config } from "@/config";
import {
  brainAtlasAtom,
  useBrainAtlasQuery,
  useBrainRegionAtlasQuery,
} from "@/features/brain-atlas-viewer/context";
import {
  getLeavesForEachRegion,
  getLeavesForEachRegionExtended,
  type IBrainRegionHierarchyExtended,
  mergeHierarchyWithAtlas,
  type TBrainRegionHierarchyExtendedOption,
  type TBrainRegionHierarchyOption,
} from "@/features/brain-region-hierarchy/helpers";
import type { IWorkspaceSpecies } from "@/features/brain-region-hierarchy/types";
import { log } from "@/utils/logger";
import { useQuery } from "@tanstack/react-query";
import { keyBuilderHierarchy } from "@/ui/use-query-keys/atlas";
import { getWorkspaceHierarchySpeciesPreference } from "@/api/virtual-lab-svc/queries/brain-region-preferences";

export const defaultExploreRegion = {
  id: "http://api.brain-map.org/api/v2/data/Structure/567",
  title: "Cerebrum",
};

export const {
  DEFAULT_BRAIN_ATLAS_ID,
  APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID,
  // MOUSE
  MOUSE_ROOT__BRAIN_REGION_ID,
  MOUSE_ROOT__BRAIN_REGION_ANNOTATION_VALUE, // 997
  MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID,
  MOUSE_PRIMARY__DIVISION_ANNOTATION_VALUE, // 8
  // HUMAN
  HUMAN_ROOT__BRAIN_REGION_ID,
  HUMAN_ROOT__BRAIN_REGION_ANNOTATION_VALUE, // 999
  HUMAN_DEFAULT__SELECTED_BRAIN_REGION_ID,
  HUMAN_PRIMARY__DIVISION_ANNOTATION_VALUE, // 999
} = config;

// MOUSE
// Awful but requested from entitycore for the moment
export const MOUSE_DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE = 567; // Cerebrum
export const MOUSE_DEFAULT_SELECTED_BRAIN_REGION_NAME = "Cerebrum";

// HUMAN
// Awful but requested from entitycore for the moment
export const HUMAN_DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE = 525; // Telencephalon
export const HUMAN_DEFAULT_SELECTED_BRAIN_REGION_NAME = "telencephalon";

// Query
export const DEFAULT_BRAIN_REGION_ANNOTATION_FIELD = "annotation_value";
export const DEFAULT_BRAIN_REGION_QUERY_ID = "br_id";
export const DEFAULT_BRAIN_REGION_QUERY_ANNOTATION_VALUE = "br_av";

export const AtlasHierarchyConfig = {
  Global: {
    DefaultHierarchyId: config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID,
  },
  Human: {
    RootId: HUMAN_ROOT__BRAIN_REGION_ID,
    RootAnnotationValue: HUMAN_ROOT__BRAIN_REGION_ANNOTATION_VALUE, // 999
    PrimaryDivisionAnnotationValue: HUMAN_PRIMARY__DIVISION_ANNOTATION_VALUE, // 999
    DefaultSelectedId: HUMAN_DEFAULT__SELECTED_BRAIN_REGION_ID,
    DefaultSelectedAnnotationValue:
      HUMAN_DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE,
    DefaultSelectedName: HUMAN_DEFAULT_SELECTED_BRAIN_REGION_NAME,
  },
  Mouse: {
    RootId: MOUSE_ROOT__BRAIN_REGION_ID,
    RootAnnotationValue: MOUSE_ROOT__BRAIN_REGION_ANNOTATION_VALUE, // 997
    PrimaryDivisionAnnotationValue: MOUSE_PRIMARY__DIVISION_ANNOTATION_VALUE, // 8
    DefaultSelectedId: MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID,
    DefaultSelectedAnnotationValue:
      MOUSE_DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE,
    DefaultSelectedName: MOUSE_DEFAULT_SELECTED_BRAIN_REGION_NAME,
  },
};

export const brainRegionSidebarAtom = atom(false);
export const selectedBrainRegionAtom = atom<BrainRegionHierarchyBase | null>(
  null,
);

/**
 * atom for storing the currently selected species information
 * used for multi-species brain region hierarchy support
 */
export const workspaceHierarchySpeciesAtom = atom<IWorkspaceSpecies | null>(
  null,
);

/**
 * atom for storing the current hierarchy ID
 * this allows dynamic switching between different species hierarchies
 */
export const workspaceHierarchyIdAtom = atom<string>(
  config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID,
);

/**
 * fetches and manages user preferences for brain region hierarchy species selection.
 *
 * This hook retrieves the user's preferred brain region hierarchy ID from the workspace
 * hierarchy species preference API. It's designed to support multi-species brain region
 * hierarchies by allowing users to persist their species selection across sessions.
 *
 * The hook uses React Query with optimized caching settings:
 * - `staleTime: Infinity` - Data never becomes stale, reducing unnecessary re-fetches
 * - `refetchOnWindowFocus: false` - Prevents refetching when the window regains focus
 *
 * @returns An object containing:
 *   - `remoteHierarchyId`: The user's preferred hierarchy ID from remote preferences, or undefined if not set
 *   - `error`: Boolean indicating if there was an error fetching the preferences
 *   - `loadingRemote`: Boolean indicating if the remote preference data is still being fetched
 */
const useHierarchySpeciesUserPreference = () => {
  const {
    data: remotePreference,
    isLoading: isLoadingRemotePreference,
    isError,
  } = useQuery({
    queryKey: keyBuilderHierarchy.hierarchyPreference(),
    queryFn: () => getWorkspaceHierarchySpeciesPreference(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return {
    userRemoteHierarchyId: remotePreference?.data?.preference.hierarchy_id,
    error: isError,
    loading: isLoadingRemotePreference,
  };
};

/**
 * fetches and manages the root brain region hierarchy data.
 *
 * This hook handles the complex logic of determining which brain region hierarchy
 * to use based on multiple sources with a defined priority order. It fetches the
 * hierarchy data and processes it into a format suitable for UI components.
 *
 * Priority order for hierarchy ID selection:
 * 1. User's remote preference (from workspace hierarchy species preference)
 * 2. Current workspace hierarchy ID (from local atom state)
 * 3. Atlas hierarchy ID (from the current brain atlas)
 * 4. Default hierarchy ID (from application configuration)
 *
 * The hook performs the following operations:
 * - Determines the appropriate hierarchy ID using the priority order
 * - Fetches the brain region hierarchy data from the API
 * - Flattens the hierarchy tree into selectable options for UI components
 * - Handles loading states and error conditions
 * - Waits for remote preferences to load before making API calls
 *
 * @returns An object containing:
 *   - `result`: The processed hierarchy data
 *     - `currentHierarchyId`: The hierarchy ID that was ultimately used
 *     - `root`: The root node of the brain region hierarchy tree
 *     - `options`: Flattened array of selectable regions with metadata
 *   - `loading`: Boolean indicating if data is being fetched (includes remote preference loading)
 *   - `error`: Error object if the hierarchy fails to load
 */
export const useBrainRegionRootHierarchyQuery = () => {
  const [workspaceHierarchyId] = useAtom(workspaceHierarchyIdAtom);
  const { atlas } = useBrainAtlasQuery();
  const { userRemoteHierarchyId, loading: loadingRemote } =
    useHierarchySpeciesUserPreference();

  // Priority: explicit hierarchy ID > Remote ID > atlas hierarchy  > config default
  const hierarchyId =
    userRemoteHierarchyId ||
    workspaceHierarchyId ||
    atlas?.hierarchy_id ||
    config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID;

  const {
    data: root,
    isLoading,
    error,
  } = useQuery({
    queryKey: keyBuilderHierarchy.hierarchy(hierarchyId),
    queryFn: () =>
      getBrainRegionHierarchy({
        id: hierarchyId,
      }),
    enabled: !!hierarchyId && !loadingRemote,
  });

  if (isLoading || error || !root) {
    return {
      result: {
        root,
        workspaceHierarchyId: hierarchyId,
        options: [],
      },
      error,
      loading: isLoading,
    };
  }

  const loadingRootHierarchy = isLoading || loadingRemote;

  return {
    result: {
      root,
      workspaceHierarchyId: hierarchyId,
      options: flattenTreeAsObject<IBrainRegionHierarchy>(root).map(
        (region) => ({
          value: region.id,
          label: `${region.name}`,
          data: { ...region, hierarchy_id: hierarchyId },
        }),
      ),
    },
    loading: loadingRootHierarchy,
    error,
  };
};

/**
 * Determines the appropriate primary anatomical divisions annotation value based on the hierarchy ID.
 *
 * This function maps hierarchy IDs to their corresponding primary anatomical divisions
 * annotation values, which are used to identify the root nodes for different species
 * in the brain region hierarchy.
 *
 * @param currentHierarchyId - The current brain region hierarchy ID
 * @returns The annotation value for primary anatomical divisions:
 *   - For mouse (default hierarchy): Returns MOUSE_PRIMARY_ANATOMICAL_DIVISIONS_ANNOTATION_VALUE (8)
 *   - For human (non-default hierarchy): Returns HUMAN_PRIMARY_ANATOMICAL_DIVISIONS_ANNOTATION_VALUE (999)
 *
 */
export function getPrimaryDivisionAnnotationValue(currentHierarchyId: string) {
  let primaryDivisionAnnotationValue =
    AtlasHierarchyConfig.Mouse.PrimaryDivisionAnnotationValue;
  if (currentHierarchyId === config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID) {
    primaryDivisionAnnotationValue =
      AtlasHierarchyConfig.Mouse.PrimaryDivisionAnnotationValue;
  } else {
    primaryDivisionAnnotationValue =
      AtlasHierarchyConfig.Human.PrimaryDivisionAnnotationValue;
  }
  return primaryDivisionAnnotationValue;
}

/**
 * Determines the appropriate default selected brain region name based on the hierarchy ID.
 *
 * This function maps hierarchy IDs to their corresponding default selected brain region
 * names, which are used to identify the initial region selection for different species
 * in the brain region hierarchy interface.
 *
 * @param currentHierarchyId - The current brain region hierarchy ID
 * @returns The default selected brain region name:
 *   - For mouse (default hierarchy): Returns MOUSE_DEFAULT_SELECTED_BRAIN_REGION_NAME ("Cerebrum")
 *   - For human (non-default hierarchy): Returns HUMAN_DEFAULT_SELECTED_BRAIN_REGION_NAME ("telencephalon")
 */
export function getDefaultSelectedBrainRegionName(currentHierarchyId: string) {
  let defaultName = AtlasHierarchyConfig.Mouse.DefaultSelectedId;
  if (currentHierarchyId === config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID) {
    AtlasHierarchyConfig.Mouse.DefaultSelectedId;
  } else {
    defaultName = AtlasHierarchyConfig.Human.DefaultSelectedId;
  }
  return defaultName;
}

/**
 * Custom hook that provides the primary anatomical divisions brain region hierarchy.
 *
 * This hook fetches and processes the brain region hierarchy data, specifically focusing
 * on the primary anatomical divisions based on the current hierarchy ID. It finds the
 * appropriate root node using species-specific annotation values and transforms the
 * hierarchy into a format suitable for UI components.
 *
 * The hook performs the following operations:
 * - Retrieves the master brain region hierarchy from the root hierarchy atom
 * - Determines the correct primary anatomical divisions annotation value based on species
 * - Finds the root node matching the annotation value in the hierarchy tree
 * - Flattens the hierarchy into selectable options for dropdowns/selectors
 * - Generates a map of leaf regions for each parent region
 * - Renames color properties for consistent UI usage
 *
 * @returns An object containing:
 *   - `result`: The processed hierarchy data or null if not found
 *     - `root`: The root node of the primary anatomical divisions
 *     - `nodes`: The hierarchy with renamed color properties
 *     - `options`: Flattened array of selectable regions with metadata
 *     - `leaves`: Map of region IDs to their leaf descendants
 *   - `error`: Error object if the hierarchy fails to load or root node is not found
 *   - `loading`: Boolean indicating if the data is still being fetched
 */
export const usePrimaryHierarchyQuery = () => {
  const {
    result: { root: master, workspaceHierarchyId },
    loading: loadingRootHierarchy,
    error,
  } = useBrainRegionRootHierarchyQuery();

  const primaryDivisionAnnotationValue =
    getPrimaryDivisionAnnotationValue(workspaceHierarchyId);

  if (master) {
    const root = findNodeByKey<IBrainRegionHierarchy>(
      DEFAULT_BRAIN_REGION_ANNOTATION_FIELD,
      primaryDivisionAnnotationValue,
      master,
    );
    if (!root) {
      log(
        "warn",
        `Brain region with annotation_value ${primaryDivisionAnnotationValue} not found.`,
      );
      return {
        result: null,
        error: new Error("No root found"),
        loading: loadingRootHierarchy,
      };
    }
    let options: Array<TBrainRegionHierarchyOption> = [];
    let leaves: Map<string, IBrainRegionHierarchy[]> = new Map();
    const nodes = renameKeyDeep<IBrainRegionHierarchy>(
      root,
      "color_hex_triplet",
      "color",
      true,
    );

    if (root) {
      options = flattenTreeAsObject<IBrainRegionHierarchy>(root)
        .map((region) => {
          return {
            av: region.annotation_value,
            value: region.id,
            label: `${region.name}`,
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
    error: new Error("No master found"),
    result: null,
    loading: loadingRootHierarchy,
  };
};

/**
 * provides the extended primary anatomical divisions brain region hierarchy.
 *
 * This hook builds upon the primary hierarchy by merging it with brain atlas data to create
 * an extended hierarchy that includes additional atlas-specific information (volumetric date).
 * It fetches both the brain region hierarchy and atlas data, then combines them
 * to provide a comprehensive view of brain regions with their associated atlas properties.
 *
 * The hook performs the following operations:
 * - Retrieves the master brain region hierarchy and atlas data
 * - Creates a map of atlas regions for efficient lookup by brain_region_id
 * - Determines the correct primary division annotation value based on species
 * - Finds the root node matching the annotation value in the hierarchy tree
 * - Merges the hierarchy with atlas data to create extended region objects
 * - Flattens the extended hierarchy into selectable options for UI components
 * - Generates a map of leaf regions for each parent region in the extended format
 * - Renames color properties for consistent UI usage
 *
 * @returns An object containing:
 *   - `result`: The processed extended hierarchy data or null if not found/error
 *     - `root`: The root node of the extended primary anatomical divisions
 *     - `nodes`: The extended hierarchy with renamed color properties
 *     - `options`: Flattened array of selectable extended regions with metadata
 *     - `leaves`: Map of region IDs to their extended leaf descendants
 *   - `loading`: Boolean indicating if either hierarchy or atlas data is still being fetched
 */
export const usePrimaryExtendedHierarchyQuery = () => {
  const {
    result: { root: master, workspaceHierarchyId },
    loading: loadingRootHierarchy,
  } = useBrainRegionRootHierarchyQuery();
  const {
    result: { atlas },
    loadingAtlas,
    error: atlasError,
  } = useBrainRegionAtlasQuery();

  if (atlasError || !atlas || !master) {
    log("warn", "Failed to fetch brain atlas regions:", atlasError);
    return {
      result: null,
      loading: loadingAtlas || loadingRootHierarchy,
    };
  }

  const atlasMap = new Map<string, IBrainAtlasRegion>();
  for (const region of atlas) {
    atlasMap.set(region.brain_region_id, region);
  }
  const primaryDivisionAnnotationValue =
    getPrimaryDivisionAnnotationValue(workspaceHierarchyId);

  const baseRoot = findNodeByKey<IBrainRegionHierarchy>(
    DEFAULT_BRAIN_REGION_ANNOTATION_FIELD,
    primaryDivisionAnnotationValue,
    master,
  );

  if (!baseRoot) {
    log(
      "warn",
      `Brain region with annotation_value ${primaryDivisionAnnotationValue} not found.`,
    );
    return {
      result: null,
      loading: loadingAtlas || loadingRootHierarchy,
    };
  }

  // merge hierarchy with atlas data
  const root = mergeHierarchyWithAtlas(baseRoot, atlasMap);

  const nodes = renameKeyDeep<IBrainRegionHierarchyExtended>(
    root,
    "color_hex_triplet",
    "color",
    true,
  );

  const options: Array<TBrainRegionHierarchyExtendedOption> =
    flattenTreeAsObject<IBrainRegionHierarchyExtended>(root)
      .map((region) => ({
        av: region.annotation_value,
        value: region.id,
        label: `${region.name}`,
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

/**
 * hook return a setter function to update the highlighted brain region state.
 *
 * @returns An object containing the `updateSelectedBrainRegion` function,
 * which can be used to set the currently highlighted brain region.
 * the brain region should be of type `BrainRegionHierarchyBase` or `null`.
 */
export const useSetSelectedBrainRegion = () => {
  const updateSelectedBrainRegion = useSetAtom(selectedBrainRegionAtom);
  return { updateSelectedBrainRegion };
};

/**
 * retrieve the currently highlighted brain region from the global state.
 *
 * @returns An object containing the `selectedBrainRegion` value from the atom.
 * the value is of type `BrainRegionHierarchyBase` or `null`.
 */
export const useGetSelectedBrainRegion = () => {
  const selectedBrainRegion = useAtomValue(selectedBrainRegionAtom);
  return { selectedBrainRegion };
};
