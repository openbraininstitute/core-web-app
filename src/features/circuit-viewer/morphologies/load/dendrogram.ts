/**
 * A morphology laid out as its dendrogram, as morphoviewer charted an ME-model: each section a column, branching
 * across x by its share of the tree's leaves, path distance from the soma up y, both scaled to the cell's own extent
 * so that the chart takes about the room the cell did and the morph between them stays in frame. It has the same
 * segments in the same order, so that a branch can be followed from one to the other.
 */
import { SectionType } from '@/features/circuit-viewer/section-type';

import { segmentLength } from '../sections';

import type { TreeMorphology } from './tree';

/** What a segment is to its section: one of its own, the stem from the soma, or its joint to its parent's column. */
export const SegmentKind = { Own: 0, Stem: 1, Joint: 2 } as const;

/** The share of the chart's height under the soma's baseline. */
const BELOW = 0.4;
/** The radii sampled, at most, for the strokes' range. */
const SAMPLES = 2048;

/**
 * The strokes' widths, µm, the chart's own: its y is path distance, so a radius is styling there, not measure. A
 * neurite's width runs from a third of `unit` to `unit` by where its radius falls between the 5th and 95th percentile
 * of the cell's; `unit` is bounded by the room between columns and by the chart's height.
 */
function strokes(
  tree: Pick<TreeMorphology, 'segments'>,
  own: number[],
  pitch: number,
  height: number
) {
  const step = Math.max(1, Math.ceil(own.length / SAMPLES));
  const radii: number[] = [];
  for (let i = 0; i < own.length; i += step) radii.push(tree.segments[8 * own[i] + 7]);
  radii.sort((a, b) => a - b);
  const at = (q: number) => radii[Math.min(radii.length - 1, Math.floor(q * radii.length))];
  const lo = radii.length > 0 ? Math.max(1e-6, at(0.05)) : 1;
  const hi = radii.length > 0 ? Math.max(lo * 1.0001, at(0.95)) : 1;
  const unit = Math.max(hi * 0.5, Math.min(0.2 * pitch, 0.0035 * height));
  const least = unit / 3;
  const span = Math.log(hi) - Math.log(lo);
  return {
    joint: least,
    soma: 3.5 * unit,
    of: (radius: number) => {
      if (span < 1e-6) return (least + unit) / 2;
      const t = (Math.log(Math.max(radius, 1e-6)) - Math.log(lo)) / span;
      return least + (unit - least) * Math.min(1, Math.max(0, t));
    },
  };
}

/**
 * `tree`'s dendrogram in its own frame, eight floats a segment as in its `segments`, all in z = 0. A section's segments
 * lie on its column, its stem at the column's foot, and its joint runs across from its parent's column (the soma's,
 * x = 0, for a root section). The soma is a ball at the foot of the chart. `kinds` says what each segment is.
 */
export function dendrogramOf(
  tree: Omit<TreeMorphology, 'chart'>,
  kinds: Uint8Array
): { segments: Float32Array; soma: [number, number, number, number] | null } {
  const { segments, segmentSections, sections, soma } = tree;
  const count = segmentSections.length;
  const stem = new Float64Array(sections.length);
  const own: number[] = [];
  for (let s = 0; s < count; s++) {
    if (kinds[s] === SegmentKind.Stem) stem[segmentSections[s]] = segmentLength(segments, s);
    if (kinds[s] === SegmentKind.Own) own.push(s);
  }
  // Path distance where each section starts and ends: parents come before their children.
  const start = new Float64Array(sections.length);
  const end = new Float64Array(sections.length);
  sections.forEach((section, i) => {
    start[i] = section.parent >= 0 ? end[section.parent] : 0;
    end[i] = start[i] + stem[i] + section.length;
  });
  // Leaves, children before their parents.
  const leaves = new Float64Array(sections.length);
  for (let i = sections.length - 1; i >= 0; i--) {
    if (sections[i].type === SectionType.Soma) continue;
    if (leaves[i] === 0) leaves[i] = 1;
    const { parent } = sections[i];
    if (parent >= 0) leaves[parent] += leaves[i];
  }
  // Each section's share of the -1..1 axis, its children splitting it by their leaves.
  const low = new Float64Array(sections.length);
  const high = new Float64Array(sections.length);
  const next = new Float64Array(sections.length);
  let roots = 0;
  sections.forEach((section, i) => {
    if (section.parent < 0) roots += leaves[i];
  });
  let cursor = -1;
  sections.forEach((section, i) => {
    if (leaves[i] === 0) return;
    const { parent } = section;
    const from = parent >= 0 ? next[parent] : cursor;
    const width = parent >= 0 ? high[parent] - low[parent] : 2;
    const share = parent >= 0 ? leaves[i] / leaves[parent] : leaves[i] / Math.max(roots, 1);
    low[i] = from;
    high[i] = from + width * share;
    if (parent >= 0) next[parent] = high[i];
    else cursor = high[i];
    next[i] = low[i];
  });

  // The cell's extent, as morphoviewer measured it: the wider of x and z across, y up.
  const lowest = [Infinity, Infinity, Infinity];
  const highest = [-Infinity, -Infinity, -Infinity];
  for (let s = 0; s < count; s++) {
    for (let k = 0; k < 3; k++) {
      lowest[k] = Math.min(lowest[k], segments[8 * s + 4 + k]);
      highest[k] = Math.max(highest[k], segments[8 * s + 4 + k]);
    }
  }
  const across = count > 0 ? Math.max(1, highest[0] - lowest[0], highest[2] - lowest[2]) : 1;
  const tall = count > 0 ? Math.max(1, highest[1] - lowest[1]) : 1;
  const deepest = end.reduce((most, d) => Math.max(most, d), 0);
  const scale = deepest > 0 ? tall / deepest : 1;
  const x = (i: number) => ((low[i] + high[i]) / 2) * (across / 2);
  const y = (d: number) => d * scale - BELOW * tall;
  const width = strokes(tree, own, across / Math.max(1, roots), tall);

  const chart = new Float32Array(8 * count);
  const walked = new Float64Array(sections.length);
  const write = (s: number, x0: number, d0: number, x1: number, d1: number, radius: number) => {
    chart.set([x0, y(d0), 0, radius, x1, y(d1), 0, radius], 8 * s);
  };
  for (let s = 0; s < count; s++) {
    const i = segmentSections[s];
    const { parent } = sections[i];
    if (kinds[s] === SegmentKind.Joint) {
      write(s, parent >= 0 ? x(parent) : 0, start[i], x(i), start[i], width.joint);
    } else if (kinds[s] === SegmentKind.Stem) {
      write(s, x(i), start[i], x(i), start[i] + stem[i], width.of(segments[8 * s + 7]));
    } else {
      const from = start[i] + stem[i] + walked[i];
      const length = segmentLength(segments, s);
      walked[i] += length;
      write(s, x(i), from, x(i), from + length, width.of(segments[8 * s + 7]));
    }
  }
  return { segments: chart, soma: soma && [0, y(0), 0, width.soma] };
}
