import { Morphology, NeuronSectionInfo } from '@/services/bluenaas-single-cell/types';

export interface TreeItem {
  section: NeuronSectionInfo;
  children: TreeItem[];
}

export function createTreeStructure(morphology: Morphology): TreeItem[] {
  const tree: TreeItem[] = [];
  const items = new Map<string, TreeItem[]>();
  for (const sectionName of Object.keys(morphology)) {
    const section = morphology[sectionName];
    const i = section.nseg - 1;
    const keyItem = `${section.xend[i]}/${section.yend[i]}/${section.zend[i]}`;
    const keyParent = `${section.xstart[0]}/${section.ystart[0]}/${section.zstart[0]}`;
    const item: TreeItem = {
      section,
      children: [],
    };
    items.set(keyItem, item.children);
    const parent = items.get(keyParent) ?? tree;
    parent.push(item);
  }
  return tree;
}
