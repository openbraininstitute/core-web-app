'use client';

import { useQueryClient } from '@tanstack/react-query';
import { find, omit } from 'es-toolkit/compat';
import { useAtom, useAtomValue, useStore } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';

import { updateBrainRegionPreference } from '@/api/virtual-lab-svc/queries/user';
import { config } from '@/config';
import {
  allowAllSpeciesAtom,
  hierarchyRegistryInitWorkspaceKeyAtom,
  hierarchyRegistryLastAppliedUrlOverrideAtom,
  hierarchyRegistrySyncSettledAtom,
  selectedBrainRegionAtom,
  speciesSelectionModeAtom,
  useBrainRegionRootHierarchyQuery,
  useBrainRegionUrlBoundaryContext,
  usePrimaryHierarchyOfCurrentSpeciesQuery,
  VERSIONED__SPECIES_BRAIN_REGION_SELECTION_SNAPSHOT,
  workspaceHierarchySpeciesAtom,
} from '@/features/brain-region-hierarchy/context';
import {
  createAllSpeciesSelection,
  getHierarchyBannerLoading,
  resolveDisplayWorkspaceSpecies,
  resolveEffectiveHierarchyId,
} from '@/features/brain-region-hierarchy/helpers';
import {
  useAvailableHierarchySpeciesQuery,
  useBrainRegionBootstrapQueries,
  useHierarchyRuntimeMetadataQuery,
} from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useWorkspace } from '@/ui/hooks/use-workspace';
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
      setWorkspaceSpecies({ ...species, hierarchId: hierarchyId || '' });
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
      const { options: brainRegions } = select(result, hierarchyId);
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
 * - state synchronization across transient URL overrides, localStorage, and API
 * - fire-and-forget API persistence (non-blocking)
 * - per-hierarchy brain region memory (restores previous selection when switching back)
 *
 * state priority on initialization:
 * 1. URL override (when a sync boundary is mounted)
 * 2. DB (remote persistence)
 * 3. LocalStorage (session persistence)
 * 4. Config defaults (fallback)
 */
