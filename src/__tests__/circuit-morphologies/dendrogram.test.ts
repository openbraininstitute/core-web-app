import { describe, expect, it } from 'vitest';

import { treeOf } from '@/features/circuit-viewer/morphologies/load/tree';
import { SectionType } from '@/features/circuit-viewer/section-type';

import type { TreeMorphology } from '@/features/circuit-viewer/morphologies/load/tree';
import type { Sections } from '@/features/scan-config/types';

/**
 * A soma at (0, 0, 10); a basal dendrite out of it along x that forks in two, 9 µm and then 10 each; an axon down y,
 * 14 µm and then 10. With their stems of 6 µm, the tree is 30 µm deep at the most, along the axon.
 */
const NEURON: Sections = [
  {
    id: 'soma',
    sonata_section_id: 0,
    parent_id: null,
    type: SectionType.Soma,
    points: [[0, 0, 10]],
    radii: [6],
  },
  {
    id: '0',
    sonata_section_id: 1,
    parent_id: 'soma',
    type: SectionType.BasalDendrite,
    points: [
      [6, 0, 10],
      [10, 0, 10],
      [13, 4, 10],
    ],
    radii: [2, 1.5, 1],
  },
  {
    id: '1',
    sonata_section_id: 2,
    parent_id: '0',
    type: SectionType.BasalDendrite,
    points: [
      [13, 4, 10],
      [13, 14, 10],
    ],
    radii: [0.8, 0.5],
  },
  {
    id: '2',
    sonata_section_id: 3,
    parent_id: '0',
    type: SectionType.ApicalDendrite,
    points: [
      [13, 4, 10],
      [23, 4, 10],
    ],
    radii: [0.7, 0.4],
  },
  {
    id: '3',
    sonata_section_id: 4,
    parent_id: 'soma',
    type: SectionType.Axon,
    points: [
      [0, -6, 10],
      [0, -20, 10],
    ],
    radii: [0.5, 0.5],
  },
  {
    id: '4',
    sonata_section_id: 5,
    parent_id: '3',
    type: SectionType.Axon,
    points: [
      [0, -20, 10],
      [0, -30, 10],
    ],
    radii: [0.4, 0.3],
  },
];

const segment = (values: Float32Array, s: number) =>
  Array.from(values.subarray(8 * s, 8 * s + 8), (v) => Math.round(v * 1000) / 1000 + 0);

/** The neuron's extent: 23 µm across x (z does not vary), 44 µm up y; 30 µm deep, along the axon. */
const ACROSS = 23;
const TALL = 44;
/** The chart's height for a path distance, the soma's baseline 40% of the way up. */
const y = (distance: number) => (distance * TALL) / 30 - 0.4 * TALL;
/** Each section's column: the soma's root sections split the axis by their leaves, three of them, two the dendrite's. */
const x = (share: number) => (share * ACROSS) / 2;
const COLUMN = { basal: x(-1 / 3), first: x(-2 / 3), second: x(0), axon: x(2 / 3) };

function charted(): TreeMorphology & { chart: NonNullable<TreeMorphology['chart']> } {
  const tree = treeOf(NEURON, { axons: true, chart: true });
  if (!tree.chart) throw new Error('no chart');
  return tree as TreeMorphology & { chart: NonNullable<TreeMorphology['chart']> };
}

describe('a morphology charted as its dendrogram', () => {
  it('has a joint before each section, a point of no width where the section starts', () => {
    const tree = charted();
    expect(tree.segmentTypes).toHaveLength(8 + 5);
    const basal = tree.sections[1];
    // Its joint, then its stem, then its own two.
    expect(basal.first).toBe(2);
    expect(segment(tree.segments, 0)).toEqual([0, 0, 10, 0, 0, 0, 10, 0]);
    expect(segment(tree.segments, 1)).toEqual([0, 0, 10, 2, 6, 0, 10, 2]);
    const child = tree.sections[2];
    expect(child.first).toBe(5);
    expect(segment(tree.segments, 4)).toEqual([13, 4, 10, 0, 13, 4, 10, 0]);
    expect(Array.from(tree.segmentSections.subarray(0, 6))).toEqual([1, 1, 1, 1, 2, 2]);
  });

  it('measures a section as it did without them', () => {
    const plain = treeOf(NEURON, { axons: true });
    expect(charted().sections.map((s) => [s.count, s.length])).toEqual(
      plain.sections.map((s) => [s.count, s.length])
    );
    expect(plain.chart).toBeUndefined();
  });

  it('stands each section on a column of its own, up from where it starts along the tree', () => {
    const { chart } = charted();
    // The basal dendrite's stem from the baseline, then its own segments up to 15 µm along.
    expect(segment(chart.segments, 1).filter((_, k) => k !== 3 && k !== 7)).toEqual(
      [COLUMN.basal, y(0), 0, COLUMN.basal, y(6), 0].map((v) => Math.round(v * 1000) / 1000 + 0)
    );
    expect(chart.segments[8 * 3 + 5]).toBeCloseTo(y(15), 3);
    // Its first child's segment, from 15 µm to 25 on a column of its own.
    expect(chart.segments[8 * 5]).toBeCloseTo(COLUMN.first, 3);
    expect(chart.segments[8 * 5 + 4]).toBeCloseTo(COLUMN.first, 3);
    expect(chart.segments[8 * 5 + 1]).toBeCloseTo(y(15), 3);
    expect(chart.segments[8 * 5 + 5]).toBeCloseTo(y(25), 3);
    // The axon's stem on its column, on the right, past the dendrite's share.
    expect(chart.segments[8 * 9]).toBeCloseTo(COLUMN.axon, 3);
  });

  it("joins each section across from its parent's column, a root section from the soma's", () => {
    const { chart } = charted();
    const joint = (s: number) => [
      chart.segments[8 * s],
      chart.segments[8 * s + 4],
      chart.segments[8 * s + 1],
    ];
    // The basal dendrite's, along the baseline from the soma.
    expect(joint(0).map((v) => Math.round(v * 1000) / 1000 + 0)).toEqual(
      [0, COLUMN.basal, y(0)].map((v) => Math.round(v * 1000) / 1000 + 0)
    );
    // Its second child's, from its column across to the child's, where the child starts.
    const [from, to, at] = joint(6);
    expect(from).toBeCloseTo(COLUMN.basal, 3);
    expect(to).toBeCloseTo(COLUMN.second, 3);
    expect(at).toBeCloseTo(y(15), 3);
  });

  it('puts the soma at the foot of the chart, wider than any stroke, every stroke in the plane z = 0', () => {
    const { chart } = charted();
    if (!chart.soma) throw new Error('no soma');
    const [sx, sy, sz, ball] = chart.soma;
    expect([sx, sz]).toEqual([0, 0]);
    expect(sy).toBeCloseTo(y(0), 3);
    for (let s = 0; s < 13; s++) {
      expect(chart.segments[8 * s + 2]).toBe(0);
      expect(chart.segments[8 * s + 3]).toBeLessThan(ball);
      // A stroke is as wide at both ends.
      expect(chart.segments[8 * s + 7]).toBe(chart.segments[8 * s + 3]);
    }
    // A joint is the thinnest stroke there is.
    const widths = Array.from({ length: 13 }, (_, s) => chart.segments[8 * s + 3]);
    expect(chart.segments[3]).toBe(Math.min(...widths));
  });
});
