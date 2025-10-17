import { ArrayNumber3, TgdVec3 } from '@tolokoban/tgd';

import { Morphology } from '@/services/bluenaas-single-cell/types';

export enum StructureItemType {
  Soma = 0,
  Dendrite,
  Axon,
  Selected,
  Unknown,
}
export interface StructureItem {
  index: number;
  name: string;
  start: ArrayNumber3;
  end: ArrayNumber3;
  radius: number;
  type: StructureItemType;
}

export interface StructureBoundingBox {
  min: ArrayNumber3;
  max: ArrayNumber3;
  center: ArrayNumber3;
}

export class Structure {
  public readonly bbox: StructureBoundingBox;

  private readonly items: StructureItem[] = [];

  constructor(morphology: Morphology) {
    const bbox: StructureBoundingBox = {
      min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
      max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
      center: [0, 0, 0],
    };
    this.bbox = bbox;
    let somaCounts = 0;
    const somaCenter = new TgdVec3();
    const sectionNames = Object.keys(morphology);
    for (const sectionName of sectionNames) {
      const isSoma = sectionName.toLowerCase().startsWith('soma');
      const section = morphology[sectionName];
      for (let i = 0; i < section.nseg; i++) {
        const start: ArrayNumber3 = [section.xstart[i], section.ystart[i], section.zstart[i]];
        const end: ArrayNumber3 = [section.xend[i], section.yend[i], section.zend[i]];
        this.items.push({
          start,
          end,
          radius: section.diam[i] / 2,
          index: this.items.length,
          name: `${sectionName}[${i}]`,
          type: resolveType(sectionName),
        });
        if (isSoma) {
          somaCounts++;
          somaCenter.add(start);
          somaCounts++;
          somaCenter.add(end);
        } else {
          bbox.min = computeMin(bbox.min, start);
          bbox.max = computeMax(bbox.max, start);
          bbox.min = computeMin(bbox.min, end);
          bbox.max = computeMax(bbox.max, end);
        }
      }
    }
    if (somaCounts > 0) somaCenter.scale(1 / somaCounts);
    bbox.center = [...somaCenter] as ArrayNumber3;
  }

  get length() {
    return this.items.length;
  }

  get(index: number): StructureItem {
    const item = this.items[index];
    if (!item) throw Error(`Index (${index}) out of bounds! Items available: ${this.length}.`);

    return item;
  }

  forEach(callback: (item: StructureItem, index: number) => void) {
    this.items.forEach(callback);
  }
}

function computeMin(a: ArrayNumber3, b: ArrayNumber3): ArrayNumber3 {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])];
}

function computeMax(a: ArrayNumber3, b: ArrayNumber3): ArrayNumber3 {
  return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
}

function resolveType(sectionName: string): StructureItemType {
  const prefix = sectionName.slice(0, 4).toLowerCase();
  switch (prefix) {
    case 'soma':
      return StructureItemType.Soma;
    case 'axon':
      return StructureItemType.Axon;
    case 'dend':
      return StructureItemType.Dendrite;
    default:
      return StructureItemType.Unknown;
  }
}
