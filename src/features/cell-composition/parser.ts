import uniq from 'lodash/uniq';

import type { Prettify } from '@/utils/type';

export const calculateNewExtendedNodeId = (
  extendedNodeId: string,
  childNodeId: string,
  childAbout: string
): string => {
  if (childAbout === 'BrainRegion') {
    return '';
  }
  if (extendedNodeId) {
    return `${extendedNodeId}__${childNodeId}`;
  }
  return childNodeId;
};

export type ICellCompositionRoot = {
  hasPart: { [key: string]: CellCompositionBrainRegion };
};

export type ConstructedCellComposition = {
  nodes: CalculatedCompositionNode[];
  links: CompositionLink[];
  totalComposition: CalculatedCompositionNeuronGlia;
  composition: ICellCompositionRoot;
};

export interface ConstructedFullCellComposition extends ConstructedCellComposition {
  neurons: Array<CompositionFormatted>;
}

export type DensityCompositionUnit = {
  density: number;
};
export type CountCompositionUnit = {
  count: number;
};

export interface CompositionUnit extends DensityCompositionUnit, CountCompositionUnit {}

export type CalculatedCompositionNeuronGlia = {
  neuron: CompositionUnit;
  glia: CompositionUnit;
};

export type OriginalCompositionUnit = {
  neuron: DensityCompositionUnit;
  glia: DensityCompositionUnit;
};

export type CellCompositionBrainRegion = {
  label: string;
  about: string;
  hasPart: { [key: string]: CellCompositionBrainRegion };
  composition: OriginalCompositionUnit;
  extendedNodeId: string;
};

export type CompositionCount = {
  neuron: number;
  glia: number;
};

type CompositionNodeBase = {
  about: string;
  id: string;
  extendedNodeId: string;
  label: string;
  parentId: string | null;
  leaves: string[];
  relatedNodes: string[];
};

export type CompositionFormatted = {
  about: string;
  id: string;
  extendedNodeId: string;
  label: string;
  parentId: string | null;
  leaves: string[];
  relatedNodes: string[];
  density: number;
  count: number;
  name: string;
  children: Array<CompositionFormatted>;
};

export type CalculatedCompositionNode = CompositionNodeBase & {
  neuronComposition: CompositionUnit;
  composition?: number;
  items?: CalculatedCompositionNode[];
};
// Link type when calculating the compositions
export type CalculationLink = {
  source: string;
  target: string;
};

export type CompositionLink = CalculationLink & { value?: number };
export type CalculationNode = Prettify<
  CompositionNodeBase & {
    countPair: CompositionCount;
  }
>;
/* eslint-disable no-param-reassign */

/**
 * Converts a composition object to a pair of counts
 * @param composition the original composition
 * @param regionVolume the volume of the region
 */
export function convertCompositionToCountPair(
  composition: OriginalCompositionUnit,
  regionVolume: number
): CompositionCount {
  const countPair = { neuron: 0, glia: 0 };
  if (composition.neuron) {
    countPair.neuron = composition.neuron.density * regionVolume;
  }
  if (composition.glia) {
    countPair.glia = composition.glia.density * regionVolume;
  }
  return countPair;
}

/**
 * Converts a count pair to a composition object
 * @param countPair the pair of counts
 * @param regionVolume the volume of the region
 */
export function convertCountPairToComposition(
  countPair: CompositionCount,
  regionVolume: number
): OriginalCompositionUnit {
  return {
    neuron: { density: countPair.neuron / regionVolume },
    glia: { density: countPair.glia / regionVolume },
  };
}

export function addCountPairs(nodeCountPair: CompositionCount, toAddCountPair: CompositionCount) {
  return {
    neuron: nodeCountPair.neuron + toAddCountPair.neuron,
    glia: nodeCountPair.glia + toAddCountPair.glia,
  };
}

function initializeCountPair() {
  return { neuron: 0, glia: 0 };
}

/**
 * Add the node to the map of nodes, if it does not already exist. If it exists,
 * update the leaves and re-calculate the composition
 * @param node
 * @param nodes
 */
export function addNode(node: CalculationNode, nodes: { [key: string]: CalculationNode }) {
  const id = node.parentId ? `${node.parentId}__${node.id}` : node.id;
  if (id in nodes) {
    nodes[id].leaves = [...nodes[id].leaves, ...node.leaves];
    nodes[id].relatedNodes = [...nodes[id].relatedNodes, ...node.relatedNodes];
    nodes[id].countPair = addCountPairs(nodes[id].countPair, node.countPair);
  } else {
    nodes[id] = node;
  }
}

