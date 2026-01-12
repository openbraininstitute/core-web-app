"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { find, lowerCase, omit } from "es-toolkit/compat";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useCallback, useEffect, useRef } from "react";
import type { IBrainRegionHierarchy } from "@/api/entitycore/types/entities/brain-region";
import { setBrainRegionPreference } from "@/api/virtual-lab-svc/queries/brain-region-preferences";
import { getBrainRegionPreference } from "@/api/virtual-lab-svc/queries/brain-region-preferences";

import { config } from "@/config";
import {
  AtlasHierarchyConfig,
  currentHierarchyIdAtom,
  getDefaultSelectedBrainRegionName,
  selectedBrainRegionAtom,
  selectedSpeciesAtom,
  usePrimaryHierarchyQuery,
} from "@/features/brain-region-hierarchy/context";
import {
  useBrainRegionHierarchySpeciesQuery,
  useRemoteHierarchyUserPreferenceQuery,
} from "@/features/brain-region-hierarchy/hooks/use-brain-region-species";
import type {
  BrainRegionHierarchySelection,
  ISpeciesInfo,
} from "@/features/brain-region-hierarchy/types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getSectionFromDataKey } from "@/utils/key-builder";
import { keyBuilderHierarchy } from "@/ui/use-query-keys/atlas";

/**
 * url parameter keys for brain region hierarchy
 */
export const URL_PARAMS = {
  BRAIN_REGION_ID: "br_id",
  BRAIN_REGION_ANNOTATION_VALUE: "br_av",
  HIERARCHY_ID: "h_id",
} as const;

const STORAGE_KEY_PREFIX = "brain-region-hierarchy";

interface UseWorkspaceHierarchyOptions {
  dataKey: string;
}

/**
 * managing brain region hierarchy selection state
 *
 * this hook provides a complete solution for:
 * - Species selection with automatic hierarchy switching
 * - Brain region selection within the current hierarchy
 * - State synchronization across URL, localStorage, and API
 * - Fire-and-forget API persistence (non-blocking)
 *
 * state priority on initialization:
 * 1. URL parameters (highest - for shareable links)
 * 2. DB (remote persistence)
 * 3. localStorage (session persistence)
 * 3. Config defaults (fallback)
 */
