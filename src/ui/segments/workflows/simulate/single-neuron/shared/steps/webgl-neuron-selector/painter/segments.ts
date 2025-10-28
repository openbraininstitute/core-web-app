import { ArrayNumber2, TgdPainterSegmentsData } from '@tolokoban/tgd';

import { Structure, StructureItemType } from './structure';

export function makeSegments(structure: Structure) {
  const segments = new TgdPainterSegmentsData();
  structure.forEach((item) => {
    const uv: ArrayNumber2 = [
      (item.type + 0.5) / (StructureItemType.Unknown + 1),
      (item.index + 1.5) / (structure.length + 2),
    ];
    segments.add([...item.start, item.radius], [...item.end, item.radius], uv, uv);
  });
  return segments;
}
