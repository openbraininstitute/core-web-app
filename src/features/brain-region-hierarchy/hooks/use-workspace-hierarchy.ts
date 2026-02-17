'use client';

import { useQueryClient } from '@tanstack/react-query';
import { find, omit } from 'es-toolkit/compat';
import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';

import { updateBrainRegionPreference } from '@/api/virtual-lab-svc/queries/user';
import { config } from '@/config';
import {
  selectedBrainRegionAtom,
  useBrainRegionRootHierarchyQuery,
  useHierarchyBrainRegionUrlState,
  usePrimaryHierarchyOfCurrentSpeciesQuery,
  VERSIONED__SPECIES_BRAIN_REGION_SELECTION_SNAPSHOT,
  workspaceHierarchySpeciesAtom,
} from '@/features/brain-region-hierarchy/context';
import { getSpeciesDisplayName } from '@/features/brain-region-hierarchy/helpers';
import {
  useAvailableHierarchySpeciesQuery,
  useHierarchyRuntimeMetadataQuery,
  useRemoteUserPreferenceHierarchySpeciesQuery,
} from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { keyBuilderHierarchy } from '@/ui/use-query-keys/atlas';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type {
  BrainRegionHierarchySelection,
  IWorkspaceSpecies,
} from '@/features/brain-region-hierarchy/types';

/**
 * manages and synchronizes the workspace-local selection of a species and a brain-region hierarchy.
 *
 * it reads available hierarchies and brain-region root options,
 * exposes the currently selected brain region and workspace species stored in local atoms, and provides
 * helpers to update those atoms in a consistent manner.
 *
 * local stores:
 * - workspaceHierarchySpeciesAtom: currently selected species for brain-region hierarchy
 * - selectedBrainRegionAtom: currently selected brain region
 *
 * behavior:
 * - changeLocalStoreBrainRegion(brainRegion):
 *   - updates the selected brain region atom.
 *   - derives and sets the workspace species from the brain region's hierarchy (if available).
 * - changeLocalStoreHierarchySpecies(hierarchyId, brainRegionId?):
 *   - ensures brain-region options for the provided hierarchy are loaded (uses queryClient.ensureQueryData).
 *   - selects a default brain region (provided brainRegionId or hierarchy config default).
 *   - updates the workspace species and selected brain region atoms.
 *   - returns an object with the resolved brainRegion and hierarchy, or null if the hierarchy is not found or a default brain region cannot be determined.
 */
export function useLocalStoreHierarchySpeciesAndBrainRegion() {
  const queryClient = useQueryClient();
  const { remoteAvailableHierarchies: hierarchies } = useAvailableHierarchySpeciesQuery();
  const { runtimeHierarchyById } = useHierarchyRuntimeMetadataQuery();
  const { queryOption, select } = useBrainRegionRootHierarchyQuery();

  const [selectedBrainRegion, setSelectedBrainRegion] = useAtom(selectedBrainRegionAtom);
  const [workspaceSpecies, setWorkspaceSpecies] = useAtom(workspaceHierarchySpeciesAtom);

  function changeLocalStoreBrainRegion(brainRegion: IBrainRegionHierarchy | null) {
    setSelectedBrainRegion(brainRegion);
    const hierarchyId = brainRegion?.hierarchy_id;
    const species = hierarchies?.find((h) => h.id === hierarchyId)?.species;
    if (species) {
      setWorkspaceSpecies({
        name: species?.name,
        displayName: getSpeciesDisplayName(species?.name),
        id: species?.id,
        taxonomyId: species?.taxonomyId,
        hierarchId: hierarchyId || '',
      });
    }
  }

  async function changeLocalStoreHierarchySpecies(
    hierarchyId: string,
    brainRegionId?: string | null
  ) {
    const hierarchy = hierarchies?.find((h) => h.id === hierarchyId);
    if (hierarchy) {
      const result = await queryClient.ensureQueryData({
        ...queryOption(hierarchyId),
      });
      const { options: brainRegions } = select(result);
      const fallbackDefaultRegionId =
        runtimeHierarchyById.get(hierarchyId)?.fallbackDefaultSelectedRegionId ??
        config.MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID;
      const resolvedRegionId = brainRegionId ?? fallbackDefaultRegionId;
      const defaultBrainRegion =
        brainRegions.find((br) => br.value === resolvedRegionId) ?? brainRegions.at(0);
      if (!defaultBrainRegion) return;
      setWorkspaceSpecies(hierarchy.species);
      setSelectedBrainRegion(defaultBrainRegion?.data);

      return { brainRegion: defaultBrainRegion.data, hierarchy };
    }
    return { hierarchy, brainRegion: null };
  }

  return {
    selectedBrainRegion,
    workspaceSpecies,
    setWorkspaceSpecies,
    setSelectedBrainRegion,
    changeLocalStoreHierarchySpecies,
    changeLocalStoreBrainRegion,
  };
}

