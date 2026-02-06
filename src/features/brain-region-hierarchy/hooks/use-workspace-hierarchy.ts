'use client';

import { useQueryClient } from '@tanstack/react-query';
import { find, omit } from 'es-toolkit/compat';
import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type {
  BrainRegionHierarchySelection,
  IWorkspaceSpecies,
} from '@/features/brain-region-hierarchy/types';

import { updateBrainRegionPreference } from '@/api/virtual-lab-svc/queries/user';
import {
  AppSpeciesBrainRegionConfig,
  getSpeciesConfigByHierarchyId,
  selectedBrainRegionAtom,
  useBrainRegionRootHierarchyQuery,
  useHierarchyBrainRegionUrlState,
  usePrimaryHierarchyOfCurrentSpeciesQuery,
  VERSIONED__BRAIN_REGION_HIERARCHY_STORAGE_KEY_PREFIX,
  workspaceHierarchySpeciesAtom,
} from '@/features/brain-region-hierarchy/context';
import { getSpeciesDisplayName } from '@/features/brain-region-hierarchy/helpers';
import {
  useAvailableHierarchySpeciesQuery,
  useRemoteUserPreferenceHierarchySpeciesQuery,
} from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { keyBuilderHierarchy } from '@/ui/use-query-keys/atlas';

/**
 * manages and synchronizes the workspace-local selection of a species and a brain-region hierarchy.
 *
 * it reads available hierarchies and brain-region root options,
 * exposes the currently selected brain region and workspace species stored in local atoms, and provides
 * helpers to update those atoms in a consistent manner.
 *
 * Local stores:
 * - workspaceHierarchySpeciesAtom: currently selected species for brain-region hierarchy
 * - selectedBrainRegionAtom: currently selected brain region
 *
 * Behavior:
 * - changeLocalStoreBrainRegion(brainRegion):
 *   - Updates the selected brain region atom.
 *   - Derives and sets the workspace species from the brain region's hierarchy (if available).
 * - changeLocalStoreHierarchySpecies(hierarchyId, brainRegionId?):
 *   - Ensures brain-region options for the provided hierarchy are loaded (uses queryClient.ensureQueryData).
 *   - Selects a default brain region (provided brainRegionId or hierarchy config default).
 *   - Updates the workspace species and selected brain region atoms.
 *   - Returns an object with the resolved brainRegion and hierarchy, or null if the hierarchy is not found or a default brain region cannot be determined.
 *
 * @remarks
 * - Depends on useAvailableHierarchySpeciesQuery and useBrainRegionRootHierarchyQuery.
 */
