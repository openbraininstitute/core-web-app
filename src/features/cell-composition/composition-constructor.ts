/* eslint-disable no-param-reassign */

import type { IBrainAtlasRegion } from '@/api/entitycore/types/entities/brain-atlas';
import type {
  CellCompositionBrainRegion,
  CellCompositionBrainRegionEType,
  CellCompositionMType,
  ICellCompositionRoot,
} from '@/api/entitycore/types/entities/cell-composition';

import type { TBrainRegionHierarchyAtomReturnType } from '@/features/brain-region-hierarchy/context';
import type { NeuronComposition, RawTreeNode } from '@/features/cell-composition/types';
import { memoize } from '@/util/utils';
import { log } from '@/utils/logger';

const NEURON_DENSITY_SCALE = 1e-9;

/**
 * retrieves the ids of leaf nodes for a given brain region Id from the hierarchy.
 * @param hierarchy - the brain region hierarchy data.
 * @param id - the id of the brain region.
 * @returns an array of leaf node Ids.
 */
function getLeaves(hierarchy: TBrainRegionHierarchyAtomReturnType, id: string): string[] {
  if (!hierarchy || !hierarchy.leaves || !(hierarchy.leaves instanceof Map)) {
    log('warn', `Hierarchy or leaves map is invalid for ID: ${id}`);
    return [];
  }
  return (hierarchy.leaves.get(id) || []).map((leaf) => leaf.id);
}

/**
 * recursively builds tree nodes for mTypes and eTypes.
 *
 * @param data - the current data object (mType or eType).
 * @param type - the type of the current node ('mType' or 'eType').
 * @param id - the id for the current node. for eTypes.
 * @param parentId - the id of the parent node (mType id for eTypes, null for mTypes initially).
 * @param parentBrainRegionId - the id of the leaf brain region this node is being processed under.
 * @param cellCompositionRoot - the root of the cell composition data.
 * @param leafVolumeMap - a map of leaf brain region Ids to their volumes.
 * @param eTypeId - the original id of an eType.
 * @returns an object containing the created mType/eType node (if any) and all its children etype nodes if the node is an mtype.
 */
function buildTreeNode(
  data: CellCompositionBrainRegion | CellCompositionMType | CellCompositionBrainRegionEType,
  type: 'MType' | 'EType',
  id: string,
  parentId: string | null, // for eType: mTypeId. for mType: null
  parentBrainRegionId: string, // the leaf brain region id this mType/eType instance belong to
  cellCompositionRoot: ICellCompositionRoot,
  leafVolumeMap: Map<string, number>,
  originalETypeId?: string
): { node: RawTreeNode | null; mTypeChildrenAsEType: RawTreeNode[] } {
  let cellCounts: { neuron: number; glia: number };
  let relatedNodes: string[] = [];
  // track which leaf brain regions contain each mType/eType
  // when the same mType or eType appears across multiple leaf regions,
  // these Ids are merged during node aggregation
  const leaves: string[] = [parentBrainRegionId];
  let label: string;

  if (type === 'MType') {
    const mt = data as CellCompositionMType;
    label = mt.label;

    const eTypeResults = Object.entries(mt.hasPart).map(([originalEtypeId, etData]) => {
      // create a composite id for the eType node to ensure uniqueness in the tree
      // when the same eType (by originalEtId) is a child of different mTypes,
      // or to correctly instance it under this specific mType.
      const compositeEtId = `${id}__${originalEtypeId}`; // mTypeId__eTypeId

      return buildTreeNode(
        etData,
        'EType',
        compositeEtId, // use composite id for the eType node
        id, // parent of this eType node is the current mType node (using its id)
        parentBrainRegionId,
        cellCompositionRoot,
        leafVolumeMap,
        originalEtypeId // pass eType id
      );
    });

    const eTypeNodes = eTypeResults
      .map((res) => res.node)
      .filter((node): node is RawTreeNode => node !== null);

    // `allDescendants` for an mType includes its direct eType children
    // and any descendants they might have (though eTypes are typically leaves in this hierarchy).
    const eTypesOfMType = eTypeResults.flatMap((res) =>
      res.node ? [res.node, ...res.mTypeChildrenAsEType] : res.mTypeChildrenAsEType
    );

    // `relatedNodes` for an mType are the ids of its direct eType children.
    relatedNodes = eTypeNodes.map((etNode) => etNode.id);

    const totalNeuron = eTypeNodes.reduce((sum, etNode) => sum + etNode.cellCounts.neuron, 0);
    const totalGlia = eTypeNodes.reduce((sum, etNode) => sum + etNode.cellCounts.glia, 0);
    cellCounts = { neuron: totalNeuron, glia: totalGlia };

    // volume for an mType (or eType) is based on the volume of the parent leaf brain region
    const volume = leafVolumeMap.get(parentBrainRegionId) || 0;
    const composition = {
      neuron: {
        density: volume > 0 ? cellCounts.neuron / volume : 0,
        count: cellCounts.neuron * NEURON_DENSITY_SCALE,
      },
      glia: {
        density: volume > 0 ? cellCounts.glia / volume : 0,
        count: cellCounts.glia,
      },
    };

    return {
      node: {
        id, // mType's id
        about: 'MType',
        cellCounts,
        compositeId: id, // mType's id
        label,
        parentId: null, // mTypes are initially treated as roots of their eType children;
        leaves,
        relatedNodes, // Ids of child eTypes
        composition,
      },
      mTypeChildrenAsEType: eTypesOfMType,
    };
  }
  if (type === 'EType') {
    const et = data as CellCompositionBrainRegionEType;
    label = et.label;

    const volume = leafVolumeMap.get(parentBrainRegionId) || 0;
    const neuronDensity = et.composition?.neuron.density ?? 0;
    const gliaDensity = et.composition?.glia?.density ?? 0;

    cellCounts = {
      neuron: neuronDensity * volume,
      glia: gliaDensity * volume,
    };

    const composition = {
      neuron: {
        density: neuronDensity,
        count: cellCounts.neuron * NEURON_DENSITY_SCALE,
      },
      glia: {
        density: gliaDensity,
        count: cellCounts.glia,
      },
    };

    return {
      node: {
        id: originalETypeId || id, // store original eType id
        about: 'EType',
        cellCounts,
        compositeId: id, // composite id: mTypeID__eTypeId
        label,
        parentId, // mtypeId
        leaves,
        relatedNodes: [], // eTypes typically have no related nodes
        composition,
      },
      mTypeChildrenAsEType: [], // eTypes are leaves
    };
  }
  // should not be reached if type is 'mType' or 'eType'
  return { node: null, mTypeChildrenAsEType: [] };
}

