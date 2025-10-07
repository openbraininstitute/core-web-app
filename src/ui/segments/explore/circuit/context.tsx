import { atomWithCache } from 'jotai-cache';
import { atomFamily } from 'jotai/utils';

import mergeWith from 'es-toolkit/compat/mergeWith';
import isArray from 'es-toolkit/compat/isArray';
import flatMap from 'es-toolkit/compat/flatMap';
import uniqBy from 'es-toolkit/compat/uniqBy';
import chunk from 'es-toolkit/compat/chunk';
import keyBy from 'es-toolkit/compat/keyBy';
import { atom } from 'jotai';
import _get from 'es-toolkit/compat/get';
import pMap from 'p-map';

import { DerivationTypeDictionary } from '@/api/entitycore/types/entities/derivation';
import { getAllCircuitIds } from '@/features/entities/circuit/elements/helpers';
import {
  getCircuitHierarchyByDerivation,
  getCircuits,
} from '@/api/entitycore/queries/model/circuit';
import { DEFAULT_PAGE_SIZE } from '@/constants';

import type { HierarchyNode, HierarchyTreeResponse } from '@/api/entitycore/types/shared/hierarchy';
import type { EntityCoreResponse, Facets } from '@/api/entitycore/types/shared/response';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

export interface HierarchyOutputNode extends Omit<HierarchyNode, 'children'>, ICircuit {
  sub_circuits: HierarchyOutputNode[];
  isFiltered: boolean;
}

export const circuitRepresentationAtom = atom<'flat' | 'hierarchy'>('hierarchy');
export const resetFilterSignalAtom = atom(0);

function findNodeInTree(roots: HierarchyNode[], targetId: string): HierarchyNode | null {
  for (const node of roots) {
    if (node.id === targetId) return node;
    const found = findNodeInTree(node.children, targetId);
    if (found) return found;
  }
  return null;
}

function collectIdsFromNode(root: HierarchyNode): string[] {
  const acc: string[] = [];
  const dfs = (n: HierarchyNode) => {
    acc.push(n.id);
    for (const c of n.children) dfs(c);
  };
  dfs(root);
  return acc;
}