/**
 * managing brain region hierarchy selection state
 *
 * features:
 * - species selection with automatic hierarchy switching
 * - brain region selection within the current hierarchy
 * - state synchronization across URL, localStorage, and API
 * - fire-and-forget API persistence (non-blocking)
 * - per-hierarchy brain region memory (restores previous selection when switching back)
 *
 * state priority on initialization:
 * 1. URL parameters (highest - for shareable links)
 * 2. DB (remote persistence)
 * 4. LocalStorage (session persistence)
 * 5. Config defaults (fallback)
 */
export function useWorkspaceHierarchyRegistry() {
  // track initialization to prevent infinite loops
  const isInitializedRef = useRef(false);
  const queryClient = useQueryClient();

  const {
    setSelectedBrainRegion,
    changeLocalStoreHierarchySpecies,
    changeLocalStoreBrainRegion,
    selectedBrainRegion,
    workspaceSpecies,
  } = useLocalStoreHierarchySpeciesAndBrainRegion();

  const { urlState, setUrlState } = useHierarchyBrainRegionUrlState();
  const { remoteAvailableHierarchies, loading: isLoadingAvailableHierarchiesSpecies } =
    useAvailableHierarchySpeciesQuery();
  const { runtimeHierarchyById } = useHierarchyRuntimeMetadataQuery();
  const { remoteUserPreferenceHierarchySpecies, loading: isLoadingRemotePreference } =
    useRemoteUserPreferenceHierarchySpeciesQuery();

  const { result: brainRegions } = usePrimaryHierarchyOfCurrentSpeciesQuery();
  const [browserStorageHierarchy, setBrowserStorageHierarchy] =
    useLocalStorage<BrainRegionHierarchySelection | null>(
      VERSIONED__SPECIES_BRAIN_REGION_SELECTION_SNAPSHOT,
      null
    );

  // get default hierarchy based on configured species
  const defaultHierarchy = remoteAvailableHierarchies?.find(
    (h) => h.id === config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID
  );

  const defaultingCurrentHierarchyId =
    urlState.hierarchyId ||
    remoteUserPreferenceHierarchySpecies?.hierarchy_id ||
    browserStorageHierarchy?.hierarchyId ||
    config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID;

  const defaultBrainRegionId =
    runtimeHierarchyById.get(defaultingCurrentHierarchyId)?.fallbackDefaultSelectedRegionId ??
    config.MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID;

  const defaultBrainRegionObject =
    brainRegions?.options.find((o) => o.value === defaultBrainRegionId) ??
    brainRegions?.options.at(0);

  /**
   * fire-and-forget api persistence
   * persists selection to backend without blocking ui
   */
  function syncHierarchySpeciesRemoteUserPreference(selection: BrainRegionHierarchySelection) {
    void (async () => {
      try {
        await updateBrainRegionPreference({
          hierarchy_id: selection.hierarchyId,
          species_name: selection.speciesName,
          brain_region_id: selection.brainRegionId || null,
          brain_region_name: selection.brainRegionName || null,
        });
        queryClient.setQueryData(keyBuilderHierarchy.hierarchyPreference(), {
          data: {
            preference: {
              hierarchy_id: selection.hierarchyId,
              species_name: selection.speciesName,
              brain_region_id: selection.brainRegionId || null,
              brain_region_name: selection.brainRegionName || null,
            },
          },
        });
      } catch {
        queryClient.invalidateQueries({
          queryKey: keyBuilderHierarchy.hierarchyPreference(),
        });
      }
    })();
  }

  /**
   * synchronize a brain-region hierarchy selection with external stores.
   *
   * updates local/browser storage and the URL state synchronously, and then
   * triggers a fire-and-forget remote persistence of the user's hierarchy/species
   */
  function syncExternalStores(selection: BrainRegionHierarchySelection) {
    setBrowserStorageHierarchy(selection);
    setUrlState({
      brainRegionId: selection.brainRegionId,
      hierarchyId: selection.hierarchyId,
    });

    // fire-and-forget api persistence
    syncHierarchySpeciesRemoteUserPreference(selection);
  }

  /**
   * change the selected species
   * restores the previously selected brain region if the user has visited this hierarchy before,
   * otherwise falls back to the default for the new hierarchy
   */
  async function changeBulkStoreHierarchySpeciesImpl(hId: string) {
    const {
      remoteAvailableHierarchies: latestHierarchies,
      selectedBrainRegion: latestRegion,
      urlState: latestUrlState,
      browserStorageHierarchy: latestStorage,
    } = latestRef.current;
    const hierarchy = latestHierarchies?.find((h) => h.id === hId);
    if (!hierarchy) return;

    // memoize the current brain region for the current hierarchy before switching
    const currentHierarchyId = latestUrlState.hierarchyId || latestStorage?.hierarchyId;
    const prevMemory = {
      ...(latestStorage?.perHierarchyMemory ?? {}),
    };
    if (currentHierarchyId && latestRegion) {
      prevMemory[currentHierarchyId] = {
        brainRegionId: latestRegion.id,
        brainRegionName: latestRegion.name,
      };
    }

    // clear the atom so stale state doesn't leak into the new hierarchy
    setSelectedBrainRegion(null);

    // check if we have a previously remembered brain region for the target hierarchy
    const remembered = prevMemory[hierarchy.id];

    // update Jotai atoms for immediate UI feedback
    const result = await changeLocalStoreHierarchySpecies(
      hierarchy.id,
      remembered?.brainRegionId ?? null
    );
    const fallbackRegionId =
      runtimeHierarchyById.get(hierarchy.id)?.fallbackDefaultSelectedRegionId ??
      config.MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID;
    const fallbackRegionName = remembered?.brainRegionName ?? '';

    syncExternalStores({
      hierarchyId: hierarchy.id,
      speciesName: hierarchy.species.name,
      brainRegionId: result?.brainRegion?.id ?? fallbackRegionId,
      brainRegionName: result?.brainRegion?.name ?? fallbackRegionName,
      perHierarchyMemory: prevMemory,
    });
  }

  /**
   * change the selected brain region within the current hierarchy
   */
  function changeBrainRegionImpl(region: IBrainRegionHierarchy | null) {
    if (!region) {
      setSelectedBrainRegion(null);

      const currentHierarchyId =
        urlState.hierarchyId ||
        remoteUserPreferenceHierarchySpecies?.hierarchy_id ||
        browserStorageHierarchy?.hierarchyId ||
        config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID;

      const currentSpeciesName = workspaceSpecies?.name || '';
      const fallbackRegionId =
        runtimeHierarchyById.get(currentHierarchyId)?.fallbackDefaultSelectedRegionId ??
        config.MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID;
      const fallbackRegionName =
        brainRegions?.options.find((option) => option.value === fallbackRegionId)?.data.name ?? '';
      syncExternalStores({
        hierarchyId: currentHierarchyId,
        speciesName: currentSpeciesName,
        brainRegionId: fallbackRegionId,
        brainRegionName: fallbackRegionName,
        perHierarchyMemory: browserStorageHierarchy?.perHierarchyMemory,
      });
      return;
    }

    const currentHierarchyId = region.hierarchy_id;

    const currentSpeciesName =
      remoteAvailableHierarchies?.find((h) => h.id === currentHierarchyId)?.species.name || '';

    changeLocalStoreBrainRegion(region);

    // keep per-hierarchy memory in sync
    const updatedMemory = {
      ...(browserStorageHierarchy?.perHierarchyMemory ?? {}),
      [currentHierarchyId]: {
        brainRegionId: region.id,
        brainRegionName: region.name,
      },
    };

    syncExternalStores({
      hierarchyId: currentHierarchyId,
      speciesName: currentSpeciesName,
      brainRegionId: region.id,
      brainRegionName: region.name,
      perHierarchyMemory: updatedMemory,
    });
  }

  // use refs so the memoized callbacks always read the latest values
  const latestRef = useRef({
    selectedBrainRegion,
    urlState,
    browserStorageHierarchy,
    remoteAvailableHierarchies,
    workspaceSpecies,
    remoteUserPreferenceHierarchySpecies,
  });
  latestRef.current = {
    selectedBrainRegion,
    urlState,
    browserStorageHierarchy,
    remoteAvailableHierarchies,
    workspaceSpecies,
    remoteUserPreferenceHierarchySpecies,
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: uses latestRef for fresh values
  const changeBulkStoreHierarchySpecies = useCallback(
    (hId: string) => changeBulkStoreHierarchySpeciesImpl(hId),
    [changeLocalStoreHierarchySpecies, setSelectedBrainRegion]
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: uses latestRef for fresh values
  const changeBrainRegion = useCallback(
    (region: IBrainRegionHierarchy | null) => changeBrainRegionImpl(region),
    [changeLocalStoreBrainRegion, setSelectedBrainRegion]
  );

  /**
   * initialize state from URL or localStorage on mount
   */
  useEffect(() => {
    // wait for hierarchies to load before initializing
    if (
      isInitializedRef.current ||
      isLoadingAvailableHierarchiesSpecies ||
      isLoadingRemotePreference ||
      remoteAvailableHierarchies?.length === 0
    )
      return;

    async function sync() {
      const hasUrlParams = !!urlState.hierarchyId || !!urlState.brainRegionId;
      const hasStoredSelection = !!browserStorageHierarchy?.hierarchyId;

      // priority 1: url params
      if (hasUrlParams && urlState.hierarchyId) {
        const hierarchy = remoteAvailableHierarchies?.find((h) => h.id === urlState.hierarchyId);
        if (hierarchy) {
          const result = await changeLocalStoreHierarchySpecies(
            hierarchy.id,
            urlState.brainRegionId
          );
          if (result?.brainRegion) {
            // sync to localStorage
            setBrowserStorageHierarchy({
              hierarchyId: urlState.hierarchyId,
              speciesName: hierarchy.species.name,
              brainRegionId: result.brainRegion.id,
              brainRegionName: result?.brainRegion?.name,
              perHierarchyMemory: browserStorageHierarchy?.perHierarchyMemory,
            });
          }
        }
        isInitializedRef.current = true;
        return;
      }
      // priority 2: user remote preference
      const remoteHierarchyId = remoteUserPreferenceHierarchySpecies?.hierarchy_id;
      if (remoteHierarchyId) {
        const hierarchy = remoteAvailableHierarchies?.find((h) => h.id === remoteHierarchyId);
        if (hierarchy) {
          const result = await changeLocalStoreHierarchySpecies(
            hierarchy.id,
            remoteUserPreferenceHierarchySpecies.brain_region_id
          );
          setBrowserStorageHierarchy({
            hierarchyId: hierarchy.id,
            speciesName: hierarchy.species.name,
            brainRegionId:
              result?.brainRegion?.id || remoteUserPreferenceHierarchySpecies.brain_region_id || '',
            brainRegionName:
              result?.brainRegion?.name ||
              remoteUserPreferenceHierarchySpecies.brain_region_name ||
              '',
            perHierarchyMemory: browserStorageHierarchy?.perHierarchyMemory,
          });
          setUrlState({
            hierarchyId: hierarchy.id,
            brainRegionId: result?.brainRegion?.id || '',
          });
          isInitializedRef.current = true;
          return;
        }
      }
      // priority 3: browser localStorage
      if (hasStoredSelection) {
        const hierarchy = remoteAvailableHierarchies?.find(
          (h) => h.id === browserStorageHierarchy.hierarchyId
        );
        if (hierarchy) {
          const result = await changeLocalStoreHierarchySpecies(
            hierarchy.id,
            browserStorageHierarchy.brainRegionId
          );
          // Sync to URL
          setUrlState({
            hierarchyId: browserStorageHierarchy.hierarchyId,
            brainRegionId: result?.brainRegion?.id || browserStorageHierarchy.brainRegionId,
          });
        }
        isInitializedRef.current = true;
        return;
      }
      // priority 4: Defaults config
      if (defaultHierarchy) {
        const result = await changeLocalStoreHierarchySpecies(defaultHierarchy.id);
        const fallbackRegionId =
          runtimeHierarchyById.get(defaultHierarchy.id)?.fallbackDefaultSelectedRegionId ??
          config.MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID;

        const newSelection: BrainRegionHierarchySelection = {
          hierarchyId: defaultHierarchy.id,
          speciesName: defaultHierarchy.species.name,
          brainRegionId: result?.brainRegion?.id ?? fallbackRegionId,
          brainRegionName: result?.brainRegion?.name ?? '',
        };

        setBrowserStorageHierarchy(newSelection);
        setUrlState({
          hierarchyId: newSelection.hierarchyId,
          brainRegionId: newSelection.brainRegionId,
        });
      }
    }
    sync();
    isInitializedRef.current = true;
  }, [
    remoteAvailableHierarchies,
    isLoadingAvailableHierarchiesSpecies,
    isLoadingRemotePreference,
    remoteUserPreferenceHierarchySpecies,
    urlState,
    browserStorageHierarchy,
    defaultHierarchy,
    setBrowserStorageHierarchy,
    changeLocalStoreHierarchySpecies,
    runtimeHierarchyById,
    setUrlState,
  ]);

  /**
   * set default brain region when hierarchy data loads and no region is selected
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: syncExternalStores is stable
  useEffect(() => {
    if (!brainRegions || !isInitializedRef.current) return;
    if (selectedBrainRegion) return; // already have a selection
    if (!defaultBrainRegionObject) return; // no default region available

    // check if we have a stored brain region to restore
    const storedRegionId = browserStorageHierarchy?.brainRegionId || urlState.brainRegionId;
    if (storedRegionId) {
      const storedRegion = find(brainRegions.options, (o) => o.data.id === storedRegionId)?.data;
      if (storedRegion) {
        setSelectedBrainRegion(omit(storedRegion, 'children'));
        return;
      }
    }

    // set to default region
    setSelectedBrainRegion(omit(defaultBrainRegionObject.data, 'children'));

    // update stores with default region
    const currentHierarchyId =
      urlState.hierarchyId ||
      browserStorageHierarchy?.hierarchyId ||
      defaultHierarchy?.id ||
      config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID;

    const currentSpeciesName = remoteAvailableHierarchies?.find((p) => p.id === currentHierarchyId)
      ?.species.name;

    syncExternalStores({
      hierarchyId: currentHierarchyId,
      // biome-ignore lint/style/noNonNullAssertion: we have the default hierarchy object
      speciesName: currentSpeciesName!,
      brainRegionId: defaultBrainRegionObject.data.id,
      brainRegionName: defaultBrainRegionObject.data.name,
      perHierarchyMemory: browserStorageHierarchy?.perHierarchyMemory,
    });
  }, [
    brainRegions,
    selectedBrainRegion,
    defaultBrainRegionObject,
    browserStorageHierarchy,
    urlState,
    defaultHierarchy,
    workspaceSpecies,
    setSelectedBrainRegion,
  ]);

  // compute effective hierarchy ID
  const workspaceHierarchyId =
    urlState.hierarchyId ||
    remoteUserPreferenceHierarchySpecies?.hierarchy_id ||
    browserStorageHierarchy?.hierarchyId ||
    config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID;

  return {
    workspaceSpecies,
    selectedBrainRegion,
    workspaceHierarchyId,
    remoteAvailableHierarchies,
    isLoadingAvailableHierarchiesSpecies,
    syncSettled: isInitializedRef.current,
    changeBulkStoreHierarchySpecies,
    changeBrainRegion,
  };
}

/**
 * lightweight hook to just get the current species selection
 * use this when you only need to read the species, not change it
 */
export function useWorkspaceHierarchySpecies(): IWorkspaceSpecies | null {
  return useAtomValue(workspaceHierarchySpeciesAtom);
}