/**
 * builds the data structure for a given brain region, including its mTypes and eTypes.
 *
 * @param brainRegionId - the id of the root brain region to process.
 * @param cellCompositionRoot - The root object containing cell composition data.
 * @param atlasRegions - an array of all brain atlas regions, used for volume information.
 * @param hierarchy - brain region hierarchy information.
 * @returns an object containing nodes, tree structure, links, total volume, and total composition.
 */
function resolveBrainRegionCellCompositionFn({
  brainRegionId,
  cellCompositionRoot,
  atlasRegions,
  hierarchy,
}: {
  brainRegionId: string;
  cellCompositionRoot: ICellCompositionRoot;
  atlasRegions: IBrainAtlasRegion[];
  hierarchy: TBrainRegionHierarchyAtomReturnType;
}): {
  nodes: RawTreeNode[];
  links: { source: string; target: string }[];
  totalVolume: number;
  totalComposition: NeuronComposition;
} {
  const leavesIds = getLeaves(hierarchy, brainRegionId);
  const initialReturn = {
    nodes: [],
    links: [],
    totalVolume: 0,
    totalComposition: {
      neuron: { density: 0, count: 0 },
      glia: { density: 0, count: 0 },
    },
  };

  if (!leavesIds.length) {
    log('warn', `No leaves found for brain region ID: ${brainRegionId}`);
    return initialReturn;
  }

  const leafVolumeMap = new Map(atlasRegions.map((r) => [r.brain_region_id, r.volume || 0]));

  // precompute sum of eType densities for each leaf region.
  // this is used later for calculating the total neuron/glia counts for the entire brainRegionId.
  const leafDensitySumsMap = new Map<string, { neuron: number; glia: number }>();
  for (const leafId of leavesIds) {
    const brainRegionCompData = cellCompositionRoot.hasPart[leafId];
    if (!brainRegionCompData) {
      leafDensitySumsMap.set(leafId, { neuron: 0, glia: 0 });
      continue;
    }
    let sumLeafNeuronDensity = 0;
    let sumLeafGliaDensity = 0;

    for (const mt of Object.values(brainRegionCompData.hasPart)) {
      for (const et of Object.values(mt.hasPart)) {
        sumLeafNeuronDensity += et.composition?.neuron.density ?? 0;
        sumLeafGliaDensity += et.composition?.glia?.density ?? 0;
      }
    }
    leafDensitySumsMap.set(leafId, { neuron: sumLeafNeuronDensity, glia: sumLeafGliaDensity });
  }

  const nodeMap = new Map<string, RawTreeNode>();

  leavesIds.forEach((leafId) => {
    const brainRegionCompData = cellCompositionRoot.hasPart[leafId];
    if (!brainRegionCompData) return;

    Object.entries(brainRegionCompData.hasPart).forEach(([mTypeId, mTypeData]) => {
      // the entrypoint call to build the mType node.
      // it will recursively call for its eTypes.
      const { node: mTypeNode, mTypeChildrenAsEType: eTypeNodesUnderMType } = buildTreeNode(
        mTypeData,
        'MType',
        mTypeId,
        null, // mTypes are top-level in this local build relative to the leaf
        leafId, // the brain region leaf for this mType
        cellCompositionRoot,
        leafVolumeMap
      );

      const nodesToProcess = [];
      if (mTypeNode) {
        nodesToProcess.push(mTypeNode);
      }
      nodesToProcess.push(...eTypeNodesUnderMType);

      // aggregate nodes (mTypes and their eTypes) into nodeMap
      nodesToProcess.forEach((currentNode) => {
        const existingNode = nodeMap.get(currentNode.compositeId);
        if (existingNode) {
          // node already exists (e.g., same mType from another leaf, or same mTypeId__eTypeId from another leaf path)
          existingNode.leaves = [...new Set([...existingNode.leaves, ...currentNode.leaves])];
          // merge related nodes (relevant for mTypes linking to eTypes)
          existingNode.relatedNodes = [
            ...new Set([...existingNode.relatedNodes, ...currentNode.relatedNodes]),
          ];

          existingNode.cellCounts.neuron += currentNode.cellCounts.neuron;
          existingNode.cellCounts.glia += currentNode.cellCounts.glia;

          // recalculate composition based on aggregated counts and total volume of associated leaves
          const totalVolumeForNode = existingNode.leaves.reduce(
            (sum, lId) => sum + (leafVolumeMap.get(lId) || 0),
            0
          );

          existingNode.composition.neuron = {
            density:
              totalVolumeForNode > 0 ? existingNode.cellCounts.neuron / totalVolumeForNode : 0,
            count: existingNode.cellCounts.neuron * NEURON_DENSITY_SCALE,
          };
          existingNode.composition.glia = {
            density: totalVolumeForNode > 0 ? existingNode.cellCounts.glia / totalVolumeForNode : 0,
            count: existingNode.cellCounts.glia,
          };
        } else {
          // new node, add to map
          // ensure composition is calculated if it's the first time seeing this node
          const initialVolumeForNode = currentNode.leaves.reduce(
            (sum, lId) => sum + (leafVolumeMap.get(lId) || 0),
            0
          );
          // if currentNode.composition was based on a single leaf, and it's correct, this might be redundant.
          // however, if it's the first time and it's an aggregation of one, this ensures consistency.
          if (currentNode.about === 'MType' || currentNode.about === 'EType') {
            currentNode.composition.neuron = {
              density: resolveNeuronDensity(initialVolumeForNode, currentNode),
              count: currentNode.cellCounts.neuron * NEURON_DENSITY_SCALE,
            };
            currentNode.composition.glia = {
              density: resolveGliaDensity(initialVolumeForNode, currentNode),
              count: currentNode.cellCounts.glia,
            };
          }
          nodeMap.set(currentNode.compositeId, { ...currentNode });
        }
      });
    });
  });

  const nodes = Array.from(nodeMap.values());

  // calculate total neuron and glia counts for the entire brainRegionId
  let totalNeuronCount = 0;
  let totalGliaCount = 0;
  for (const leafId of leavesIds) {
    const leafVolume = leafVolumeMap.get(leafId) || 0;
    // the brainRegionCompData contains mTypes, and each mType contains eTypes with their densities
    const brainRegionCompData = cellCompositionRoot.hasPart[leafId];
    if (brainRegionCompData) {
      for (const mType of Object.values(brainRegionCompData.hasPart)) {
        for (const eType of Object.values(mType.hasPart)) {
          totalNeuronCount += (eType.composition?.neuron.density ?? 0) * leafVolume;
          totalGliaCount += (eType.composition?.glia?.density ?? 0) * leafVolume;
        }
      }
    }
  }

  const links: { source: string; target: string }[] = [];
  for (const node of nodes) {
    if (node.about === 'MType') {
      // only mTypes have relatedNodes (eTypes)
      for (const childId of node.relatedNodes) {
        // childId is a composite eType id
        if (nodeMap.has(childId)) {
          // ensure the target eType node exists
          const eTypeNode = nodeMap.get(childId);
          // Use the original eType id as the target instead of composite id
          links.push({ source: node.id, target: eTypeNode?.id || childId });
        }
      }
    }
  }

  const totalVolume = leavesIds.reduce((sum, leafId) => sum + (leafVolumeMap.get(leafId) || 0), 0);

  const totalComposition: NeuronComposition = {
    neuron: {
      density: totalVolume > 0 ? totalNeuronCount / totalVolume : 0,
      count: totalNeuronCount * NEURON_DENSITY_SCALE,
    },
    glia: {
      density: totalVolume > 0 ? totalGliaCount / totalVolume : 0,
      count: totalGliaCount,
    },
  };

  return { nodes, links, totalVolume, totalComposition };
}

export const resolveBrainRegionCellComposition = memoize(
  resolveBrainRegionCellCompositionFn,
  ({ brainRegionId }) => brainRegionId
);

function resolveNeuronDensity(initialVolumeForNode: number, currentNode: RawTreeNode) {
  if (initialVolumeForNode > 0) return currentNode.cellCounts.neuron / initialVolumeForNode;
  return currentNode.about === 'EType'
    ? ((currentNode as RawTreeNode).composition?.neuron.density ?? 0)
    : 0;
}

function resolveGliaDensity(initialVolumeForNode: number, currentNode: RawTreeNode) {
  if (initialVolumeForNode > 0) return currentNode.cellCounts.glia / initialVolumeForNode;
  return currentNode.about === 'EType'
    ? ((currentNode as RawTreeNode).composition?.glia.density ?? 0)
    : 0;
}