function findParentInTree(roots: HierarchyNode[], targetId: string): HierarchyNode | null {
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

export const circuitHierarchy = atomFamily(
  ({ key, virtualLabId, projectId }: { key: string } & Partial<WorkspaceContext>) => {
    const childAtom = atomWithCache(
      async (get) => {
        const hierarchyByDerivation = await get(
          hierarchyByExtractionDerivationAtomFamily({ key, virtualLabId, projectId })
        );
        const IDs = getAllCircuitIds(hierarchyByDerivation);
        const chunks = chunk(IDs, 30);
        const result = await pMap(
          chunks,
          (elements) =>
            getCircuits({
              withFacets: true,
              context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
              filters: { page: 1, page_size: DEFAULT_PAGE_SIZE, id__in: elements },
            }),
          { concurrency: 5 }
        );
        const allCircuits = flatMap(result, (r) => r.data);
        const allFacets = mergeWith(
          {},
          ...result.map((r) => r.facets || {}),
          (objValue: Facets[], srcValue: Facets[]) => {
            if (isArray(objValue)) {
              return uniqBy([...objValue, ...srcValue], 'id');
            }
            return undefined; // default merge for non-arrays
          }
        );
        const totalPageSize = result.reduce((sum, r) => sum + r.pagination.page_size, 0);

        return {
          data: allCircuits,
          facets: allFacets,
          pagination: {
            page: 1,
            page_size: DEFAULT_PAGE_SIZE,
            total_items: totalPageSize,
          },
        };
      },
      {
        size: 1000,
      }
    );
    childAtom.debugLabel = `circuit-cache-${key}`;
    return childAtom;
  },
  (a, b) => a.key === b.key
);

export const hierarchyByExtractionDerivationAtomFamily = atomFamily(
  ({ key, virtualLabId, projectId }: { key: string } & Partial<WorkspaceContext>) => {
    const childAtom = atom(async () => {
      const hierarchyByDerivation = await getCircuitHierarchyByDerivation({
        context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
        derivation_type: DerivationTypeDictionary.CircuitExtraction,
      });
      childAtom.debugLabel = `circuit_extraction-derivation/${key}`;
      return hierarchyByDerivation;
    });
    return childAtom;
  }
);

export const hierarchyByRewiringDerivationAtomFamily = atomFamily(
  ({ key, virtualLabId, projectId }: { key: string } & Partial<WorkspaceContext>) => {
    const childAtom = atom(async () => {
      const hierarchyByDerivation = await getCircuitHierarchyByDerivation({
        context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
        derivation_type: DerivationTypeDictionary.CircuitRewiring,
      });
      childAtom.debugLabel = `circuit_rewiring-derivation/${key}`;
      return hierarchyByDerivation;
    });
    return childAtom;
  }
);

export const hierarchyAllLevelsAtomFamily = atomFamily(
  ({
    key,
    virtualLabId,
    projectId,
    entityId,
  }: { key: string; entityId: string } & Partial<WorkspaceContext>) => {
    const childAtom = atom(async (get) => {
      let extractionParentCircuitAsParent: ICircuit | undefined;
      let rewiringParentCircuitAsDerivedFrom: ICircuit | undefined;
      const fullCircuits = await get(circuitHierarchy({ key, virtualLabId, projectId }));
      const fullById = keyBy(fullCircuits.data, 'id');

      const extractionDerivation = await get(
        hierarchyByExtractionDerivationAtomFamily({ key, virtualLabId, projectId })
      );
      const rewiringDerivation = await get(
        hierarchyByRewiringDerivationAtomFamily({ key, virtualLabId, projectId })
      );

      const extractionParent = findParentInTree(extractionDerivation.data, entityId);
      const rewiringParent = findParentInTree(rewiringDerivation.data, entityId);
      const extractionNode = findNodeInTree(extractionDerivation.data, entityId);

      const rewiringNode = findNodeInTree(rewiringDerivation.data, entityId);

      const extractionTreeAsSubcircuits = extractionNode
        ? filterAndEnrichTree(
            [extractionNode],
            new Set(collectIdsFromNode(extractionNode)),
            fullById
          )
        : [];

      const rewiringTreeAsDerivedCircuits = rewiringNode
        ? filterAndEnrichTree([rewiringNode], new Set(collectIdsFromNode(rewiringNode)), fullById)
        : [];

      if (extractionParent) extractionParentCircuitAsParent = _get(fullById, extractionParent.id);
      if (rewiringParent) rewiringParentCircuitAsDerivedFrom = _get(fullById, rewiringParent.id);

      return {
        subCircuits: extractionTreeAsSubcircuits,
        derived: rewiringTreeAsDerivedCircuits,
        parent: extractionParentCircuitAsParent,
        derivedFrom: rewiringParentCircuitAsDerivedFrom,
      };
    });

    childAtom.debugLabel = `derivation-levels-${key}/${entityId}`;
    return childAtom;
  },
  (a, b) => a.key === b.key
);

function filterAndEnrichTree(
  nodes: HierarchyNode[],
  filteredIds: Set<string>,
  fullById: Record<string, ICircuit & { sub_circuits: ICircuit; children: ICircuit }>
): HierarchyOutputNode[];
function filterAndEnrichTree(
  nodes: HierarchyNode[],
  filteredIds: Set<string>,
  fullById: Record<string, ICircuit>
): HierarchyOutputNode[];
function filterAndEnrichTree<T extends ICircuit>(
  nodes: HierarchyNode[],
  filteredIds: Set<string>,
  fullById: Record<string, T>
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

export function buildFilteredHierarchyTree(
  hierarchy: HierarchyTreeResponse,
  result: EntityCoreResponse<ICircuit>,
  filteredResult: EntityCoreResponse<ICircuit>
): HierarchyOutputNode[] {
  const fullById = keyBy(result.data, 'id') as Record<
    string,
    ICircuit & { sub_circuits: ICircuit; children: ICircuit }
  >;

  const filteredIds = new Set(filteredResult.data.map((c) => c.id));
  const filteredTree = filterAndEnrichTree(hierarchy.data, filteredIds, fullById);

  return filteredTree;
}
