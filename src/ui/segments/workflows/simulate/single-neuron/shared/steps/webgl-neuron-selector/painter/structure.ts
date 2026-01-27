import { type ArrayNumber3, TgdVec3 } from '@tolokoban/tgd';

import type { Morphology } from '@/services/bluenaas-single-cell/types';
import { logWarn } from '@/utils/logger';

export enum StructureItemType {
  Soma = 0,
  /**
   * We make a difference between Dendrite and BasalDendrite.
   * If the morphology has no ApicalDendrite, then the basal dendrites
   * are called simply Dendrite.
   */
  Dendrite,
  BasalDendrite,
  ApicalDendrite,
  Myelin,
  Axon,
  Selected,
  Unknown,
}
export interface StructureItem {
  index: number;
  name: string;
  sectionName: string;
  sectionIndex: number;
  segmentIndex: number;
  segmentsCount: number;
  start: ArrayNumber3;
  end: ArrayNumber3;
  radius: number;
  type: StructureItemType;
  length: number;
  distanceFromSoma: number;
}

export interface StructureBoundingBox {
  min: ArrayNumber3;
  max: ArrayNumber3;
  center: ArrayNumber3;
}

export class Structure {
  public readonly bbox: StructureBoundingBox;

  /**
   * Bounding box of the axon
   */
  public readonly bboxSoma: StructureBoundingBox;

  /**
   * Bounding box of the dendrites only (no axon nor myelin)
   */
  public readonly bboxDendrites: StructureBoundingBox;

  public readonly hasApicalDendrites: boolean;

  private readonly items: StructureItem[] = [];

  private readonly segments = new Map<string, StructureItem>();

  private readonly segmentsPerSection = new Map<string, StructureItem[]>();

  constructor(morphology: Morphology) {
    const bbox: StructureBoundingBox = {
      min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
      max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
      center: [0, 0, 0],
    };
    const bboxSoma: StructureBoundingBox = {
      min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
      max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
      center: [0, 0, 0],
    };
    const bboxDendrites: StructureBoundingBox = {
      min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
      max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
      center: [0, 0, 0],
    };
    this.bbox = bbox;
    this.bboxSoma = bboxSoma;
    this.bboxDendrites = bboxDendrites;
    let somaCounts = 0;
    const somaCenter = new TgdVec3();
    const sectionNames = Object.keys(morphology);
    let hasApicalDendrites = false;
    for (const sectionName of sectionNames) {
      const isSoma = sectionName.toLowerCase().startsWith('soma');
      const section = morphology[sectionName];
      let distanceFromSoma = section.distance_from_soma;
      for (let segmentIndex = 0; segmentIndex < section.nseg; segmentIndex++) {
        const start: ArrayNumber3 = [
          section.xstart[segmentIndex],
          section.ystart[segmentIndex],
          section.zstart[segmentIndex],
        ];
        const end: ArrayNumber3 = [
          section.xend[segmentIndex],
          section.yend[segmentIndex],
          section.zend[segmentIndex],
        ];
        const type = resolveType(sectionName);
        if (type === StructureItemType.ApicalDendrite) hasApicalDendrites = true;
        const item: StructureItem = {
          start,
          end,
          radius: section.diam[segmentIndex] / 2,
          index: this.items.length,
          name: `${sectionName}[${segmentIndex}]`,
          sectionName,
          sectionIndex: resolveSectionIndex(sectionName),
          segmentIndex,
          segmentsCount: section.nseg,
          length: section.length[segmentIndex],
          type,
          distanceFromSoma: isSoma ? 0 : distanceFromSoma,
        };
        this.segments.set(item.name, item);
        this.addToSection(item);
        this.items.push(item);
        if (isSoma) {
          somaCounts++;
          somaCenter.add(start);
          somaCounts++;
          somaCenter.add(end);
          bboxSoma.min = computeMin(bboxSoma.min, start, item.radius);
          bboxSoma.max = computeMax(bboxSoma.max, start, item.radius);
          bboxSoma.min = computeMin(bboxSoma.min, end, item.radius);
          bboxSoma.max = computeMax(bboxSoma.max, end, item.radius);
        } else {
          distanceFromSoma += section.length[segmentIndex];
          bbox.min = computeMin(bbox.min, start);
          bbox.max = computeMax(bbox.max, start);
          bbox.min = computeMin(bbox.min, end);
          bbox.max = computeMax(bbox.max, end);
          if (
            [
              StructureItemType.Dendrite,
              StructureItemType.BasalDendrite,
              StructureItemType.ApicalDendrite,
              StructureItemType.Soma,
            ].includes(type)
          ) {
            bboxDendrites.min = computeMin(bboxDendrites.min, start);
            bboxDendrites.max = computeMax(bboxDendrites.max, start);
            bboxDendrites.min = computeMin(bboxDendrites.min, end);
            bboxDendrites.max = computeMax(bboxDendrites.max, end);
          }
        }
      }
    }
    if (!hasApicalDendrites) {
      // If no apical dendrite, then we need to display Dendrite instead of BasalDendrite.
      for (const item of this.items) {
        if (item.type === StructureItemType.BasalDendrite) {
          item.type = StructureItemType.Dendrite;
        }
      }
    }
    if (somaCounts > 0) somaCenter.scale(1 / somaCounts);
    bbox.center = [...somaCenter] as ArrayNumber3;
    this.hasApicalDendrites = hasApicalDendrites;
  }

  getSegmentsOfSection(sectionName: string): StructureItem[] {
    return this.segmentsPerSection.get(sectionName) ?? [];
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

  private addToSection(item: StructureItem) {
    const sectionFromMap = this.segmentsPerSection.get(item.sectionName);
    if (sectionFromMap) {
      sectionFromMap.push(item);
      sectionFromMap.sort(({ segmentIndex: a }, { segmentIndex: b }) => a - b);
    } else {
      this.segmentsPerSection.set(item.sectionName, [item]);
    }
  }
}

function computeMin(a: ArrayNumber3, b: ArrayNumber3, r = 0): ArrayNumber3 {
  return [Math.min(a[0], b[0] - r), Math.min(a[1], b[1] - r), Math.min(a[2], b[2] - r)];
}

function computeMax(a: ArrayNumber3, b: ArrayNumber3, r = 0): ArrayNumber3 {
  return [Math.max(a[0], b[0] + r), Math.max(a[1], b[1] + r), Math.max(a[2], b[2] + r)];
}

function resolveType(sectionName: string): StructureItemType {
  const prefix = sectionName.slice(0, 4).toLowerCase();
  switch (prefix) {
    case 'soma':
      return StructureItemType.Soma;
    case 'axon':
      return StructureItemType.Axon;
    case 'dend':
      return StructureItemType.BasalDendrite;
    case 'apic':
      return StructureItemType.ApicalDendrite;
    case 'myel':
      return StructureItemType.Myelin;
    default:
      // eslint-disable-next-line no-console
      logWarn('Unknown section type:', sectionName);
      return StructureItemType.Unknown;
  }
}

/**
 * The section index is at the end of the name, surrounded by square brackets.
 *
 * Example: `dend[32]`
 */
function resolveSectionIndex(sectionName: string): number {
  const i = sectionName.indexOf('[');
  const suffix = sectionName.slice(i + 1);
  return parseInt(suffix.slice(0, suffix.length - 1), 10);
}
