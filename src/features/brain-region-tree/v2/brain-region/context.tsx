import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { atom } from 'jotai';

import {
  findNodeByKey,
  flattenTreeAsObject,
  renameKeyDeep,
} from '@/components/tree/elements/helpers';
import { getBrainRegionHierarchy } from '@/api/entitycore/queries/general/brain-region';
import { tryCatch } from '@/api/utils';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import { useLocalStorage } from '@/hooks/use-local-storage';

type Props = {
  dataKey: string;
};

export const DEFAULT_BRAIN_REGION_HIERARCHY_ID = 'e3e70682-c209-4cac-a29f-6fbed82c07cd';
export const DEFAULT_SELECTED_BRAIN_REGION_ID = '4642cddb-4fbe-4aae-bbf7-0946d6ada066';
export const DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE = 567;
export const DEFAULT_SELECTED_BRAIN_REGION_NAME = 'Cerebrum';
export const DEFAULT_ROOT_BRAIN_REGION_ANNOTATION_VALUE = 8;
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
    const targetNode = findNodeByKey<IBrainRegionHierarchy>(
      DEFAULT_BRAIN_REGION_ANNOTATION_FIELD,
      DEFAULT_ROOT_BRAIN_REGION_ANNOTATION_VALUE,
      brainRegions
    );

    if (!targetNode) {
      console.warn("Brain region with annotation_value '8' not found.");
      return null;
    }
    let options: Array<BrainRegionHierarchyOption> = [];
    const nodes = renameKeyDeep<IBrainRegionHierarchy>(targetNode, 'color_hex_triplet', 'color');
    if (nodes) {
      options = flattenTreeAsObject<IBrainRegionHierarchy>(nodes).map((region) => ({
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
 */
export const useBrainRegionHierarchy = ({ dataKey }: Props) => {
  const [brainRegionHierarchyFamily, updateLocalStorage] = useLocalStorage(dataKey, {
    id: DEFAULT_SELECTED_BRAIN_REGION_ID,
    name: DEFAULT_SELECTED_BRAIN_REGION_NAME,
    annotation_value: DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE,
  });

  const [{ id, annotation_value, name }, setHierarchyConfig] = useQueryStates(
    {
      id: parseAsString.withDefault(brainRegionHierarchyFamily.id),
      name: parseAsString.withDefault(brainRegionHierarchyFamily.name),
      annotation_value: parseAsInteger.withDefault(brainRegionHierarchyFamily.annotation_value),
    },
    {
      urlKeys: {
        id: DEFAULT_BRAIN_REGION_QUERY_ID,
        name: DEFAULT_BRAIN_REGION_QUERY_NAME,
        annotation_value: DEFAULT_BRAIN_REGION_QUERY_ANNOTATION_VALUE,
      },
    }
  );

  /**
   * Updates the hierarchy configuration state and persists the changes to local storage.
   *
   * @param node - An object representing a brain region hierarchy, containing the `id`, `name`, and `annotation_value` properties.
   */
  const updateHierarchyConfig = (node: IBrainRegionHierarchy) => {
    const { id, name, annotation_value } = node;
    setHierarchyConfig({ id, name, annotation_value });
    updateLocalStorage({
      id,
      name,
      annotation_value,
    });
  };

  return {
    node: { id, name, annotation_value },
    updateHierarchyConfig,
  };
};

brainRegionHierarchyAtom.debugLabel = 'brainRegionHierarchyAtom';
brainRegionSidebarAtom.debugLabel = 'brainRegionSidebarAtom';
