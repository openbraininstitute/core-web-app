import memoize from 'memoize-one';

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
  brainHierarchy: IBrainRegionHierarchy | IBrainRegionHierarchy[],
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
  parentId: string | null = null,
): IBrainRegionHierarchyMap {
  map.set(root.id, { ...root, parent: parentId || undefined });
  root.children.forEach((child) => buildHierarchyMap(child, map, root.id));
  return map;
}

/**
 * Returns descendants and ancestors for a list of brain region ids
 */
function getBrainRegionDescendantsAndAncestors(
  brainRegionIds: string[],
  root: IBrainRegionHierarchy,
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
      const child = stack.pop()!;
      resultMap.set(child.id, child);
      stack.push(...child.children);
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
  getBrainRegionDescendantsAndAncestors,
);
