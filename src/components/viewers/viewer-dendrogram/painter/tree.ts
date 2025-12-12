/* eslint-disable no-param-reassign */
import { Morphology, NeuronSectionInfo } from '@/services/bluenaas-single-cell/types';

export interface Tree {
  children: TreeItem[];
  // Number of items per level.
  levels: number[];
}

export interface TreeItem {
  section: NeuronSectionInfo;
  // Depth level. Root is 0.
  level: number;
  // Index in the current level.
  rank: number;
  x: number;
  y: number;
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
      level: 0,
      rank: 0,
      x: 0,
      y: 0,
      children: [],
    };
    items.set(keyItem, item.children);
    const parent = items.get(keyParent) ?? children;
    parent.push(item);
  }
  const levels: number[] = [];
  computeRanksAndLevels(children, levels, 0);
  return { children, levels };
}

function computeRanksAndLevels(children: TreeItem[], levels: number[], level: number) {
  while (levels.length <= level) levels.push(0);
  const minRank = levels[level];
  for (let i = 0; i < children.length; i++) {
    const item = children[i];
    item.rank = minRank + i;
    item.level = level;
    computeRanksAndLevels(item.children, levels, level + 1);
  }
  levels[level] = minRank + children.length;
}
