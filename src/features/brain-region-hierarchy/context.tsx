'use client';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useEffect, useRef } from 'react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import lowerCase from 'es-toolkit/compat/lowerCase';
import find from 'es-toolkit/compat/find';
import omit from 'es-toolkit/compat/omit';

import {
  flattenTreeAsObject,
  findNodeByKey,
  renameKeyDeep,
} from '@/components/tree/elements/helpers';
import { getBrainRegionHierarchy } from '@/api/entitycore/queries/general/brain-region';
import { getLeavesForEachRegion } from '@/features/brain-region-hierarchy/helpers';
import { brainAtlasAtom } from '@/features/brain-atlas-viewer/context';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { getSectionFromDataKey } from '@/utils/key-builder';
import { useUnwrappedValue } from '@/hooks/hooks';
import { tryCatch } from '@/api/utils';
import { log } from '@/utils/logger';
import { env } from '@/env';

import type {
  BrainRegionHierarchyBase,
  IBrainRegionHierarchy,
} from '@/api/entitycore/types/entities/brain-region';

type Props = {
  dataKey: string;
};

export const defaultExploreRegion = {
  id: 'http://api.brain-map.org/api/v2/data/Structure/567',
  title: 'Cerebrum',
};

export const DEFAULT_BRAIN_ATLAS_ID = env.NEXT_PUBLIC_DEFAULT_BRAIN_ATLAS_ID;
export const DEFAULT_BRAIN_REGION_HIERARCHY_ID = env.NEXT_PUBLIC_DEFAULT_BRAIN_REGION_HIERARCHY_ID;
const DEFAULT_SELECTED_BRAIN_REGION_NAME = 'Cerebrum'; // Awful but requested from entitycore for the moment
export const DEFAULT_SELECTED_BRAIN_REGION_ID = env.NEXT_PUBLIC_DEFAULT_SELECTED_BRAIN_REGION_ID;
export const ROOT_BRAIN_REGION_ANNOTATION_VALUE =
  env.NEXT_PUBLIC_ROOT_BRAIN_REGION_ANNOTATION_VALUE;
export const ROOT_BRAIN_REGION_ID = env.NEXT_PUBLIC_ROOT_BRAIN_REGION_ID;
export const BASIC_CELL_GROUPS_AND_REGIONS_BRAIN_REGION_ANNOTATION_VALUE =
  env.NEXT_PUBLIC_BASIC_CELL_GROUPS_AND_REGIONS_BRAIN_REGION_ANNOTATION_VALUE;
export const DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE = 567;
export const DEFAULT_BRAIN_REGION_ANNOTATION_FIELD = 'annotation_value';
export const DEFAULT_BRAIN_REGION_QUERY_ID = 'br_id';
export const DEFAULT_BRAIN_REGION_QUERY_ANNOTATION_VALUE = 'br_av';

export type BrainRegionHierarchyOption = {
  value: string;
  label: string;
  data: IBrainRegionHierarchy;
};
export type BrainRegionHierarchyAtomReturnType = {
  root: IBrainRegionHierarchy;
  nodes: IBrainRegionHierarchy | null;
  options: Array<BrainRegionHierarchyOption>;
  leaves: Map<string, IBrainRegionHierarchy[]>;
} | null;

export const brainRegionSidebarAtom = atom(false);
export const selectedBrainRegionAtom = atom<BrainRegionHierarchyBase | null>();
export const brainRegionRootHierarchyAtom = atom(async (get) => {
  const atlas = await get(brainAtlasAtom);

  const { data: root, error } = await tryCatch(
    getBrainRegionHierarchy({
      id: atlas?.hierarchy_id ?? env.NEXT_PUBLIC_DEFAULT_BRAIN_REGION_HIERARCHY_ID,
    })
  );
  if (error) {
    log('error', 'Failed to fetch brain regions:', error);
    throw error;
  }
  const options = flattenTreeAsObject<IBrainRegionHierarchy>(root).map((region) => ({
    value: region.id,
    label: `${region.name}`,
    data: region,
  }));

  return {
    root,
    options,
  };
});