export function useWorkspaceAtlasHierarchy({
  dataKey,
}: UseWorkspaceHierarchyOptions) {
  const isInitializedRef = useRef(false);
  const key = getSectionFromDataKey(dataKey);
  const storageKey = `${STORAGE_KEY_PREFIX}-${key}`;
  const queryClient = useQueryClient();

  const [selectedBrainRegion, setSelectedBrainRegion] = useAtom(
    selectedBrainRegionAtom,
  );

  const { hierarchies, isLoading: isLoadingHierarchies } =
    useBrainRegionHierarchySpeciesQuery();
  const { remoteHierarchyPreference, loading: isLoadingRemotePreference } =
    useRemoteHierarchyUserPreferenceQuery();

  const [selectedSpecies, setSelectedSpecies] = useAtom(selectedSpeciesAtom);
  const setCurrentHierarchyId = useSetAtom(currentHierarchyIdAtom);
  const { result: brainRegions } = usePrimaryHierarchyQuery();
  const [storedSelection, setLocalStoredSelection] =
    useLocalStorage<BrainRegionHierarchySelection | null>(storageKey, null);

  const [urlState, setUrlState] = useQueryStates(
    {
      brainRegionId: parseAsString.withDefault(""),
      annotationValue: parseAsInteger.withDefault(0),
      hierarchyId: parseAsString.withDefault(""),
    },
    {
      urlKeys: {
        brainRegionId: URL_PARAMS.BRAIN_REGION_ID,
        annotationValue: URL_PARAMS.BRAIN_REGION_ANNOTATION_VALUE,
        hierarchyId: URL_PARAMS.HIERARCHY_ID,
      },
      shallow: false,
      clearOnDefault: false,
    },
  );

  // track initialization to prevent infinite loops

  // get default hierarchy based on configured species
  const defaultHierarchy = hierarchies?.find(
    (h) => h.id === config.APP_DEFAULT_BRAIN_REGION_HIERARCHY_ID,
  );

  const defaultingCurrentHierarchyId =
    urlState.hierarchyId ||
    remoteHierarchyPreference?.hierarchy_id ||
    storedSelection?.hierarchyId ||
    config.APP_DEFAULT_BRAIN_REGION_HIERARCHY_ID;

  const defaultBrainRegionId =
    defaultingCurrentHierarchyId ===
    AtlasHierarchyConfig.Global.DefaultHierarchyId
      ? AtlasHierarchyConfig.Mouse.DefaultSelectedId
      : AtlasHierarchyConfig.Human.DefaultSelectedId;

  const defaultBrainRegionObject = brainRegions?.options.find(
    (o) => o.value === defaultBrainRegionId,
  );

  /**
   * fire-and-forget api persistence
   * persists selection to backend without blocking ui
   */
  const persistToRemote = (selection: BrainRegionHierarchySelection) => {
    setBrainRegionPreference({
      hierarchy_id: selection.hierarchyId,
      species_taxonomy_id: selection.speciesTaxonomyId,
      brain_region_id: selection.brainRegionId || null,
      brain_region_annotation_value:
        selection.brainRegionAnnotationValue || null,
    });
  };

  const updateAllStores = (selection: BrainRegionHierarchySelection) => {
    setLocalStoredSelection(selection);
    setUrlState({
      brainRegionId: selection.brainRegionId,
      annotationValue: selection.brainRegionAnnotationValue,
      hierarchyId: selection.hierarchyId,
    });

    // fire-and-forget api persistence
    persistToRemote(selection);
  };

  /**
   * change the selected species
   * this resets the brain region to the default for the new hierarchy
   */
  const changeSpecies = (hId: string) => {
    const hierarchy = hierarchies?.find((h) => h.id === hId);
    if (!hierarchy) return;

    // update Jotai atoms for immediate UI feedback
    setSelectedSpecies(hierarchy.species);
    setCurrentHierarchyId(hierarchy.id);

    // clear current brain region - will be set to default after hierarchy loads
    setSelectedBrainRegion(null);

    // create new selection state
    const newSelection: BrainRegionHierarchySelection = {
      hierarchyId: hierarchy.id,
      speciesTaxonomyId: hierarchy.species.taxonomyId,
      brainRegionId: "",
      brainRegionAnnotationValue: 0,
    };

    updateAllStores(newSelection);

    queryClient.invalidateQueries({
      queryKey: keyBuilderHierarchy.hierarchies(),
    });
    queryClient.invalidateQueries({
      queryKey: keyBuilderHierarchy.hierarchyPreference(),
    });
  };

  /**
   * change the selected brain region within the current hierarchy
   */
  const changeBrainRegion = (region: IBrainRegionHierarchy | null) => {
    if (!region) {
      setSelectedBrainRegion(null);

      const currentHierarchyId =
        urlState.hierarchyId ||
        remotePreference?.data?.preference.hierarchy_id ||
        storedSelection?.hierarchyId ||
        defaultHierarchy?.id ||
        "";

      const currentSpeciesTaxonomyId =
        selectedSpecies?.taxonomyId || config.DEFAULT_SPECIES_TAXONOMY_ID;

      updateAllStores({
        hierarchyId: currentHierarchyId,
        speciesTaxonomyId: currentSpeciesTaxonomyId,
        brainRegionId: "",
        brainRegionAnnotationValue: 0,
      });
      return;
    }
    setSelectedBrainRegion({
      id: region.id,
      name: region.name,
      acronym: region.acronym,
      parent_structure_id: region.parent_structure_id,
      color_hex_triplet: region.color_hex_triplet,
      annotation_value: region.annotation_value,
      hierarchy_id: region.hierarchy_id,
    });

    const currentHierarchyId =
      urlState.hierarchyId ||
      remoteHierarchyPreference?.hierarchy_id ||
      storedSelection?.hierarchyId ||
      defaultHierarchy?.id ||
      "";

    const currentSpeciesTaxonomyId =
      selectedSpecies?.taxonomyId || config.DEFAULT_SPECIES_TAXONOMY_ID;

    // Update all persistence layers
    updateAllStores({
      hierarchyId: currentHierarchyId,
      speciesTaxonomyId: currentSpeciesTaxonomyId,
      brainRegionId: region.id,
      brainRegionAnnotationValue: region.annotation_value,
    });
  };

  /**
   * initialize state from URL or localStorage on mount
   */
  useEffect(() => {
    // wait for hierarchies to load before initializing
    if (
      isInitializedRef.current ||
      isLoadingHierarchies ||
      isLoadingRemotePreference ||
      hierarchies?.length === 0
    )
      return;

    const hasUrlParams = !!urlState.hierarchyId || !!urlState.brainRegionId;
    const hasStoredSelection = !!storedSelection?.hierarchyId;

    // priority 1: URL params
    if (hasUrlParams && urlState.hierarchyId) {
      const hierarchy = hierarchies?.find((h) => h.id === urlState.hierarchyId);
      if (hierarchy) {
        setSelectedSpecies(hierarchy.species);
        setCurrentHierarchyId(hierarchy.id);

        // Sync to localStorage
        setLocalStoredSelection({
          hierarchyId: urlState.hierarchyId,
          speciesTaxonomyId: hierarchy.species.taxonomyId,
          brainRegionId: urlState.brainRegionId,
          brainRegionAnnotationValue: urlState.annotationValue,
        });
      }
      isInitializedRef.current = true;
      return;
    }
    // priority 2: remote
    const remoteHierarchyId = remoteHierarchyPreference?.hierarchy_id;
    if (remoteHierarchyId) {
      const hierarchy = hierarchies?.find((h) => h.id === remoteHierarchyId);
      if (hierarchy) {
        setSelectedSpecies(hierarchy.species);
        setCurrentHierarchyId(hierarchy.id);

        setLocalStoredSelection({
          hierarchyId: hierarchy.id,
          speciesTaxonomyId: hierarchy.species.taxonomyId,
          brainRegionId: remoteHierarchyPreference.brain_region_id || "",
          brainRegionAnnotationValue:
            remoteHierarchyPreference.brain_region_annotation_value || 0,
        });
        setUrlState({
          hierarchyId: hierarchy.id,
          brainRegionId: remoteHierarchyPreference.brain_region_id || "",
          annotationValue:
            remoteHierarchyPreference.brain_region_annotation_value || 0,
        });
        isInitializedRef.current = true;
        return;
      }
    }
    // priority 3: localStorage
    if (hasStoredSelection) {
      const hierarchy = hierarchies?.find(
        (h) => h.id === storedSelection.hierarchyId,
      );
      if (hierarchy) {
        setSelectedSpecies(hierarchy.species);
        setCurrentHierarchyId(hierarchy.id);

        // Sync to URL
        setUrlState({
          hierarchyId: storedSelection.hierarchyId,
          brainRegionId: storedSelection.brainRegionId,
          annotationValue: storedSelection.brainRegionAnnotationValue,
        });
      }
      isInitializedRef.current = true;
      return;
    }
    // priority 4: Defaults
    if (defaultHierarchy) {
      setSelectedSpecies(defaultHierarchy.species);
      setCurrentHierarchyId(defaultHierarchy.id);

      const newSelection: BrainRegionHierarchySelection = {
        hierarchyId: defaultHierarchy.id,
        speciesTaxonomyId: defaultHierarchy.species.taxonomyId,
        brainRegionId: "",
        brainRegionAnnotationValue: 0,
      };

      setLocalStoredSelection(newSelection);
      setUrlState({
        hierarchyId: newSelection.hierarchyId,
        brainRegionId: newSelection.brainRegionId,
        annotationValue: newSelection.brainRegionAnnotationValue,
      });
    }

    isInitializedRef.current = true;
  }, [
    hierarchies,
    isLoadingHierarchies,
    urlState,
    storedSelection,
    defaultHierarchy,
    setSelectedSpecies,
    setCurrentHierarchyId,
    setLocalStoredSelection,
    setUrlState,
  ]);

  /**
   * set default brain region when hierarchy data loads and no region is selected
   */
  useEffect(() => {
    if (!brainRegions || !isInitializedRef.current) return;
    if (selectedBrainRegion) return; // already have a selection
    if (!defaultBrainRegionObject) return; // no default region available

    // check if we have a stored brain region to restore
    const storedRegionId =
      storedSelection?.brainRegionId || urlState.brainRegionId;
    if (storedRegionId) {
      const storedRegion = find(
        brainRegions.options,
        (o) => o.data.id === storedRegionId,
      )?.data;
      if (storedRegion) {
        setSelectedBrainRegion(omit(storedRegion, "children"));
        return;
      }
    }

    // set to default region
    setSelectedBrainRegion(omit(defaultBrainRegionObject.data, "children"));

    // update stores with default region
    const currentHierarchyId =
      urlState.hierarchyId ||
      storedSelection?.hierarchyId ||
      defaultHierarchy?.id ||
      "";
    const currentSpeciesTaxonomyId =
      selectedSpecies?.taxonomyId || config.DEFAULT_SPECIES_TAXONOMY_ID;

    updateAllStores({
      hierarchyId: currentHierarchyId,
      speciesTaxonomyId: currentSpeciesTaxonomyId,
      brainRegionId: defaultBrainRegionObject.data.id,
      brainRegionAnnotationValue:
        defaultBrainRegionObject.data.annotation_value,
    });
  }, [
    brainRegions,
    selectedBrainRegion,
    defaultBrainRegionObject,
    storedSelection,
    urlState,
    defaultHierarchy,
    selectedSpecies,
    setSelectedBrainRegion,
    updateAllStores,
  ]);

  // compute effective hierarchy ID
  const currentHierarchyId =
    urlState.hierarchyId ||
    storedSelection?.hierarchyId ||
    defaultHierarchy?.id ||
    config.APP_DEFAULT_BRAIN_REGION_HIERARCHY_ID;

  return {
    selectedSpecies,
    selectedBrainRegion,
    currentHierarchyId,
    availableHierarchies: hierarchies,
    isLoadingHierarchies,
    changeSpecies,
    changeBrainRegion,

    // backward compatibility with useBrainRegionHierarchy
    /** @deprecated use changeBrainRegion instead */
    updateHierarchyConfig: changeBrainRegion,
    /** @deprecated use selectedBrainRegion?.id and selectedBrainRegion?.annotation_value instead */
    node: {
      id: urlState.brainRegionId,
      annotation_value: urlState.annotationValue,
    },
  };
}

/**
 * lightweight hook to just get the current species selection
 * use this when you only need to read the species, not change it
 */
export function useCurrentSpecies(): ISpeciesInfo | null {
  return useAtomValue(selectedSpeciesAtom);
}

/**
 * lightweight hook to just get the current hierarchy ID
 * use this when you only need to read the hierarchy ID, not change it
 */
export function useCurrentHierarchyId(): string {
  return useAtomValue(currentHierarchyIdAtom);
}
