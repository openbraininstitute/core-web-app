/**
 * One morphology as OBI-One's `/circuit/viz` and `/memodel/viz` give it, a section at a time with every traced point,
 * drawn as the pack draws its morphologies: a segment between each two points of a section, the soma one sphere, and
 * a neurite leaving the soma from its centre.
 */
import { SectionType } from '@/features/circuit-viewer/section-type';

import { dendrogramOf, SegmentKind } from './dendrogram';

import type { Sections } from '@/features/scan-config/types';

/** A section of a morphology, and its segments. */
export interface TreeSection {
  /** SONATA's number for it, which a stored morphology location names; null where OBI-One sent none. */
  sonataId: number | null;
  type: SectionType;
  /** The section it grows from, by its index in `sections`; -1 for one that grows from the soma, or from nothing. */
  parent: number;
  /**
   * Its first segment and how many it has. The segments of the section before the first are not its own: a root
   * section's stem from the soma's centre, and, where the dendrogram was charted, its joint before that.
   */
  first: number;
  count: number;
  /** µm along its segments, the stem left out. */
  length: number;
}

/** A morphology in its own frame, µm. */
export interface TreeMorphology {
  /** Eight floats a segment: x, y, z and radius of its near end, then of its far end. */
  segments: Float32Array;
  /** Each segment's section type, as in SWC, as a pack's are numbered. */
  segmentTypes: Uint8Array;
  /** Each segment's section, numbered through `sections`. */
  segmentSections: Uint32Array;
  /** x, y, z and radius of the soma; null where the morphology has none. */
  soma: [number, number, number, number] | null;
  /** Every section drawn, in OBI-One's order, the soma's included with no segments. */
  sections: TreeSection[];
  /**
   * The same segments and the soma laid out as the dendrogram (`dendrogram.ts`), where it was asked for. A section's
   * joint is then a point with no width in the morphology, and the line from its parent's column in the dendrogram.
   */
  chart?: { segments: Float32Array; soma: [number, number, number, number] | null };
}

/** SWC's numbers for OBI-One's section types: 1 soma, 2 axon, 3 dendrite or basal dendrite, 4 apical dendrite. */
const SWC_TYPE: Partial<Record<SectionType, number>> = {
  [SectionType.Soma]: 1,
  [SectionType.Axon]: 2,
  [SectionType.Dendrite]: 3,
  [SectionType.BasalDendrite]: 3,
  [SectionType.ApicalDendrite]: 4,
};

type Point = [number, number, number];

/**
 * One sphere for the soma's points, centred on their mean. Its radius is the larger of their mean distance from the
 * centre and the widest point's radius. A single point keeps its own radius, a contour gets its mean distance, and
 * three points along a cylinder's axis, as NeuroMorpho records a soma, come out at the cylinder's radius.
 */
function somaSphere(points: Point[], radii: number[]): [number, number, number, number] | null {
  if (points.length === 0) return null;
  const centre = [0, 1, 2].map(
    (k) => points.reduce((sum, point) => sum + point[k], 0) / points.length
  ) as Point;
  let reach = 0;
  for (const point of points) reach += distance(point, centre) / points.length;
  const widest = radii.reduce((most, radius) => Math.max(most, radius), 0);
  return [...centre, Math.max(reach, widest)];
}

const distance = (a: Readonly<Point>, b: Readonly<Point>) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * The morphology of `sections`, with its axon or without; with `chart`, its dendrogram too. A section whose parent is
 * left out is left out too.
 */
export function treeOf(
  sections: Sections,
  { axons, chart = false }: { axons: boolean; chart?: boolean }
): TreeMorphology {
  const somaSection = sections.find((section) => section.type === SectionType.Soma);
  const soma = somaSection ? somaSphere(somaSection.points, somaSection.radii) : null;
  const leftOut = new Set<string>();
  const drawn = sections.filter((section) => {
    const out =
      (!axons && section.type === SectionType.Axon) ||
      (section.parent_id !== null && leftOut.has(section.parent_id));
    if (out) leftOut.add(section.id);
    return !out;
  });
  const indexOf = new Map(drawn.map((section, index) => [section.id, index]));
  const hasStem = (section: Sections[number]) =>
    soma !== null &&
    section !== somaSection &&
    section.parent_id === somaSection?.id &&
    section.points.length > 0;
  const hasJoint = (section: Sections[number]) =>
    chart && section !== somaSection && section.points.length > 0;
  let total = 0;
  for (const section of drawn) {
    if (section === somaSection) continue;
    total += (hasJoint(section) ? 1 : 0) + (hasStem(section) ? 1 : 0);
    total += Math.max(0, section.points.length - 1);
  }

  const segments = new Float32Array(8 * total);
  const segmentTypes = new Uint8Array(total);
  const segmentSections = new Uint32Array(total);
  const kinds = new Uint8Array(total);
  const tree: TreeSection[] = [];
  let at = 0;
  const write = (from: Point, fromRadius: number, to: Point, toRadius: number, of: number) => {
    segments.set(from, 8 * at);
    segments[8 * at + 3] = fromRadius;
    segments.set(to, 8 * at + 4);
    segments[8 * at + 7] = toRadius;
    segmentTypes[at] = SWC_TYPE[drawn[of].type] ?? 0;
    segmentSections[at++] = of;
  };
  drawn.forEach((section, index) => {
    const { points, radii } = section;
    const stemmed = soma && hasStem(section);
    if (hasJoint(section)) {
      const joint = stemmed ? (soma.slice(0, 3) as Point) : points[0];
      kinds[at] = SegmentKind.Joint;
      write(joint, 0, joint, 0, index);
    }
    // As wide at both ends as the neurite where it starts, so that it does not grow out of the soma as a cone.
    if (stemmed) {
      kinds[at] = SegmentKind.Stem;
      write(soma.slice(0, 3) as Point, radii[0], points[0], radii[0], index);
    }
    const first = at;
    let length = 0;
    for (let i = 1; section !== somaSection && i < points.length; i++) {
      write(points[i - 1], radii[i - 1], points[i], radii[i], index);
      length += distance(points[i - 1], points[i]);
    }
    const parent = section.parent_id === null ? undefined : indexOf.get(section.parent_id);
    tree.push({
      sonataId: section.sonata_section_id ?? null,
      type: section.type,
      parent: parent === undefined || drawn[parent] === somaSection ? -1 : parent,
      first,
      count: at - first,
      length,
    });
  });
  const morphology = { segments, segmentTypes, segmentSections, soma, sections: tree };
  return chart ? { ...morphology, chart: dendrogramOf(morphology, kinds) } : morphology;
}