export const brainRegionBasicCellGroupsRegionsHierarchyAtom = atom(
  async (get): Promise<BrainRegionHierarchyAtomReturnType> => {
    const { root: master } = await get(brainRegionRootHierarchyAtom);

    const root = findNodeByKey<IBrainRegionHierarchy>(
      DEFAULT_BRAIN_REGION_ANNOTATION_FIELD,
      BASIC_CELL_GROUPS_AND_REGIONS_BRAIN_REGION_ANNOTATION_VALUE,
      master
    );

    if (!root) {
      log(
        'warn',
        `Brain region with annotation_value ${BASIC_CELL_GROUPS_AND_REGIONS_BRAIN_REGION_ANNOTATION_VALUE} not found.`
      );
      return null;
    }
    let options: Array<BrainRegionHierarchyOption> = [];
    let leaves: Map<string, IBrainRegionHierarchy[]> = new Map();
    const nodes = renameKeyDeep<IBrainRegionHierarchy>(root, 'color_hex_triplet', 'color', true);

    if (root) {
      options = flattenTreeAsObject<IBrainRegionHierarchy>(root).map((region) => ({
        av: region.annotation_value,
        value: region.id,
        label: `${region.name}`,
        data: {
          ...region,
          color_hex_triplet: region.color_hex_triplet,
          color: region.color_hex_triplet,
        },
      }));
      leaves = getLeavesForEachRegion(root);
    }

    return { root, nodes, options, leaves };
  }
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
  const [selectedBrainRegion, updateSelectedBrainRegion] = useAtom(selectedBrainRegionAtom);
  const brainRegions = useUnwrappedValue(brainRegionBasicCellGroupsRegionsHierarchyAtom);

  const defaultSelectedBrainRegion = brainRegions?.options.find(
    (o) => lowerCase(o.label).trim() === lowerCase(DEFAULT_SELECTED_BRAIN_REGION_NAME).trim()
  );

  const [stored, updateLocalStorage] = useLocalStorage<{
    id: string;
    annotation_value: number;
  } | null>(key, null);

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const [{ id, annotation_value }, setHierarchyConfig] = useQueryStates(
    {
      id: parseAsString.withDefault(''),
      annotation_value: parseAsInteger.withDefault(0),
    },
    {
      urlKeys: {
        id: DEFAULT_BRAIN_REGION_QUERY_ID,
        annotation_value: DEFAULT_BRAIN_REGION_QUERY_ANNOTATION_VALUE,
      },
      shallow: false,
      clearOnDefault: false,
    }
  );

  // track if config was already initialized to avoid infinite loop
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current || !brainRegions) return;
    const hasURLParams = !!id && !!annotation_value;

    if (hasURLParams) {
      isInitializedRef.current = true;
      if (selectedBrainRegion?.id !== id) {
        const foundNode = find(brainRegions?.options, (o) => o.data.id === id)?.data;
        if (foundNode) {
          updateSelectedBrainRegion(omit(foundNode, 'children'));
        }
      }
      return;
    }

    if (stored?.id && stored?.annotation_value) {
      if (id !== stored.id || annotation_value !== stored.annotation_value) {
        const foundNode = find(brainRegions?.options, (o) => o.data.id === stored.id)?.data;
        if (foundNode) {
          setHierarchyConfig({ id: foundNode.id, annotation_value: foundNode.annotation_value });
          updateSelectedBrainRegion(omit(foundNode, 'children'));
        }
      }
      isInitializedRef.current = true;
      return;
    }

    if (defaultSelectedBrainRegion) {
      if (
        id !== defaultSelectedBrainRegion.value ||
        annotation_value !== defaultSelectedBrainRegion.data.annotation_value
      ) {
        updateSelectedBrainRegion(omit(defaultSelectedBrainRegion.data, 'children'));
        setHierarchyConfig({
          id: defaultSelectedBrainRegion.value,
          annotation_value: defaultSelectedBrainRegion.data.annotation_value,
        });
      }
    }

    isInitializedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brainRegions, id, annotation_value, stored, defaultSelectedBrainRegion]);

  // Sync localStorage when URL params change
  useEffect(() => {
    if (id && annotation_value && defaultSelectedBrainRegion) {
      const config = { id, annotation_value };
      updateLocalStorage(config);
    }
  }, [id, annotation_value, defaultSelectedBrainRegion, updateLocalStorage]);

  /**
   * Updates the hierarchy configuration state
   * and persists the changes to local storage.
   *
   * @param node - An object representing a brain region hierarchy,
   * containing the `id`, `name`, and `annotation_value` properties.
   */
  const updateHierarchyConfig = (node: IBrainRegionHierarchy | null) => {
    const region = node
      ? { id: node.id, name: node.name, annotation_value: node?.annotation_value }
      : null;

    // Only update if the values are actually different
    if (region && (id !== region.id || annotation_value !== region.annotation_value)) {
      // Ensure the UI (e.g., RegionBanner) reflects the new selection immediately
      // before any URL updates that may cause re-renders.
      updateSelectedBrainRegion(omit(node, 'children'));
      updateLocalStorage(region);
      setHierarchyConfig(region);
    } else if (!region && (id !== '' || annotation_value !== 0)) {
      // Clear selection first to keep UI in sync, then update storage and URL
      updateSelectedBrainRegion(null);
      updateLocalStorage(region);
      setHierarchyConfig(region);
    }
  };

  return {
    node: { id, annotation_value },
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

brainRegionBasicCellGroupsRegionsHierarchyAtom.debugLabel =
  'brainRegionBasicCellGroupsRegionsHierarchyAtom';
brainRegionSidebarAtom.debugLabel = 'brainRegionSidebarAtom';
selectedBrainRegionAtom.debugLabel = 'selectedBrainRegionAtom';
