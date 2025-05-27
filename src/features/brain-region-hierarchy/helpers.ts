import { IBrainAtlasRegion } from '@/api/entitycore/types/entities/brain-atlas';
import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import { Prettify } from '@/utils/type';

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

export interface IBrainRegionLeaves {
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
