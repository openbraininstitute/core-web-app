import { ArrayNumber3, TgdPainterSegmentsData, TgdVec3 } from '@tolokoban/tgd';

import { Morphology } from '@/services/bluenaas-single-cell/types';

export function makeSegment(morphology: Morphology) {
  const bbox: { min: ArrayNumber3; max: ArrayNumber3; center: ArrayNumber3 } = {
    min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
    center: [0, 0, 0],
  };
  let somaCounts = 0;
  const somaCenter = new TgdVec3();
  const segments = new TgdPainterSegmentsData();
  let sectionIndex = 1;
  const sectionNames = Object.keys(morphology);
  for (const sectionName of sectionNames) {
    const isSoma = sectionName.toLowerCase().startsWith('soma');
    const section = morphology[sectionName];
    for (let i = 0; i < section.nseg; i++) {
      const uv: [number, number] = [sectionIndex++ / sectionNames.length, i / 256];
      const start: ArrayNumber3 = [section.xstart[i], section.ystart[i], section.zstart[i]];
      const end: ArrayNumber3 = [section.xend[i], section.yend[i], section.zend[i]];
      segments.add([...start, section.diam[i]], [...end, section.diam[i]], uv, uv);
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
  return { segments, bbox };
}

function computeMin(a: ArrayNumber3, b: ArrayNumber3): ArrayNumber3 {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])];
}

function computeMax(a: ArrayNumber3, b: ArrayNumber3): ArrayNumber3 {
  return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
}
