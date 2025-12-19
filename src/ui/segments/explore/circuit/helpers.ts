import { keyBy } from 'es-toolkit/compat';
import { atom } from 'jotai';
import { atomWithReset } from 'jotai/utils';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { HierarchyNode, HierarchyTreeResponse } from '@/api/entitycore/types/shared/hierarchy';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';

export const CircuitRepresentationView = {
  Flat: 'flat',
  Hierarchy: 'hierarchy',
} as const;
export type TCircuitRepresentationView =
  (typeof CircuitRepresentationView)[keyof typeof CircuitRepresentationView];

export const circuitRepresentationViewAtom = atomWithReset<TCircuitRepresentationView>('hierarchy');
export const resetFilterSignalAtom = atom(0);

export interface HierarchyOutputNode extends Omit<HierarchyNode, 'children'>, ICircuit {
  sub_circuits: HierarchyOutputNode[];
  isFiltered: boolean;
}

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
export type ICircuitEnriched = ICircuit & { sub_circuits: ICircuitEnriched[] };

export function countDeepSubCircuits(node: ICircuitEnriched): number {
  if (!node.sub_circuits || node.sub_circuits.length === 0) {
    return 0;
  }

  // Count direct children + their descendants
  return node.sub_circuits.reduce((sum, child) => sum + 1 + countDeepSubCircuits(child), 0);
}

export function findParentInTree(roots: HierarchyNode[], targetId: string): HierarchyNode | null {
  for (const node of roots) {
    for (const child of node.children) {
      if (child.id === targetId) {
        return node;
      }
    }
    const parent = findParentInTree(node.children, targetId);
    if (parent) return parent;
  }
  return null;
}

export function findNodeInTree(roots: HierarchyNode[], targetId: string): HierarchyNode | null {
  for (const node of roots) {
    if (node.id === targetId) return node;
    const found = findNodeInTree(node.children, targetId);
    if (found) return found;
  }
  return null;
}

export function filterAndEnrichTree(
  nodes: HierarchyNode[],
  filteredIds: Set<string>,
  fullById: Record<string, ICircuit & { sub_circuits: ICircuit; children: ICircuit }>,
): HierarchyOutputNode[];
export function filterAndEnrichTree(
  nodes: HierarchyNode[],
  filteredIds: Set<string>,
  fullById: Record<string, ICircuit>,
): HierarchyOutputNode[];
export function filterAndEnrichTree<T extends ICircuit>(
  nodes: HierarchyNode[],
  filteredIds: Set<string>,
  fullById: Record<string, T>,
): HierarchyOutputNode[] {
  return nodes
    .map((node) => {
      const keptChildren = filterAndEnrichTree(node.children, filteredIds, fullById);
      const isFiltered = filteredIds.has(node.id);
      const keep = isFiltered || keptChildren.length > 0;

      if (!keep) return null;

      const enriched = fullById[node.id] ?? {};
      const { children: ignored1, sub_circuits: ignored2, ...enrichedSansKids } = enriched as any;
      const { children: ignored3, ...baseSansKids } = node;

      return {
        ...baseSansKids,
        ...enrichedSansKids,
        isFiltered,
        sub_circuits: keptChildren,
      };
    })
    .filter((x): x is HierarchyOutputNode => x !== null);
}

export function collectIdsFromNode(root: HierarchyNode): string[] {
  const acc: string[] = [];
  const dfs = (n: HierarchyNode) => {
    acc.push(n.id);
    for (const c of n.children) dfs(c);
  };
  dfs(root);
  return acc;
}

export function buildFilteredHierarchyTree(
  hierarchy: HierarchyTreeResponse,
  result: EntityCoreResponse<ICircuit>,
  filteredResult: EntityCoreResponse<ICircuit>,
): HierarchyOutputNode[] {
  const fullById = keyBy(result.data, 'id') as Record<
    string,
    ICircuit & { sub_circuits: ICircuit; children: ICircuit }
  >;

  const filteredIds = new Set(filteredResult.data.map((c) => c.id));
  const filteredTree = filterAndEnrichTree(hierarchy.data, filteredIds, fullById);

  return filteredTree;
}
