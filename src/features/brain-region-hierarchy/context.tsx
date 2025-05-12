'use client';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useEffect } from 'react';
import { atom } from 'jotai';

import {
  findNodeByKey,
  flattenTreeAsObject,
  renameKeyDeep,
} from '@/components/tree/elements/helpers';
import { getBrainRegionHierarchy } from '@/api/entitycore/queries/general/brain-region';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { getSectionFromDataKey } from '@/utils/key-builder';
import { tryCatch } from '@/api/utils';
import { env } from '@/env';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

type Props = {
  dataKey: string;
};

export const DEFAULT_BRAIN_REGION_HIERARCHY_ID = env.NEXT_PUBLIC_DEFAULT_BRAIN_REGION_HIERARCHY_ID;
export const DEFAULT_SELECTED_BRAIN_REGION_ID = env.NEXT_PUBLIC_DEFAULT_SELECTED_BRAIN_REGION_ID;
export const DEFAULT_ROOT_BRAIN_REGION_ANNOTATION_VALUE =
  env.NEXT_PUBLIC_DEFAULT_ROOT_BRAIN_REGION_ANNOTATION_VALUE;
export const DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE = 567;
export const DEFAULT_BRAIN_REGION_ANNOTATION_FIELD = 'annotation_value';
export const DEFAULT_BRAIN_REGION_QUERY_ID = 'br_id';
export const DEFAULT_BRAIN_REGION_QUERY_NAME = 'br_name';
export const DEFAULT_BRAIN_REGION_QUERY_ANNOTATION_VALUE = 'br_av';

type BrainRegionHierarchyOption = {
  value: string;
  label: string;
  data: IBrainRegionHierarchy;
};
type BrainRegionHierarchyAtomReturnType = {
  nodes: IBrainRegionHierarchy | null;
  options: Array<BrainRegionHierarchyOption>;
} | null;

export const brainRegionSidebarAtom = atom(false);
export const brainRegionHierarchyAtom = atom(
  async (): Promise<BrainRegionHierarchyAtomReturnType> => {
    const { data: brainRegions, error } = await tryCatch(getBrainRegionHierarchy({}));
    if (error) {
      console.error('Failed to fetch brain regions:', error);
      throw error;
    }
    const root = findNodeByKey<IBrainRegionHierarchy>(
      DEFAULT_BRAIN_REGION_ANNOTATION_FIELD,
      DEFAULT_ROOT_BRAIN_REGION_ANNOTATION_VALUE,
      brainRegions
    );

    if (!root) {
      console.warn(
        `Brain region with annotation_value ${DEFAULT_ROOT_BRAIN_REGION_ANNOTATION_VALUE} not found.`
      );
      return null;
    }
    let options: Array<BrainRegionHierarchyOption> = [];
    const nodes = renameKeyDeep<IBrainRegionHierarchy>(root, 'color_hex_triplet', 'color');
    if (nodes) {
      options = flattenTreeAsObject<IBrainRegionHierarchy>(root).map((region) => ({
        value: region.id,
        label: `${region.name}`,
        data: region,
      }));
    }

    return { nodes, options };
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
  const [brainRegionHierarchyFamily, updateLocalStorage] = useLocalStorage<{
    id: string;
    annotation_value: number;
  } | null>(key, {
    id: DEFAULT_SELECTED_BRAIN_REGION_ID,
    annotation_value: DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE,
  });

  const [{ id, annotation_value }, setHierarchyConfig] = useQueryStates(
    {
      id: parseAsString.withDefault(brainRegionHierarchyFamily?.id ?? ''),
      annotation_value: parseAsInteger.withDefault(
        brainRegionHierarchyFamily?.annotation_value ?? 0
      ),
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

  // This is to update the url if the params are not present
  useEffect(() => {
    const url = new URL(window.location.href);
    const hasIdParam = url.searchParams.has(DEFAULT_BRAIN_REGION_QUERY_ID);
    const hasAnnotationValueParam = url.searchParams.has(
      DEFAULT_BRAIN_REGION_QUERY_ANNOTATION_VALUE
    );
    if (!hasIdParam || !hasAnnotationValueParam) {
      setHierarchyConfig({
        id: id,
        annotation_value: annotation_value,
      });
    }
  }, []);

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
    node: { id, name, annotation_value },
    updateHierarchyConfig,
  };
};

brainRegionHierarchyAtom.debugLabel = 'brainRegionHierarchyAtom';
brainRegionSidebarAtom.debugLabel = 'brainRegionSidebarAtom';