export function useWorkspaceHierarchyRegistry() {
  const { virtualLabId, projectId } = useWorkspace();
  const workspaceKey = `${virtualLabId}:${projectId}`;
  const prevWorkspaceKeyRef = useRef(workspaceKey);
  const store = useStore();
  const [syncSettled, setSyncSettled] = useAtom(hierarchyRegistrySyncSettledAtom);
  const [lastAppliedUrlOverride, setLastAppliedUrlOverride] = useAtom(
    hierarchyRegistryLastAppliedUrlOverrideAtom
  );
  const queryClient = useQueryClient();

  const {
    setSelectedBrainRegion,
    setWorkspaceSpecies,
    changeLocalStoreHierarchySpecies,
    changeLocalStoreBrainRegion,
    selectedBrainRegion,
    workspaceSpecies,
  } = useLocalStoreHierarchySpeciesAndBrainRegion();

  const { urlOverride } = useBrainRegionUrlBoundaryContext();
  const allowAllSpecies = useAtomValue(allowAllSpeciesAtom);
  const [speciesSelectionMode, setSpeciesSelectionMode] = useAtom(speciesSelectionModeAtom);
  const {
    isLoading: isBootstrapLoading,
    remoteAvailableHierarchies,
    remoteUserPreferenceHierarchySpecies,
  } = useBrainRegionBootstrapQueries();
  const { runtimeHierarchyById } = useHierarchyRuntimeMetadataQuery();

  const { result: brainRegions, loading: isRootHierarchyLoading } =
    usePrimaryHierarchyOfCurrentSpeciesQuery();
  const [browserStorageHierarchy, setBrowserStorageHierarchy] =
    useLocalStorage<BrainRegionHierarchySelection | null>(
      VERSIONED__SPECIES_BRAIN_REGION_SELECTION_SNAPSHOT,
      null
    );

  const focusedUrlOverride = urlOverride?.kind === 'focused' ? urlOverride : null;
  const isAllUrlOverride = urlOverride?.kind === 'all';

  // get default hierarchy based on configured species
  const defaultHierarchy = remoteAvailableHierarchies?.find(
    (h) => h.id === config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID
  );

  const currentUrlOverrideKey: string | null = isAllUrlOverride
    ? 'all'
    : focusedUrlOverride
      ? `${focusedUrlOverride.hierarchyId}:${focusedUrlOverride.brainRegionId}`
      : null;

  useEffect(() => {
    if (prevWorkspaceKeyRef.current === workspaceKey) {
      return;
    }

    prevWorkspaceKeyRef.current = workspaceKey;
    store.set(hierarchyRegistryInitWorkspaceKeyAtom, null);
    setSyncSettled(false);
    setLastAppliedUrlOverride(null);
  }, [workspaceKey, store, setSyncSettled, setLastAppliedUrlOverride]);

  const workspaceHierarchyId = resolveEffectiveHierarchyId({
    urlHierarchyId: focusedUrlOverride?.hierarchyId,
    remoteHierarchyId: remoteUserPreferenceHierarchySpecies?.hierarchy_id,
    storageHierarchyId: browserStorageHierarchy?.hierarchyId,
    defaultHierarchyId: config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID,
    availableHierarchies: remoteAvailableHierarchies,
  });

  const defaultBrainRegionId =
    runtimeHierarchyById.get(workspaceHierarchyId)?.fallbackDefaultSelectedRegionId ??
    config.MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID;

  const defaultBrainRegionObject =
    brainRegions?.options.find((o) => o.value === defaultBrainRegionId) ??
    brainRegions?.options.at(0);

  /**
   * fire-and-forget api persistence
   * persists selection to backend without blocking ui
   */
  function syncHierarchySpeciesRemoteUserPreference(selection: BrainRegionHierarchySelection) {
    const mode = selection.speciesSelectionMode ?? SpeciesSelectionMode.Focused;
    const isAllMode = mode === SpeciesSelectionMode.All;
    const payload = {
      hierarchy_id: isAllMode ? null : selection.hierarchyId,
      species_name: isAllMode ? null : selection.speciesName,
      brain_region_id: isAllMode ? null : selection.brainRegionId || null,
      brain_region_name: isAllMode ? null : selection.brainRegionName || null,
      species_selection_mode: mode,
    };
    void (async () => {
      try {
        await updateBrainRegionPreference(payload);
        queryClient.setQueryData(keyBuilderHierarchy.hierarchyPreference(), {
          data: { preference: payload },
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
   * updates local/browser storage synchronously and then triggers a fire-and-forget
   * remote persistence of the user's hierarchy/species
   */
  function syncExternalStores(selection: BrainRegionHierarchySelection) {
    setBrowserStorageHierarchy(selection);
    syncHierarchySpeciesRemoteUserPreference(selection);
  }

  function applyAllSpeciesMode(
    perHierarchyMemory?: BrainRegionHierarchySelection['perHierarchyMemory'],
    options?: { persistStorage?: boolean; urlOverrideKey?: string }
  ) {
    setSelectedBrainRegion(null);
    setWorkspaceSpecies(null);
    setSpeciesSelectionMode(SpeciesSelectionMode.All);
    if (options?.persistStorage !== false) {
      setBrowserStorageHierarchy(createAllSpeciesSelection(perHierarchyMemory));
    }
    if (options?.urlOverrideKey) {
      setLastAppliedUrlOverride(options.urlOverrideKey);
    }
  }

  /**
   * change the selected species
   *
   * accepts either a hierarchy id (focused mode) or the literal
   * `SPECIES_SELECTION_MODE.All` to switch into the "all species" mode.
   * restores the previously selected brain region if the user has visited this hierarchy before,
   * otherwise falls back to the default for the new hierarchy.
   */
  async function changeBulkStoreHierarchySpeciesFn(
    hIdOrMode: string | typeof SpeciesSelectionMode.All
  ) {
    const {
      remoteAvailableHierarchies: latestHierarchies,
      selectedBrainRegion: latestRegion,
      browserStorageHierarchy: latestStorage,
      remoteUserPreferenceHierarchySpecies: latestRemotePreference,
    } = latestRef.current;

    // memoize the current brain region for the current hierarchy before switching
    const currentHierarchyId =
      latestRegion?.hierarchy_id ||
      latestStorage?.hierarchyId ||
      latestRemotePreference?.hierarchy_id ||
      config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID;
    const prevMemory = {
      ...(latestStorage?.perHierarchyMemory ?? {}),
    };
    if (currentHierarchyId && latestRegion) {
      prevMemory[currentHierarchyId] = {
        brainRegionId: latestRegion.id,
        brainRegionName: latestRegion.name,
      };
    }

    if (hIdOrMode === SpeciesSelectionMode.All) {
      applyAllSpeciesMode(prevMemory, { persistStorage: false });
      syncExternalStores(createAllSpeciesSelection(prevMemory));
      return;
    }

    const hierarchy = latestHierarchies?.find((h) => h.id === hIdOrMode);
    if (!hierarchy) return;

    // clear the atom so stale state doesn't leak into the new hierarchy
    setSelectedBrainRegion(null);

    // NOTE: do NOT flip speciesSelectionMode here. If we flipped to 'focused'
    // before `changeLocalStoreHierarchySpecies` resolves, every component that
    // subscribes to `useWorkspaceHierarchyRegistry` would see a transient
    // (focused, selectedBrainRegion=null, workspaceSpecies=null) state and its
    // "default brain region" effect would race to pick APP_DEFAULT and PATCH
    // the preference. Flip the mode only *after* the new species/region are
    // committed together (jotai/react batch them).

    // check if we have a previously remembered brain region for the target hierarchy
    const remembered = prevMemory[hierarchy.id];

    // update atoms for immediate UI feedback
    const result = await changeLocalStoreHierarchySpecies(
      hierarchy.id,
      remembered?.brainRegionId ?? null
    );
    const fallbackRegionId =
      runtimeHierarchyById.get(hierarchy.id)?.fallbackDefaultSelectedRegionId ??
      config.MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID;
    const fallbackRegionName = remembered?.brainRegionName ?? '';

    // flip into 'focused' mode now that workspaceSpecies + selectedBrainRegion
    // have been populated by changeLocalStoreHierarchySpecies.
    setSpeciesSelectionMode(SpeciesSelectionMode.Focused);

    syncExternalStores({
      hierarchyId: hierarchy.id,
      speciesName: hierarchy.species.name,
      brainRegionId: result?.brainRegion?.id ?? fallbackRegionId,
      brainRegionName: result?.brainRegion?.name ?? fallbackRegionName,
      perHierarchyMemory: prevMemory,
      speciesSelectionMode: SpeciesSelectionMode.Focused,
    });
  }

  /**
   * change the selected brain region within the current hierarchy
   */
  function changeBrainRegionImpl(region: IBrainRegionHierarchy | null) {
    if (!region) {
      setSelectedBrainRegion(null);

      const currentHierarchyId =
        selectedBrainRegion?.hierarchy_id ||
        browserStorageHierarchy?.hierarchyId ||
        remoteUserPreferenceHierarchySpecies?.hierarchy_id ||
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
        speciesSelectionMode: SpeciesSelectionMode.Focused,
      });
      return;
    }

    const currentHierarchyId = region.hierarchy_id;

    const currentSpeciesName =
      remoteAvailableHierarchies?.find((h) => h.id === currentHierarchyId)?.species.name || '';

    changeLocalStoreBrainRegion(region);
    setSpeciesSelectionMode(SpeciesSelectionMode.Focused);

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
      speciesSelectionMode: SpeciesSelectionMode.Focused,
    });
  }

  // use refs so the memoized callbacks always read the latest values
  const latestRef = useRef({
    selectedBrainRegion,
    browserStorageHierarchy,
    remoteAvailableHierarchies,
    workspaceSpecies,
    remoteUserPreferenceHierarchySpecies,
  });
  latestRef.current = {
    selectedBrainRegion,
    browserStorageHierarchy,
    remoteAvailableHierarchies,
    workspaceSpecies,
    remoteUserPreferenceHierarchySpecies,
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: uses latestRef for fresh values
  const changeBulkStoreHierarchySpecies = useCallback(
    (hIdOrMode: string | typeof SpeciesSelectionMode.All) =>
      changeBulkStoreHierarchySpeciesFn(hIdOrMode),
    [changeLocalStoreHierarchySpecies, setSelectedBrainRegion]
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: uses latestRef for fresh values
  const changeBrainRegion = useCallback(
    (region: IBrainRegionHierarchy | null) => changeBrainRegionImpl(region),
    [changeLocalStoreBrainRegion, setSelectedBrainRegion]
  );

  /**
   * initialize state from the active URL override, remote preference, localStorage,
   * or defaults once the current route boundary has settled.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: applyAllSpeciesMode uses stable jotai setters
  useEffect(() => {
    if (syncSettled || isBootstrapLoading) {
      return;
    }

    if (!remoteAvailableHierarchies?.length) {
      if (!isBootstrapLoading) {
        setSyncSettled(true);
      }
      return;
    }

    if (store.get(hierarchyRegistryInitWorkspaceKeyAtom) === workspaceKey) {
      return;
    }

    store.set(hierarchyRegistryInitWorkspaceKeyAtom, workspaceKey);

    async function sync() {
      const hasFocusedUrlOverride = !!focusedUrlOverride;
      const hasAllUrlOverride = isAllUrlOverride;
      const hasStoredSelection = !!browserStorageHierarchy?.hierarchyId;
      const remoteModeIsAll =
        remoteUserPreferenceHierarchySpecies?.species_selection_mode === SpeciesSelectionMode.All;
      const storageModeIsAll =
        browserStorageHierarchy?.speciesSelectionMode === SpeciesSelectionMode.All;

      // url override wins: `?s=all` on a page that allows it
      if (hasAllUrlOverride && allowAllSpecies) {
        applyAllSpeciesMode(browserStorageHierarchy?.perHierarchyMemory, {
          urlOverrideKey: 'all',
        });
        return;
      }

      if (hasFocusedUrlOverride) {
        const overrideKey = `${focusedUrlOverride.hierarchyId}:${focusedUrlOverride.brainRegionId}`;
        const hierarchy = remoteAvailableHierarchies?.find(
          (h) => h.id === focusedUrlOverride.hierarchyId
        );
        if (hierarchy) {
          setSpeciesSelectionMode(SpeciesSelectionMode.Focused);
          const result = await changeLocalStoreHierarchySpecies(
            hierarchy.id,
            focusedUrlOverride.brainRegionId || null
          );
          if (result?.brainRegion) {
            setBrowserStorageHierarchy({
              hierarchyId: focusedUrlOverride.hierarchyId,
              speciesName: hierarchy.species.name,
              brainRegionId: result.brainRegion.id,
              brainRegionName: result.brainRegion.name,
              perHierarchyMemory: browserStorageHierarchy?.perHierarchyMemory,
              speciesSelectionMode: SpeciesSelectionMode.Focused,
            });
          }
          setLastAppliedUrlOverride(overrideKey);
          return;
        }
        setLastAppliedUrlOverride(overrideKey);
        return;
      }

      // remote preference is "all": honor it if the page allows it
      if (remoteModeIsAll && allowAllSpecies) {
        applyAllSpeciesMode(browserStorageHierarchy?.perHierarchyMemory);
        return;
      }

      const remoteHierarchyId = remoteUserPreferenceHierarchySpecies?.hierarchy_id;
      if (remoteHierarchyId) {
        const hierarchy = remoteAvailableHierarchies?.find((h) => h.id === remoteHierarchyId);
        if (hierarchy) {
          setSpeciesSelectionMode(SpeciesSelectionMode.Focused);
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
            speciesSelectionMode: SpeciesSelectionMode.Focused,
          });
          return;
        }
      }

      // local storage stored "all": honor it if the page allows it
      if (storageModeIsAll && allowAllSpecies) {
        applyAllSpeciesMode(browserStorageHierarchy?.perHierarchyMemory, {
          persistStorage: false,
        });
        return;
      }

      if (hasStoredSelection) {
        const hierarchy = remoteAvailableHierarchies?.find(
          (h) => h.id === browserStorageHierarchy.hierarchyId
        );
        if (hierarchy) {
          setSpeciesSelectionMode(SpeciesSelectionMode.Focused);
          await changeLocalStoreHierarchySpecies(
            hierarchy.id,
            browserStorageHierarchy.brainRegionId
          );
          return;
        }
      }

      if (defaultHierarchy) {
        setSpeciesSelectionMode(SpeciesSelectionMode.Focused);
        const result = await changeLocalStoreHierarchySpecies(defaultHierarchy.id);
        const fallbackRegionId =
          runtimeHierarchyById.get(defaultHierarchy.id)?.fallbackDefaultSelectedRegionId ??
          config.MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID;

        setBrowserStorageHierarchy({
          hierarchyId: defaultHierarchy.id,
          speciesName: defaultHierarchy.species.name,
          brainRegionId: result?.brainRegion?.id ?? fallbackRegionId,
          brainRegionName: result?.brainRegion?.name ?? '',
          speciesSelectionMode: SpeciesSelectionMode.Focused,
        });
      }
    }

    void sync()
      .catch(() => undefined)
      .finally(() => {
        if (store.get(hierarchyRegistryInitWorkspaceKeyAtom) !== workspaceKey) {
          return;
        }
        store.set(hierarchyRegistryInitWorkspaceKeyAtom, null);
        store.set(hierarchyRegistrySyncSettledAtom, true);
      });
  }, [
    workspaceKey,
    store,
    syncSettled,
    remoteAvailableHierarchies,
    isBootstrapLoading,
    remoteUserPreferenceHierarchySpecies,
    focusedUrlOverride,
    isAllUrlOverride,
    allowAllSpecies,
    browserStorageHierarchy,
    defaultHierarchy,
    setBrowserStorageHierarchy,
    setSyncSettled,
    setLastAppliedUrlOverride,
    changeLocalStoreHierarchySpecies,
    runtimeHierarchyById,
    setSelectedBrainRegion,
    setWorkspaceSpecies,
    setSpeciesSelectionMode,
  ]);

  /**
   * apply fresh URL overrides after initialization, e.g. on back/forward navigation
   * within a synced route.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: applyAllSpeciesMode uses stable jotai setters
  useEffect(() => {
    if (
      !syncSettled ||
      isBootstrapLoading ||
      remoteAvailableHierarchies?.length === 0 ||
      (!focusedUrlOverride && !isAllUrlOverride)
    ) {
      if (!focusedUrlOverride && !isAllUrlOverride) {
        setLastAppliedUrlOverride(null);
      }
      return;
    }

    // handle `?s=all` url override
    if (isAllUrlOverride && allowAllSpecies) {
      const overrideKey = 'all';
      if (lastAppliedUrlOverride === overrideKey) return;

      if (speciesSelectionMode === SpeciesSelectionMode.All) {
        setLastAppliedUrlOverride(overrideKey);
        return;
      }

      applyAllSpeciesMode(browserStorageHierarchy?.perHierarchyMemory, {
        urlOverrideKey: overrideKey,
      });
      return;
    }

    if (!focusedUrlOverride) return;

    const overrideKey = `${focusedUrlOverride.hierarchyId}:${focusedUrlOverride.brainRegionId}`;
    if (lastAppliedUrlOverride === overrideKey) return;

    const matchesSelectedRegion =
      speciesSelectionMode === SpeciesSelectionMode.Focused &&
      selectedBrainRegion?.hierarchy_id === focusedUrlOverride.hierarchyId &&
      (!focusedUrlOverride.brainRegionId ||
        selectedBrainRegion?.id === focusedUrlOverride.brainRegionId);

    if (matchesSelectedRegion) {
      setLastAppliedUrlOverride(overrideKey);
      return;
    }

    const currentUrlOverride = focusedUrlOverride;

    async function applyUrlOverride() {
      const hierarchy = remoteAvailableHierarchies?.find(
        (h) => h.id === currentUrlOverride.hierarchyId
      );
      if (!hierarchy) {
        setLastAppliedUrlOverride(overrideKey);
        return;
      }

      setSpeciesSelectionMode(SpeciesSelectionMode.Focused);
      const result = await changeLocalStoreHierarchySpecies(
        hierarchy.id,
        currentUrlOverride.brainRegionId || null
      );
      if (result?.brainRegion) {
        setBrowserStorageHierarchy({
          hierarchyId: hierarchy.id,
          speciesName: hierarchy.species.name,
          brainRegionId: result.brainRegion.id,
          brainRegionName: result.brainRegion.name,
          perHierarchyMemory: browserStorageHierarchy?.perHierarchyMemory,
          speciesSelectionMode: SpeciesSelectionMode.Focused,
        });
      }
      setLastAppliedUrlOverride(overrideKey);
    }

    void applyUrlOverride();
  }, [
    syncSettled,
    lastAppliedUrlOverride,
    setLastAppliedUrlOverride,
    isBootstrapLoading,
    remoteAvailableHierarchies,
    focusedUrlOverride,
    isAllUrlOverride,
    allowAllSpecies,
    speciesSelectionMode,
    selectedBrainRegion,
    browserStorageHierarchy,
    changeLocalStoreHierarchySpecies,
    setBrowserStorageHierarchy,
    setSelectedBrainRegion,
    setWorkspaceSpecies,
    setSpeciesSelectionMode,
  ]);

  /**
   * set default brain region when hierarchy data loads and no region is selected
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: syncExternalStores is stable
  useEffect(() => {
    if (!brainRegions || !syncSettled) return;
    if (speciesSelectionMode === SpeciesSelectionMode.All) return; // no region selection when in "all" mode
    // skip while a species transition is mid-flight (workspaceSpecies temporarily
    // null). firing here would PATCH the preference with a stale fallback hierarchy.
    if (!workspaceSpecies) return;
    if (selectedBrainRegion) return; // already have a selection
    if (!defaultBrainRegionObject) return; // no default region available

    // check if we have a stored brain region to restore
    const storedRegionId =
      browserStorageHierarchy?.brainRegionId || focusedUrlOverride?.brainRegionId;
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
      focusedUrlOverride?.hierarchyId ||
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
      speciesSelectionMode: SpeciesSelectionMode.Focused,
    });
  }, [
    brainRegions,
    syncSettled,
    speciesSelectionMode,
    selectedBrainRegion,
    defaultBrainRegionObject,
    browserStorageHierarchy,
    focusedUrlOverride,
    defaultHierarchy,
    workspaceSpecies,
    setSelectedBrainRegion,
  ]);

  /**
   * when the current page does not allow the "all species" mode (the 3D viewer),
   * fall back to a focused selection instead of rendering a broken state.
   */
  useEffect(() => {
    if (!syncSettled) return;
    if (allowAllSpecies) return;
    if (speciesSelectionMode !== SpeciesSelectionMode.All) return;

    const fallbackHierarchyId =
      browserStorageHierarchy?.hierarchyId ||
      remoteUserPreferenceHierarchySpecies?.hierarchy_id ||
      defaultHierarchy?.id ||
      config.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID;

    if (!fallbackHierarchyId) return;

    void changeBulkStoreHierarchySpecies(fallbackHierarchyId);
  }, [
    syncSettled,
    allowAllSpecies,
    speciesSelectionMode,
    browserStorageHierarchy?.hierarchyId,
    remoteUserPreferenceHierarchySpecies?.hierarchy_id,
    defaultHierarchy?.id,
    changeBulkStoreHierarchySpecies,
  ]);

  const hasPendingUrlOverride =
    !!currentUrlOverrideKey && lastAppliedUrlOverride !== currentUrlOverrideKey;
  const isAllMode = speciesSelectionMode === SpeciesSelectionMode.All;
  const displaySpecies = resolveDisplayWorkspaceSpecies({
    isAllMode,
    workspaceSpecies,
    workspaceHierarchyId,
    remoteAvailableHierarchies,
  });
  const isUiLoading = getHierarchyBannerLoading({
    syncSettled,
    hasPendingUrlOverride,
    isBootstrapLoading,
    isRootHierarchyLoading,
    isAllMode,
    displaySpecies,
    hasAvailableHierarchies: !!remoteAvailableHierarchies?.length,
  });

  return {
    workspaceSpecies,
    selectedBrainRegion,
    workspaceHierarchyId,
    remoteAvailableHierarchies,
    displaySpecies,
    isUiLoading,
    syncSettled,
    hasPendingUrlOverride,
    speciesSelectionMode,
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
