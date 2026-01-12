"use client";

import { find, isNil, lowerCase, omit } from "es-toolkit/compat";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useRef } from "react";

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
  brainRegionAtlasAtom,
  useBrainAtlasQuery,
  useBrainRegionAtlasQuery,
} from "@/features/brain-atlas-viewer/context";
import {
  getLeavesForEachRegion,
  getLeavesForEachRegionExtended,
  type IBrainRegionHierarchyExtended,
  mergeHierarchyWithAtlas,
  type TBrainRegionHierarchyAtomReturnType,
  type TBrainRegionHierarchyExtendedAtomReturnType,
  type TBrainRegionHierarchyExtendedOption,
  type TBrainRegionHierarchyOption,
} from "@/features/brain-region-hierarchy/helpers";
import type { ISpeciesInfo } from "@/features/brain-region-hierarchy/types";
import { useUnwrappedValue } from "@/hooks/hooks";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getSectionFromDataKey } from "@/utils/key-builder";
import { log } from "@/utils/logger";
import { useQuery } from "@tanstack/react-query";
import { keyBuilderHierarchy } from "@/ui/use-query-keys/atlas";
import { getBrainRegionPreference } from "@/api/virtual-lab-svc/queries/brain-region-preferences";

type Props = {
  dataKey: string;
};

export const defaultExploreRegion = {
  id: "http://api.brain-map.org/api/v2/data/Structure/567",
  title: "Cerebrum",
};

