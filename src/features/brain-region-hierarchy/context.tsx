'use client';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useEffect, useRef } from 'react';
import { atom } from 'jotai';
import lowerCase from 'lodash/lowerCase';

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

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

type Props = {
  dataKey: string;
};

// TODO: this should be removed, use the atom and env to get the needed values
export const BASIC_CELL_GROUPS_AND_REGIONS_ID = 'http://api.brain-map.org/api/v2/data/Structure/8'; // for legacy compatibility (need in ai suggestions @fabien)
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

type BrainRegionHierarchyOption = {
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
    const nodes = renameKeyDeep<IBrainRegionHierarchy>(root, 'color_hex_triplet', 'color');

    if (nodes) {
      options = flattenTreeAsObject<IBrainRegionHierarchy>(root).map((region) => ({
        av: region.annotation_value,
        value: region.id,
        label: `${region.name}`,
        data: region,
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
      return;
    }

    if (stored?.id && stored?.annotation_value) {
      if (id !== stored.id || annotation_value !== stored.annotation_value) {
        setHierarchyConfig(stored);
      }
      isInitializedRef.current = true;
      return;
    }

    if (defaultSelectedBrainRegion) {
      if (
        id !== defaultSelectedBrainRegion.value ||
        annotation_value !== defaultSelectedBrainRegion.data.annotation_value
      ) {
        setHierarchyConfig({
          id: defaultSelectedBrainRegion.value,
          annotation_value: defaultSelectedBrainRegion.data.annotation_value,
        });
      }
    }

    isInitializedRef.current = true;
  }, [brainRegions, id, annotation_value, stored, setHierarchyConfig, defaultSelectedBrainRegion]);

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
    setHierarchyConfig(region);
    updateLocalStorage(region);
  };

  return {
    node: { id, annotation_value },
    updateHierarchyConfig,
  };
};

brainRegionBasicCellGroupsRegionsHierarchyAtom.debugLabel =
  'brainRegionBasicCellGroupsRegionsHierarchyAtom';
brainRegionSidebarAtom.debugLabel = 'brainRegionSidebarAtom';
