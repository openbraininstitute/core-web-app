/* eslint-disable no-param-reassign */
import { TreeNode } from './types';

import { Dendrogram } from '@/services/dendrogram';

export function computeSegmentsPositions(dendrogram: Dendrogram) {
  const tree: TreeNode = convertIntoTree(dendrogram);
  const layers = extractLayers(tree);
  layers.forEach((nodes) => applySizes(nodes));
  return tree;
}

function applySizes(nodes: TreeNode[], rangeMin = -1, rangeMax = +1) {
  const sizes = computeRespectiveSizes(nodes, rangeMin, rangeMax);
  nodes.forEach((node, index) => {
    const xMin = sizes[index];
    const xMax = sizes[index + 1];
    node.value.xMin = xMin;
    node.value.xMax = xMax;
    applySizes(node.children, xMin, xMax);
  });
}

/**
 * @returns An array of numbers that divide the range [`min`, `max`]
 * according to the number of leaves of each element of `nodes`.
 */
function computeRespectiveSizes(nodes: TreeNode[], rangeMin = -1, rangeMax = +1): number[] {
  const totalCount = sum(nodes, computeSpread);
  let x = 0;
  const steps = [x];
  for (const node of nodes) {
    const size = computeSpread(node) / totalCount;
    x += size;
    steps.push(x);
  }
  return steps.map((v) => rangeMin + (rangeMax - rangeMin) * v);
}

/**
 * Warning! At this stage, the `spread` is not computed.
 * Use `computeSpread()` to compute it.
 */
function convertIntoTree(dendrogram: Dendrogram, y = 0): TreeNode {
  const length = sum(dendrogram.segments, (s) => s.length);
  const children = dendrogram.sections.map((child) => convertIntoTree(child, y + length));
  const node: TreeNode = {
    value: {
      name: dendrogram.name,
      xMin: -1,
      xMax: +1,
      yMin: y,
      yMax: y + length,
      maxLength: length + max(children, (n) => n.value.maxLength),
      segments: structuredClone(dendrogram.segments),
    },
    dendrogram,
    spread: 0,
    children,
  };
  return node;
}

function extractLayers(root: TreeNode): TreeNode[][] {
  const layers: TreeNode[][] = [];
  const fringe: TreeNode[][] = [root.children];
  while (fringe.length > 0) {
    const branches = fringe.shift();
    if (!branches) break;

    const maxLength = findSmallestLength(branches);
    const layer: TreeNode[] = [];
    const remainingBranches: TreeNode[] = [];
    for (const branch of branches) {
      const pruning = prune(branch, maxLength);
      computeSpread(pruning.trunk);
      layer.push(pruning.trunk);
      pruning.branches.forEach((item) => remainingBranches.push(item));
    }
    layers.push(layer);
    if (remainingBranches.length > 0) fringe.push(remainingBranches);
  }
  return layers;
}

function findSmallestLength(branches: TreeNode[]) {
  const [first, ...rest] = branches;
  let minY = first.value.maxLength + first.value.yMin;
  for (const item of rest) {
    const length = item.value.maxLength + item.value.yMin;
    if (length < minY) {
      minY = length;
    }
  }
  return minY;
}

/**
 * Cut all the branches over the given `maxLength` length.
 *
 * The function returns the resulting `trunk` and all the cut `branches`.
 * The structure is cloned, but the TreeValue is shared.
 */
function prune(source: TreeNode, maxLength: number): { trunk: TreeNode; branches: TreeNode[] } {
  const trunk: TreeNode = {
    ...source,
    children: [],
  };
  const branches: TreeNode[] = [];
  pruneRecursively(source, trunk, branches, maxLength);
  return { trunk, branches };
}

function pruneRecursively(source: TreeNode, trunk: TreeNode, branches: TreeNode[], yMax: number) {
  for (const child of source.children) {
    if (child.value.yMin > yMax) {
      branches.push(child);
    } else {
      const nextTrunk: TreeNode = {
        ...child,
        children: [],
      };
      trunk.children.push(nextTrunk);
      pruneRecursively(child, nextTrunk, branches, yMax);
    }
  }
}

function computeSpread(branch: TreeNode) {
  const { children } = branch;
  const spread = children.length === 0 ? 1 : sum(children, computeSpread);
  branch.spread = spread;
  return spread;
}

function sum<T>(arr: T[], get: (item: T) => number): number {
  return arr.reduce((accumulator, item) => accumulator + get(item), 0);
}

function max<T>(arr: T[], get: (item: T) => number): number {
  const first = arr[0];
  if (!first) return 0;

  return arr.reduce((accumulator, item) => Math.max(accumulator, get(item)), get(first));
}
