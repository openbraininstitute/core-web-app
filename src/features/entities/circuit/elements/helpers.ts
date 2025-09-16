import type { HierarchyNode, HierarchyTreeResponse } from '@/api/entitycore/types/shared/hierarchy';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

export function getAllCircuitIds(tree: HierarchyTreeResponse): string[] {
  const ids: string[] = [];

  function dfs(node: HierarchyNode) {
    ids.push(node.id);
    for (const child of node.children) {
      dfs(child);
    }
  }

  for (const rootNode of tree.data) {
    dfs(rootNode);
  }

  return ids;
}

/**
 * Counts all sub_circuits under the given node, deeply.
 *
 * @param node The node whose descendants you want to count.
 * @returns Total number of descendant sub_circuits.
 */
export type ICircuitEnriched = ICircuit & { sub_circuits: Array<ICircuitEnriched> };

export function countDeepSubCircuits(node: ICircuitEnriched): number {
  if (!node.sub_circuits || node.sub_circuits.length === 0) {
    return 0;
  }

  // Count direct children + their descendants
  return node.sub_circuits.reduce((sum, child) => sum + 1 + countDeepSubCircuits(child), 0);
}
