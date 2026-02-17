import isNil from 'es-toolkit/compat/isNil';
import memoize from 'memoize-one';

import {
  type IBrainRegionHierarchyExtended,
  type IWorkspaceSpecies,
  SPECIES_DISPLAY_NAMES,
} from '@/features/brain-region-hierarchy/types';

import type { IBrainAtlasRegion } from '@/api/entitycore/types/entities/brain-atlas';
import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

export function findParentIds(root: IBrainRegionHierarchy, targetId: string): string[] {
  function dfs(node: IBrainRegionHierarchy, path: string[]): string[] | null {
    if (node.id === targetId) {
      return path;
    }

    for (const child of node.children) {
      const result = dfs(child, [...path, node.id]);
      if (result) {
        return result;
      }
    }

    return null;
  }

  return dfs(root, []) ?? [];
}

interface IBrainRegionLeaves {
  id: string;
  leaves: IBrainRegionHierarchy[];
}

/**
 * Recursively finds all leaf node IDs under a given brain region.
 * @param region - The brain region node to start from.
 * @returns An array of leaf node IDs.
 */
function getLeafIds(region: IBrainRegionHierarchy): IBrainRegionHierarchy[] {
  if (!region.children || region.children.length === 0) {
    return [region];
  }

  let leaves: IBrainRegionHierarchy[] = [];
  for (const child of region.children) {
    leaves = leaves.concat(getLeafIds(child));
  }
  return leaves;
}

/**
 * Processes the brain region hierarchy to find leaves for each region.
 * @param brainHierarchy - The root brain region object or an array of root objects.
 * @returns An array of IRegionLeaves objects.
 */
export function getLeavesForEachRegion(
  brainHierarchy: IBrainRegionHierarchy | IBrainRegionHierarchy[]
): Map<string, IBrainRegionHierarchy[]> {
  const results: IBrainRegionLeaves[] = [];
  const regionsToProcess: IBrainRegionHierarchy[] = Array.isArray(brainHierarchy)
    ? [...brainHierarchy]
    : [brainHierarchy];

  function processRegion(region: IBrainRegionHierarchy): void {
    const leavesForCurrentRegion = getLeafIds(region);
    results.push({ id: region.id, leaves: leavesForCurrentRegion });

    if (region.children && region.children.length > 0) {
      for (const child of region.children) {
        processRegion(child);
      }
    }
  }

  for (const rootRegion of regionsToProcess) {
    processRegion(rootRegion);
  }

  return new Map<string, IBrainRegionHierarchy[]>(results.map((item) => [item.id, item.leaves]));
}

type IBrainRegionHierarchyMap = Map<string, IBrainRegionHierarchy & { parent?: string }>;

/**
 * Builds a flat map of all nodes from the tree, including parent linkage.
 */
export function buildHierarchyMap(
  root: IBrainRegionHierarchy,
  map: IBrainRegionHierarchyMap = new Map(),
  parentId: string | null = null
): IBrainRegionHierarchyMap {
  map.set(root.id, { ...root, parent: parentId || undefined });
  root.children.forEach((child) => {
    buildHierarchyMap(child, map, root.id);
  });
  return map;
}

/**
 * Returns descendants and ancestors for a list of brain region ids
 */
function getBrainRegionDescendantsAndAncestors(
  brainRegionIds: string[],
  root: IBrainRegionHierarchy
): IBrainRegionHierarchy[] {
  const nodeMap = buildHierarchyMap(root);
  const resultMap = new Map<string, IBrainRegionHierarchy>();

  for (const id of brainRegionIds) {
    const node = nodeMap.get(id);
    if (!node) continue;

    // Add the node itself
    resultMap.set(node.id, node);

    // Collect descendants with DFS (iterative)
    const stack = [...node.children];
    while (stack.length) {
      const child = stack.pop();
      if (child) {
        resultMap.set(child.id, child);
        stack.push(...child.children);
      }
    }

    // Collect ancestors using parent linkage
    let parentId = node.parent;
    while (parentId) {
      const parent = nodeMap.get(parentId);
      if (!parent || resultMap.has(parent.id)) break;
      resultMap.set(parent.id, parent);
      parentId = parent.parent;
    }
  }

  return Array.from(resultMap.values());
}

export const getBrainRegionDescendantsAndAncestorsNodes = memoize(
  getBrainRegionDescendantsAndAncestors
);

/**
 * merges brain region hierarchy with atlas region data.
 * adds is_leaf_region, volume, and is_volumetric_region to each node.
 *
 * is_volumetric_region is true if:
 * - the node has volume > 0, or
 * - any of its descendants has volume > 0 (bubbles up from children)
 */
export function mergeHierarchyWithAtlas(
  node: IBrainRegionHierarchy,
  atlasMap: Map<string, IBrainAtlasRegion>
): IBrainRegionHierarchyExtended {
  const atlasRegion = atlasMap.get(node.id);
  const volume = atlasRegion?.volume ?? 0;
  const isLeafRegion = atlasRegion?.is_leaf_region ?? false;

  // process children first (recursive) so their is_volumetric_region is computed
  const extendedChildren: Array<IBrainRegionHierarchyExtended> = node.children
    .filter((child) => !isNil(child))
    .map((child) => mergeHierarchyWithAtlas(child, atlasMap));

  // is_volumetric_region is true if:
  // - This node has volume > 0, OR
  // - Any child is volumetric (has volume itself or has volumetric descendants)
  const hasVolumetricChild = extendedChildren.some((child) => child.is_volumetric_region);
  const isVolumetricRegion = volume > 0 || hasVolumetricChild;

  return {
    ...node,
    is_leaf_region: isLeafRegion,
    volume,
    is_volumetric_region: isVolumetricRegion,
    children: extendedChildren,
  };
}

/**
 * gets leaves for each region in the extended hierarchy.
 */
export function getLeavesForEachRegionExtended(
  root: IBrainRegionHierarchyExtended
): Map<string, IBrainRegionHierarchyExtended[]> {
  const leavesMap = new Map<string, IBrainRegionHierarchyExtended[]>();

  function collectLeaves(
    node: IBrainRegionHierarchyExtended
  ): Array<IBrainRegionHierarchyExtended> {
    if (!node.children || node.children.length === 0) {
      return [node];
    }

    const leaves: Array<IBrainRegionHierarchyExtended> = [];
    for (const child of node.children) {
      leaves.push(...collectLeaves(child));
    }
    return leaves;
  }

  function traverse(node: IBrainRegionHierarchyExtended): void {
    leavesMap.set(node.id, collectLeaves(node));
    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(root);
  return leavesMap;
}

export function injectHierarchyId(
  node: Omit<IBrainRegionHierarchy, 'hierarchy_id'>,
  hierarchyId: string
): IBrainRegionHierarchy {
  return {
    ...node,
    hierarchy_id: hierarchyId,
    children: node.children.map((child) => injectHierarchyId(child, hierarchyId)),
  };
}

/**
 * Get display name for a species, falling back to scientific name
 */
export function getSpeciesDisplayName(scientificName: string): string {
  return SPECIES_DISPLAY_NAMES[scientificName] ?? scientificName;
}

/**
 * Transform API species data to SpeciesInfo with display name
 */
export function transformSpecies(
  hierarchId: string,
  apiSpecies: {
    id: string;
    name: string;
    taxonomy_id: string;
  }
): IWorkspaceSpecies {
  return {
    id: apiSpecies.id,
    name: apiSpecies.name,
    taxonomyId: apiSpecies.taxonomy_id,
    hierarchId,
    displayName: getSpeciesDisplayName(apiSpecies.name),
  };
}