/**
 * Receives a node of the tree and returns back the composition of itself by
 * recursively iterating over itself until it reaches the bottom of the tree
 *
 * @param subTree the node
 * @param subTreeId the id of the node
 * @param nodes the map of total nodes
 * @param links the map of total links
 * @param leafId the leaf id we currently iterate into
 * @param extendedNodeId the extended node of the node it currently visits
 * @param regionVolume
 */
export function iterateNode(
  subTree: CellCompositionBrainRegion,
  subTreeId: string,
  nodes: { [key: string]: CalculationNode },
  links: { [key: string]: CalculationLink },
  leafId: string,
  extendedNodeId: string,
  regionVolume: number
): CompositionCount {
  if ('hasPart' in subTree) {
    let totalCountPair = initializeCountPair();

    // for each child of the node
    Object.entries(subTree.hasPart).forEach(([childId, childSubtree]) => {
      const childExtendedNodeId = calculateNewExtendedNodeId(
        extendedNodeId,
        childId,
        childSubtree.about
      );
      childSubtree.extendedNodeId = childExtendedNodeId;
      // calculate its composition and add it in the total
      const childCountPair = iterateNode(
        childSubtree,
        childId,
        nodes,
        links,
        leafId,
        childExtendedNodeId,
        regionVolume
      );
      totalCountPair = addCountPairs(totalCountPair, childCountPair);
      const parentId = subTree.about !== 'BrainRegion' ? subTreeId : null;
      const node: CalculationNode = {
        about: childSubtree.about,
        countPair: childCountPair,
        id: childId,
        label: childSubtree.label,
        parentId,
        leaves: [leafId],
        relatedNodes: Object.keys(subTree.hasPart),
        extendedNodeId: calculateNewExtendedNodeId(extendedNodeId, childId, childSubtree.about),
      };
      // add the node in the set of nodes
      addNode(node, nodes);
      if (subTree.about !== 'BrainRegion') {
        links[`${subTreeId}__${childId}`] = {
          source: subTreeId,
          target: childId,
        };
      }
    });
    subTree.composition = convertCountPairToComposition(totalCountPair, regionVolume);
    return totalCountPair;
  }
  // @ts-ignore
  return convertCompositionToCountPair(subTree.composition, regionVolume);
}

/**
 * Given the composition file and the leaf IDs, calculates the nodes/links arrays
 * used in order to build the MType/EType tree and the sankey diagram
 *
 * @param cellComposition the composition file in its original format
 * @param brainRegionId
 * @param leaves the IDs of the leaves
 * @param volumes
 */
export default async function resolveCellCompositions({
  cellComposition,
  brainRegionId,
  leaves,
  volumes,
}: {
  cellComposition: ICellCompositionRoot;
  brainRegionId: string;
  leaves: string[] | undefined;
  volumes: { [key: string]: number };
}): Promise<ConstructedCellComposition> {
  const nodes: { [key: string]: CalculationNode } = {};
  const links: { [key: string]: CalculationLink } = {};
  let totalCountPair = initializeCountPair();

  leaves?.forEach((leafId) => {
    if (leafId in cellComposition.hasPart && leafId in volumes) {
      const leaf = cellComposition.hasPart[leafId];
      const regionVolume = volumes[leafId];
      const rootCountPair = iterateNode(leaf, leafId, nodes, links, leafId, '', regionVolume);
      totalCountPair = addCountPairs(totalCountPair, rootCountPair);
    }
  });

  const nodesArray: CalculatedCompositionNode[] = [];
  Object.entries(nodes).forEach(([nodeId, node]) => {
    nodesArray.push({
      about: node.about,
      id: nodeId.split('__').reverse()[0],
      label: node.label,
      parentId: node.parentId,
      neuronComposition: {
        density: node.countPair.neuron / volumes[brainRegionId],
        count: Math.round(node.countPair.neuron),
      },
      leaves: uniq(node.leaves),
      relatedNodes: uniq(node.relatedNodes),
      extendedNodeId: node.extendedNodeId,
    });
  });

  const linksArray: CompositionLink[] = [];
  Object.values(links).forEach((link) => {
    linksArray.push({
      source: link.source,
      target: link.target,
    });
  });
  return {
    nodes: nodesArray,
    links: linksArray,
    totalComposition: {
      neuron: {
        density: totalCountPair.neuron / volumes[brainRegionId],
        count: totalCountPair.neuron,
      },
      glia: { density: 0, count: 0 },
    },
    composition: cellComposition,
  };
}
/* eslint-enable no-param-reassign */