export function useLocalStoreHierarchySpeciesAndBrainRegion() {
  const queryClient = useQueryClient();
  const { remoteAvailableHierarchies: hierarchies } = useAvailableHierarchySpeciesQuery();
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
      const hierarchyConfig = getSpeciesConfigByHierarchyId(hierarchyId);
      const defaultBrainRegion = brainRegions.find(
        (br) => br.value === (brainRegionId ?? hierarchyConfig.DefaultSelectedId)
      );
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
 * this hook provides a complete solution for:
 * - Species selection with automatic hierarchy switching
 * - Brain region selection within the current hierarchy
 * - State synchronization across URL, localStorage, and API
 * - Fire-and-forget API persistence (non-blocking)
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
  const { remoteUserPreferenceHierarchySpecies, loading: isLoadingRemotePreference } =
    useRemoteUserPreferenceHierarchySpeciesQuery();

  const { result: brainRegions } = usePrimaryHierarchyOfCurrentSpeciesQuery();
  const [browserStorageHierarchy, setBrowserStorageHierarchy] =
    useLocalStorage<BrainRegionHierarchySelection | null>(
      VERSIONED__BRAIN_REGION_HIERARCHY_STORAGE_KEY_PREFIX,
      null
    );

  // get default hierarchy based on configured species
  const defaultHierarchy = remoteAvailableHierarchies?.find(
    (h) => h.id === AppSpeciesBrainRegionConfig.Common.DefaultHierarchyId
  );

  const defaultingCurrentHierarchyId =
    urlState.hierarchyId ||
    remoteUserPreferenceHierarchySpecies?.hierarchy_id ||
    browserStorageHierarchy?.hierarchyId ||
    AppSpeciesBrainRegionConfig.Common.DefaultHierarchyId;

  const defaultBrainRegionId = getSpeciesConfigByHierarchyId(
    defaultingCurrentHierarchyId
  ).DefaultSelectedId;

  const defaultBrainRegionObject = brainRegions?.options.find(
    (o) => o.value === defaultBrainRegionId
  );

  /**
   * fire-and-forget api persistence
   * persists selection to backend without blocking ui
   */
  function syncHierarchySpeciesRemoteUserPreference(selection: BrainRegionHierarchySelection) {
    void (async () => {
      updateBrainRegionPreference({
        hierarchy_id: selection.hierarchyId,
        species_name: selection.speciesName,
        brain_region_id: selection.brainRegionId || null,
        brain_region_name: selection.brainRegionName || null,
      }).finally(() => {
        queryClient.invalidateQueries({
          queryKey: keyBuilderHierarchy.hierarchies(),
        });
        queryClient.invalidateQueries({
          queryKey: keyBuilderHierarchy.hierarchyPreference(),
        });
      });
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
   * this resets the brain region to the default for the new hierarchy
   */
  async function changeBulkStoreHierarchySpecies(hId: string) {
    const hierarchy = remoteAvailableHierarchies?.find((h) => h.id === hId);
    if (!hierarchy) return;

    // update Jotai atoms for immediate UI feedback
    const result = await changeLocalStoreHierarchySpecies(hierarchy.id);
    const { DefaultSelectedId, DefaultSelectedName } = getSpeciesConfigByHierarchyId(hierarchy.id);

    syncExternalStores({
      hierarchyId: hierarchy.id,
      speciesName: hierarchy.species.name,
      brainRegionId: result?.brainRegion?.id ?? DefaultSelectedId,
      brainRegionName: result?.brainRegion?.name ?? DefaultSelectedName,
    });
  }

  /**
   * change the selected brain region within the current hierarchy
   */
  function changeBrainRegion(region: IBrainRegionHierarchy | null) {
    if (!region) {
      setSelectedBrainRegion(null);

      const currentHierarchyId =
        urlState.hierarchyId ||
        remoteUserPreferenceHierarchySpecies?.hierarchy_id ||
        browserStorageHierarchy?.hierarchyId ||
        AppSpeciesBrainRegionConfig.Common.DefaultHierarchyId;

      const currentSpeciesName = workspaceSpecies?.name || '';
      const hierarchyConfig = getSpeciesConfigByHierarchyId(currentHierarchyId);
      syncExternalStores({
        hierarchyId: currentHierarchyId,
        speciesName: currentSpeciesName,
        brainRegionId: hierarchyConfig.DefaultSelectedId,
        brainRegionName: hierarchyConfig.DefaultSelectedName,
      });
      return;
    }

    const currentHierarchyId = region.hierarchy_id;

    const currentSpeciesName =
      remoteAvailableHierarchies?.find((h) => h.id === currentHierarchyId)?.species.name || '';

    changeLocalStoreBrainRegion(region);
    syncExternalStores({
      hierarchyId: currentHierarchyId,
      speciesName: currentSpeciesName,
      brainRegionId: region.id,
      brainRegionName: region.name,
    });
  }

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
              brainRegionId: urlState.brainRegionId,
              brainRegionName: result?.brainRegion?.name,
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
          });
          setUrlState({
            hierarchyId: hierarchy.id,
            brainRegionId: remoteUserPreferenceHierarchySpecies.brain_region_id || '',
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
          changeLocalStoreHierarchySpecies(hierarchy.id);
          // Sync to URL
          setUrlState({
            hierarchyId: browserStorageHierarchy.hierarchyId,
            brainRegionId: browserStorageHierarchy.brainRegionId,
          });
        }
        isInitializedRef.current = true;
        return;
      }
      // priority 4: Defaults config
      if (defaultHierarchy) {
        changeLocalStoreHierarchySpecies(defaultHierarchy.id);
        const defaultConfig = getSpeciesConfigByHierarchyId(defaultHierarchy.id);

        const newSelection: BrainRegionHierarchySelection = {
          hierarchyId: defaultHierarchy.id,
          speciesName: defaultHierarchy.species.name,
          brainRegionId: defaultConfig.DefaultSelectedId,
          brainRegionName: defaultConfig.DefaultSelectedName,
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
      AppSpeciesBrainRegionConfig.Common.DefaultHierarchyId;

    const currentSpeciesName = remoteAvailableHierarchies?.find((p) => p.id === currentHierarchyId)
      ?.species.name;

    syncExternalStores({
      hierarchyId: currentHierarchyId,
      // biome-ignore lint/style/noNonNullAssertion: we have the default hierarchy object
      speciesName: currentSpeciesName!,
      brainRegionId: defaultBrainRegionObject.data.id,
      brainRegionName: defaultBrainRegionObject.data.name,
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
    AppSpeciesBrainRegionConfig.Common.DefaultHierarchyId;

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
