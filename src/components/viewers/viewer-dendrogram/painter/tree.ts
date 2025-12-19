/* eslint-disable no-param-reassign */
import type { Morphology, NeuronSectionInfo } from '@/services/bluenaas-single-cell/types';

export interface Tree {
  children: TreeItem[];
  levelsCount: number;
  // Store items by level, then rank.
  // This is usefull for fast item finding
  // when hovering.
  grid: TreeItem[][];
}

export interface TreeItem {
  section: NeuronSectionInfo;
  x: number;
  y: number;
  weight: number;
  children: TreeItem[];
}

export function createTreeStructure(morphology: Morphology): Tree {
  const children: TreeItem[] = [];
  const items = new Map<string, TreeItem[]>();
  for (const sectionName of Object.keys(morphology)) {
    const section = morphology[sectionName];
    const i = section.nseg - 1;
    const keyItem = `${section.xend[i]}/${section.yend[i]}/${section.zend[i]}`;
    const keyParent = `${section.xstart[0]}/${section.ystart[0]}/${section.zstart[0]}`;
    const item: TreeItem = {
      section,
      weight: 0,
      x: 0,
      y: 0,
      children: [],
    };
    items.set(keyItem, item.children);
    const parent = items.get(keyParent) ?? children;
    parent.push(item);
  }
  if (children.length === 0) return { children, levelsCount: 0, grid: [] };

  computeWeights(children);
  const levelsCount = countLevels(children);
  const levelHeight = 1 / levelsCount;
  computeCoords(children, levelHeight);
  return { children, levelsCount, grid: createGrid(children) };
}

function computeWeights(children: TreeItem[]): number {
  let totalWeight = 1;
  for (const child of children) {
    const weight = computeWeights(child.children);
    child.weight = weight;
    totalWeight += weight;
  }
  return totalWeight;
}

function countLevels(children: TreeItem[], level = 0): number {
  let maxLevel = level;
  for (const item of children) {
    maxLevel = Math.max(maxLevel, countLevels(item.children, level + 1));
  }
  return maxLevel;
}

function computeCoords(children: TreeItem[], levelHeight: number, level = 0, xMin = 0, xMax = 1) {
  const fx = (x: number) => xMin + (xMax - xMin) * x;
  const totalWeight = children.reduce((weight, item) => weight + item.weight, 0);
  let x = 0;
  for (const item of children) {
    const w = item.weight / totalWeight;
    item.x = fx(x + w / 2);
    item.y = levelHeight * level;
    computeCoords(item.children, levelHeight, level + 1, fx(x), fx(x + w));
    x += w;
  }
}

function createGrid(children: TreeItem[]): TreeItem[][] {
  const grid: TreeItem[][] = [];
  recursivelyCreateGrid(grid, children, 0);
  while (grid[grid.length - 1]?.length === 0) grid.pop();
  return grid;
}

function recursivelyCreateGrid(grid: TreeItem[][], children: TreeItem[], level: number) {
  while (grid.length <= level) grid.push([]);
  for (const item of children) {
    grid[level].push(item);
    recursivelyCreateGrid(grid, item.children, level + 1);
  }
}
