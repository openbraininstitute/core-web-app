/**
 * A morphology location is a section and an offset, the share of the section's length from its start, as SONATA has
 * it and as morphoviewer measured it: along the section's own segments in order, the stem from the soma left out.
 */
import { SectionType } from '../section-type';

import type { TreeSection } from './load/tree';
import type { CircuitMorphologyData, Vec3 } from './types';

const lengthOf = (segments: Float32Array, s: number) =>
  Math.hypot(
    segments[8 * s + 4] - segments[8 * s],
    segments[8 * s + 5] - segments[8 * s + 1],
    segments[8 * s + 6] - segments[8 * s + 2]
  );

/**
 * The section of the data's segment `segment`, and the offset of the point `t` of the way along that segment; null
 * for a segment of no morphology read whole. A point of a stem is at the start of its section.
 */
export function sectionAtSegment(
  data: CircuitMorphologyData,
  segment: number,
  t: number
): { cell: number; section: TreeSection; offset: number } | null {
  const cell = data.segmentCells[segment];
  const tree = data.trees?.morphologies[cell];
  if (!data.trees || !tree) return null;
  const local = segment - data.trees.firstSegments[cell];
  const section = tree.sections[tree.segmentSections[local]];
  if (!section) return null;
  if (local < section.first || section.length <= 0) return { cell, section, offset: 0 };
  let along = t * lengthOf(tree.segments, local);
  for (let s = section.first; s < local; s++) along += lengthOf(tree.segments, s);
  return { cell, section, offset: Math.min(1, along / section.length) };
}

/** The cell's soma section; null where its morphology was not read whole or has no soma. */
export function somaSectionOf(data: CircuitMorphologyData, cell: number): TreeSection | null {
  const tree = data.trees?.morphologies[cell];
  return tree?.sections.find((section) => section.type === SectionType.Soma) ?? null;
}

/**
 * Where `section` of the cell is `offset` of the way along, in the data's frame: on the soma, its centre. Null where
 * there is no such point: a section with no segments of its own other than the soma.
 */
export function pointAtOffset(
  data: CircuitMorphologyData,
  cell: number,
  section: TreeSection,
  offset: number
): Vec3 | null {
  const { segments, somas, trees } = data;
  if (section.type === SectionType.Soma) {
    return Number.isNaN(somas[4 * cell])
      ? null
      : [somas[4 * cell], somas[4 * cell + 1], somas[4 * cell + 2]];
  }
  if (!trees || section.count === 0) return null;
  const first = trees.firstSegments[cell] + section.first;
  const target = Math.min(Math.max(offset, 0), 1) * section.length;
  let walked = 0;
  for (let s = first; s < first + section.count; s++) {
    const length = lengthOf(segments, s);
    const last = s === first + section.count - 1;
    if (walked + length >= target || last) {
      const t = length > 0 ? Math.min(1, (target - walked) / length) : 0;
      return [0, 1, 2].map(
        (k) => segments[8 * s + k] + t * (segments[8 * s + 4 + k] - segments[8 * s + k])
      ) as Vec3;
    }
    walked += length;
  }
  return null;
}

/** The cell's section that SONATA numbers `sonataId`; null where its morphology was not read whole or has none. */
export function sectionNumbered(
  data: CircuitMorphologyData,
  cell: number,
  sonataId: number
): TreeSection | null {
  return (
    data.trees?.morphologies[cell]?.sections.find((section) => section.sonataId === sonataId) ??
    null
  );
}