export const {
  DEFAULT_BRAIN_ATLAS_ID,
  APP_DEFAULT_BRAIN_REGION_HIERARCHY_ID,
  // MOUSE
  MOUSE_ROOT_BRAIN_REGION_ID,
  MOUSE_DEFAULT_SELECTED_BRAIN_REGION_ID,
  MOUSE_ROOT_BRAIN_REGION_ANNOTATION_VALUE, // 997
  MOUSE_PRIMARY_ANATOMICAL_DIVISIONS_ANNOTATION_VALUE, // 8
  // HUMAN
  HUMAN_MOUSE_ROOT_BRAIN_REGION_ID,
  HUMAN_DEFAULT_SELECTED_BRAIN_REGION_ID,
  HUMAN_ROOT_BRAIN_REGION_ANNOTATION_VALUE, // 999
  HUMAN_PRIMARY_ANATOMICAL_DIVISIONS_ANNOTATION_VALUE, // 999
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
    DefaultHierarchyId: config.APP_DEFAULT_BRAIN_REGION_HIERARCHY_ID,
  },
  Human: {
    RootId: HUMAN_MOUSE_ROOT_BRAIN_REGION_ID,
    RootAnnotationValue: HUMAN_ROOT_BRAIN_REGION_ANNOTATION_VALUE, // 999
    PrimaryAnatomicalDivisionsAnnotationValue:
      HUMAN_PRIMARY_ANATOMICAL_DIVISIONS_ANNOTATION_VALUE, // 999
    DefaultSelectedId: HUMAN_DEFAULT_SELECTED_BRAIN_REGION_ID,
    DefaultSelectedAnnotationValue:
      HUMAN_DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE,
    DefaultSelectedName: HUMAN_DEFAULT_SELECTED_BRAIN_REGION_NAME,
  },
  Mouse: {
    RootId: MOUSE_ROOT_BRAIN_REGION_ID,
    RootAnnotationValue: MOUSE_ROOT_BRAIN_REGION_ANNOTATION_VALUE, // 997
    PrimaryAnatomicalDivisionsAnnotationValue:
      MOUSE_PRIMARY_ANATOMICAL_DIVISIONS_ANNOTATION_VALUE, // 8
    DefaultSelectedId: MOUSE_DEFAULT_SELECTED_BRAIN_REGION_ID,
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
export const selectedSpeciesAtom = atom<ISpeciesInfo | null>(null);

/**
 * atom for storing the current hierarchy ID
 * this allows dynamic switching between different species hierarchies
 */
export const currentHierarchyIdAtom = atom<string>(
  config.APP_DEFAULT_BRAIN_REGION_HIERARCHY_ID,
);

const useBrainRegionUserPreference = () => {
  const {
    data: remotePreference,
    isLoading: isLoadingRemotePreference,
    isError,
  } = useQuery({
    queryKey: keyBuilderHierarchy.hierarchyPreference(),
    queryFn: () => getBrainRegionPreference(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return {
    remoteHierarchyId: remotePreference?.data?.preference.hierarchy_id,
    error: isError,
    loadingRemote: isLoadingRemotePreference,
  };
};

const useBrainRegionRootHierarchyAtom = () => {
  const [currentHierarchyId] = useAtom(currentHierarchyIdAtom);
  const { atlas } = useBrainAtlasQuery();
  const { remoteHierarchyId, loadingRemote } = useBrainRegionUserPreference();
  // Priority: explicit hierarchy ID > Remote ID > atlas hierarchy  > config default
  const hierarchyId = currentHierarchyId;
  remoteHierarchyId ||
    atlas?.hierarchy_id ||
    config.APP_DEFAULT_BRAIN_REGION_HIERARCHY_ID;

  const {
    data: root,
    isLoading,
    isError,
  } = useQuery({
    queryKey: keyBuilderHierarchy.hierarchy(hierarchyId),
    queryFn: () =>
      getBrainRegionHierarchy({
        id: hierarchyId,
      }),
    enabled: !!hierarchyId && !loadingRemote,
  });

  if (isLoading || isError || !root) {
    return {
      currentHierarchyId,
      root,
      options: [],
    };
  }

  const loadingRootHierarchy = isLoading || loadingRemote;

  return {
    currentHierarchyId,
    loadingRootHierarchy,
    error: isError,
    root,
    options: flattenTreeAsObject<IBrainRegionHierarchy>(root).map((region) => ({
      value: region.id,
      label: `${region.name}`,
      data: region,
    })),
  };
};

export const brainRegionRootHierarchyAtom = atom(async (get) => {
  const atlas = await get(brainAtlasAtom);
  const currentHierarchyId = get(currentHierarchyIdAtom);

  // Priority: explicit hierarchy ID > atlas hierarchy > config default
  const hierarchyId =
    currentHierarchyId ||
    atlas?.hierarchy_id ||
    config.APP_DEFAULT_BRAIN_REGION_HIERARCHY_ID;

  const { data: root, error } = await tryCatch(
    getBrainRegionHierarchy({
      id: hierarchyId,
    }),
  );

  if (error) {
    log("error", "Failed to fetch brain regions:", error);
    throw error;
  }
  const options = flattenTreeAsObject<IBrainRegionHierarchy>(root).map(
    (region) => ({
      value: region.id,
      label: `${region.name}`,
      data: region,
    }),
  );

  return {
    currentHierarchyId,
    root,
    options,
  };
});

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
 * @example
 * ```tsx
 * const mouseAnnotationValue = getPrimaryAnatomicalDivisionsAnnotationValue(
 *   config.APP_DEFAULT_BRAIN_REGION_HIERARCHY_ID
 * ); // Returns 8
 *
 * const humanAnnotationValue = getPrimaryAnatomicalDivisionsAnnotationValue(
 *   "human-hierarchy-id"
 * ); // Returns 999
 * ```
 */
export function getPrimaryAnatomicalDivisionsAnnotationValue(
  currentHierarchyId: string,
) {
  let primaryAnatomicalDivisionsAnnotationValue =
    AtlasHierarchyConfig.Mouse.PrimaryAnatomicalDivisionsAnnotationValue;
  if (currentHierarchyId === config.APP_DEFAULT_BRAIN_REGION_HIERARCHY_ID) {
    primaryAnatomicalDivisionsAnnotationValue =
      AtlasHierarchyConfig.Mouse.PrimaryAnatomicalDivisionsAnnotationValue;
  } else {
    primaryAnatomicalDivisionsAnnotationValue =
      AtlasHierarchyConfig.Human.PrimaryAnatomicalDivisionsAnnotationValue;
  }
  return primaryAnatomicalDivisionsAnnotationValue;
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
 *
 * @example
 * ```tsx
 * const mouseDefaultName = getDefaultSelectedBrainRegionName(
 *   config.APP_DEFAULT_BRAIN_REGION_HIERARCHY_ID
 * ); // Returns "Cerebrum"
 *
 * const humanDefaultName = getDefaultSelectedBrainRegionName(
 *   "human-hierarchy-id"
 * ); // Returns "telencephalon"
 * ```
 */
export function getDefaultSelectedBrainRegionName(currentHierarchyId: string) {
  let defaultName = AtlasHierarchyConfig.Mouse.DefaultSelectedId;
  if (currentHierarchyId === config.APP_DEFAULT_BRAIN_REGION_HIERARCHY_ID) {
    AtlasHierarchyConfig.Mouse.DefaultSelectedId;
  } else {
    defaultName = AtlasHierarchyConfig.Human.DefaultSelectedId;
  }
  return defaultName;
}

/**
 * Atom that provides the primary anatomical divisions brain region hierarchy.
 *
 * This atom fetches and processes the brain region hierarchy data, filtering it to show
 * only the primary anatomical divisions and their descendants based on the current
 * hierarchy ID (mouse or human). It creates a flattened structure suitable for UI
 * components like dropdowns and tree views.
 *
 * The atom performs the following operations:
 * - Retrieves the root hierarchy from brainRegionRootHierarchyAtom
 * - Determines the appropriate primary anatomical divisions annotation value based on species
 * - Finds the specific root node for primary anatomical divisions
 * - Renames color properties for consistency (color_hex_triplet -> color)
 * - Flattens the hierarchy into selectable options
 * - Generates a map of leaf regions for each parent region
 *
 * @returns Promise<TBrainRegionHierarchyAtomReturnType>
 *   - `root`: The primary anatomical divisions root node
 *   - `nodes`: The processed hierarchy with renamed color properties
 *   - `options`: Flattened array of selectable regions for UI components
 *   - `leaves`: Map of region IDs to their leaf descendants
 *   - Returns `null` if the primary anatomical divisions root is not found
 *
 * @dependencies
 *   - brainRegionRootHierarchyAtom: Provides the complete hierarchy structure
 *   - Uses species-specific annotation values (mouse: 8, human: 999)
 *
 * @example
 * ```tsx
 * const hierarchy = useAtomValue(PrimaryAnatomicalDivisionsHierarchyAtom);
 * if (hierarchy) {
 *   const regionOptions = hierarchy.options; // For dropdown menus
 *   const leafRegions = hierarchy.leaves.get(regionId); // Get leaf descendants
 * }
 * ```
 */

export const usePrimaryHierarchyQuery = () => {
  const {
    root: master,
    currentHierarchyId,
    loadingRootHierarchy,
  } = useBrainRegionRootHierarchyAtom();

  const primaryAnatomicalDivisionsAnnotationValue =
    getPrimaryAnatomicalDivisionsAnnotationValue(currentHierarchyId);

  if (master) {
    const root = findNodeByKey<IBrainRegionHierarchy>(
      DEFAULT_BRAIN_REGION_ANNOTATION_FIELD,
      primaryAnatomicalDivisionsAnnotationValue,
      master,
    );
    if (!root) {
      log(
        "warn",
        `Brain region with annotation_value ${primaryAnatomicalDivisionsAnnotationValue} not found.`,
      );
      return {
        result: null,
        loadingRootHierarchy,
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
      result: { root, nodes, options, leaves },
      loading: loadingRootHierarchy,
    };
  }
  return {
    result: null,
    loadingRootHierarchy,
  };
};

export const PrimaryAnatomicalDivisionsHierarchyAtom = atom(
  async (get): Promise<TBrainRegionHierarchyAtomReturnType> => {
    const { root: master, currentHierarchyId } = await get(
      brainRegionRootHierarchyAtom,
    );

    const primaryAnatomicalDivisionsAnnotationValue =
      getPrimaryAnatomicalDivisionsAnnotationValue(currentHierarchyId);

    const root = findNodeByKey<IBrainRegionHierarchy>(
      DEFAULT_BRAIN_REGION_ANNOTATION_FIELD,
      primaryAnatomicalDivisionsAnnotationValue,
      master,
    );

    if (!root) {
      log(
        "warn",
        `Brain region with annotation_value ${primaryAnatomicalDivisionsAnnotationValue} not found.`,
      );
      return null;
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

    return { root, nodes, options, leaves };
  },
);

/**
 * Atom that provides an extended brain region hierarchy with atlas data integration.
 *
 * This atom combines the basic brain region hierarchy with brain atlas region data,
 * adding volumetric information and leaf region status to each node. It specifically
 * focuses on the mouse primary anatomical divisions and their descendants.
 *
 * The extended hierarchy includes:
 * - `is_leaf_region`: Boolean indicating if the region is a leaf node in the atlas
 * - `volume`: Numeric volume value from the atlas data
 * - `is_volumetric_region`: Boolean that bubbles up from children - true if this node
 *   or any of its descendants has volume > 0
 *
 * @returns Promise<TBrainRegionHierarchyExtendedAtomReturnType | null>
 *   - `root`: The extended hierarchy root node with volumetric data
 *   - `nodes`: The processed hierarchy with renamed color properties
 *   - `options`: Flattened array of selectable regions for UI components
 *   - `leaves`: Map of region IDs to their leaf descendants
 *   - Returns `null` if atlas data fails to load or primary anatomical divisions not found
 *
 * @dependencies
 *   - brainRegionRootHierarchyAtom: Provides the base hierarchy structure
 *   - brainRegionAtlasAtom: Provides volumetric and leaf region data
 *
 * @example
 * ```tsx
 * const extendedHierarchy = useAtomValue(PrimaryAnatomicalDivisionsExtendedHierarchyAtom);
 * if (extendedHierarchy) {
 *   const volumetricRegions = extendedHierarchy.options.filter(
 *     option => option.data.is_volumetric_region
 *   );
 * }
 * ```
 */

export const usePrimaryExtendedHierarchyQuery = () => {
  const {
    root: master,
    currentHierarchyId,
    loadingRootHierarchy,
  } = useBrainRegionRootHierarchyAtom();
  const { atlas, loadingAtlas, error: atlasError } = useBrainRegionAtlasQuery();

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
  const primaryAnatomicalDivisionsAnnotationValue =
    getPrimaryAnatomicalDivisionsAnnotationValue(currentHierarchyId);

  const baseRoot = findNodeByKey<IBrainRegionHierarchy>(
    DEFAULT_BRAIN_REGION_ANNOTATION_FIELD,
    primaryAnatomicalDivisionsAnnotationValue,
    master,
  );

  if (!baseRoot) {
    log(
      "warn",
      `Brain region with annotation_value ${primaryAnatomicalDivisionsAnnotationValue} not found.`,
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

export const PrimaryAnatomicalDivisionsExtendedHierarchyAtom = atom(
  async (get): Promise<TBrainRegionHierarchyExtendedAtomReturnType> => {
    const { root: master, currentHierarchyId } = await get(
      brainRegionRootHierarchyAtom,
    );
    const atlasResult = await get(brainRegionAtlasAtom);

    if (atlasResult.error || !atlasResult.data) {
      log("warn", "Failed to fetch brain atlas regions:", atlasResult.error);
      return null;
    }

    const atlasMap = new Map<string, IBrainAtlasRegion>();
    for (const region of atlasResult.data.data) {
      atlasMap.set(region.brain_region_id, region);
    }

    const primaryAnatomicalDivisionsAnnotationValue =
      getPrimaryAnatomicalDivisionsAnnotationValue(currentHierarchyId);

    const baseRoot = findNodeByKey<IBrainRegionHierarchy>(
      DEFAULT_BRAIN_REGION_ANNOTATION_FIELD,
      primaryAnatomicalDivisionsAnnotationValue,
      master,
    );

    if (!baseRoot) {
      log(
        "warn",
        `Brain region with annotation_value ${primaryAnatomicalDivisionsAnnotationValue} not found.`,
      );
      return null;
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

    return { root, nodes, options, leaves };
  },
);

/**
 * Custom hook for managing the state of a brain region hierarchy selection.
 *
 * This hook synchronizes the selected brain region's state between URL query parameters
 * and local storage, providing a consistent experience across sessions and shareable URLs.
 *
 * @param props - The properties for the hook.
 * @param props.dataKey - The key used to store and retrieve the hierarchy state from local storage.
 * @returns An object containing:
 *   - `node`: The currently selected brain region hierarchy node, including `id`, `name`, and `annotation_value`.
 *   - `updateHierarchyConfig`: A function to update the selected brain region node and persist the changes.
 *
 * NOTE: The `dataKey` should be unique for each context, you should use the resolveDataKey along with
 * getSectionFromDataKey to extract the right key for brain region used
 */
export const useBrainRegionHierarchy = ({ dataKey }: Props) => {
  const key = getSectionFromDataKey(dataKey);
  const [selectedBrainRegion, updateSelectedBrainRegion] = useAtom(
    selectedBrainRegionAtom,
  );
  const brainRegions = useUnwrappedValue(
    PrimaryAnatomicalDivisionsHierarchyAtom,
  );

  const defaultSelectedBrainRegion = brainRegions?.options.find(
    (o) =>
      lowerCase(o.label).trim() ===
      lowerCase(MOUSE_DEFAULT_SELECTED_BRAIN_REGION_NAME).trim(),
  );

  const [stored, updateLocalStorage] = useLocalStorage<{
    id: string;
    annotation_value: number;
  } | null>(key, null);

  const [
    { id, annotation_value: annotationValue },
    setSearchParamHierarchyConfig,
  ] = useQueryStates(
    {
      id: parseAsString.withDefault(""),
      annotation_value: parseAsInteger.withDefault(0),
    },
    {
      urlKeys: {
        id: DEFAULT_BRAIN_REGION_QUERY_ID,
        annotation_value: DEFAULT_BRAIN_REGION_QUERY_ANNOTATION_VALUE,
      },
      shallow: false,
      clearOnDefault: false,
    },
  );
  // track if config was already initialized to avoid infinite loop
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!brainRegions) return;

    const hasURLParams = !!id && !!annotationValue;

    // reset initialization if we're missing URL params but have localStorage data
    // this handles navigation back to /data from other routes
    if (
      !hasURLParams &&
      stored?.id &&
      stored?.annotation_value &&
      isInitializedRef.current
    ) {
      isInitializedRef.current = false;
    }

    if (isInitializedRef.current) return;

    if (hasURLParams) {
      isInitializedRef.current = true;
      if (selectedBrainRegion?.id !== id) {
        const foundNode = find(
          brainRegions?.options,
          (o) => o.data.id === id,
        )?.data;
        if (foundNode) {
          updateSelectedBrainRegion(omit(foundNode, "children"));
        }
      }
      return;
    }

    if (stored?.id && stored?.annotation_value) {
      if (id !== stored.id || annotationValue !== stored.annotation_value) {
        const foundNode = find(
          brainRegions?.options,
          (o) => o.data.id === stored.id,
        )?.data;
        if (foundNode) {
          setSearchParamHierarchyConfig({
            id: foundNode.id,
            annotation_value: foundNode.annotation_value,
          });
          updateSelectedBrainRegion(omit(foundNode, "children"));
        }
      }
      isInitializedRef.current = true;
      return;
    }

    if (defaultSelectedBrainRegion) {
      if (
        id !== defaultSelectedBrainRegion.value ||
        annotationValue !== defaultSelectedBrainRegion.data.annotation_value
      ) {
        updateSelectedBrainRegion(
          omit(defaultSelectedBrainRegion.data, "children"),
        );
        setSearchParamHierarchyConfig({
          id: defaultSelectedBrainRegion.value,
          annotation_value: defaultSelectedBrainRegion.data.annotation_value,
        });
      }
    }

    isInitializedRef.current = true;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brainRegions, id, annotationValue, stored, defaultSelectedBrainRegion]);

  // Sync localStorage when URL params change
  useEffect(() => {
    if (id && annotationValue && defaultSelectedBrainRegion) {
      const hierarchyConfig = { id, annotation_value: annotationValue };
      updateLocalStorage(hierarchyConfig);
    }
  }, [id, annotationValue, defaultSelectedBrainRegion, updateLocalStorage]);

  /**
   * Updates the hierarchy configuration state
   * and persists the changes to local storage.
   *
   * @param node - An object representing a brain region hierarchy,
   * containing the `id`, `name`, and `annotation_value` properties.
   */
  const updateHierarchyConfig = (node: IBrainRegionHierarchy | null) => {
    const regionConfig = node
      ? {
          id: node.id,
          name: node.name,
          annotation_value: node?.annotation_value,
        }
      : null;

    // Only update if the values are actually different
    if (
      regionConfig &&
      (id !== regionConfig.id ||
        annotationValue !== regionConfig.annotation_value)
    ) {
      // Ensure the UI (e.g., RegionBanner) reflects the new selection immediately
      // before any URL updates that may cause re-renders.
      updateSelectedBrainRegion(omit(node, "children"));
      updateLocalStorage(regionConfig);
      setSearchParamHierarchyConfig(regionConfig);
    } else if (!regionConfig && (id !== "" || annotationValue !== 0)) {
      // Clear selection first to keep UI in sync, then update storage and URL
      updateSelectedBrainRegion(null);
      updateLocalStorage(regionConfig);
      setSearchParamHierarchyConfig(regionConfig);
    }
  };

  return {
    node: { id, annotation_value: annotationValue },
    updateHierarchyConfig,
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

PrimaryAnatomicalDivisionsHierarchyAtom.debugLabel =
  "brainRegionBasicCellGroupsRegionsHierarchyAtom";
PrimaryAnatomicalDivisionsExtendedHierarchyAtom.debugLabel =
  "brainRegionBasicCellGroupsRegionsExtendedHierarchyAtom";
brainRegionSidebarAtom.debugLabel = "brainRegionSidebarAtom";
selectedBrainRegionAtom.debugLabel = "selectedBrainRegionAtom";
selectedSpeciesAtom.debugLabel = "selectedSpeciesAtom";
currentHierarchyIdAtom.debugLabel = "currentHierarchyIdAtom";
