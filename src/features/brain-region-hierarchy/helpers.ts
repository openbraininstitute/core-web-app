import { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

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
