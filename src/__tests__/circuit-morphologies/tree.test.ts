import { describe, expect, it } from 'vitest';

import { treeOf } from '@/features/circuit-viewer/morphologies/load/tree';
import { SectionType } from '@/features/circuit-viewer/section-type';

import type { Sections } from '@/features/scan-config/types';

/** A soma at (0, 0, 10), a basal dendrite out of it along x that forks in two, and an axon down y. */
function neuron(): Sections {
  return [
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
}

const segment = (segments: Float32Array, i: number) =>
  Array.from(segments.subarray(8 * i, 8 * i + 8), (v) => Math.round(v * 1000) / 1000);

describe('a morphology read from its sections', () => {
  it('is a segment between each two points of a section, a neurite leaving the soma from its centre', () => {
    const tree = treeOf(neuron(), { axons: true });
    expect(tree.soma).toEqual([0, 0, 10, 6]);
    // The basal dendrite: its stem, then its two segments.
    expect(segment(tree.segments, 0)).toEqual([0, 0, 10, 2, 6, 0, 10, 2]);
    expect(segment(tree.segments, 1)).toEqual([6, 0, 10, 2, 10, 0, 10, 1.5]);
    expect(segment(tree.segments, 2)).toEqual([10, 0, 10, 1.5, 13, 4, 10, 1]);
    // A child carries on from its parent's last point, which is its own first.
    expect(segment(tree.segments, 3)).toEqual([13, 4, 10, 0.8, 13, 14, 10, 0.5]);
    expect(segment(tree.segments, 5)).toEqual([0, 0, 10, 0.5, 0, -6, 10, 0.5]);
    expect(tree.segments).toHaveLength(8 * 8);
  });

  it("numbers each segment's type as SWC does and its section through the sections drawn", () => {
    const tree = treeOf(neuron(), { axons: true });
    expect(Array.from(tree.segmentTypes)).toEqual([3, 3, 3, 3, 4, 2, 2, 2]);
    expect(Array.from(tree.segmentSections)).toEqual([1, 1, 1, 2, 3, 4, 4, 5]);
  });

  it("tells each section's SONATA number, type, segments and length, its stem left out", () => {
    const { sections } = treeOf(neuron(), { axons: true });
    expect(sections.map(({ length, ...section }) => section)).toEqual([
      { sonataId: 0, type: SectionType.Soma, parent: -1, first: 0, count: 0 },
      { sonataId: 1, type: SectionType.BasalDendrite, parent: -1, first: 1, count: 2 },
      { sonataId: 2, type: SectionType.BasalDendrite, parent: 1, first: 3, count: 1 },
      { sonataId: 3, type: SectionType.ApicalDendrite, parent: 1, first: 4, count: 1 },
      { sonataId: 4, type: SectionType.Axon, parent: -1, first: 6, count: 1 },
      { sonataId: 5, type: SectionType.Axon, parent: 4, first: 7, count: 1 },
    ]);
    expect(sections.map((section) => section.length)).toEqual([0, 9, 10, 10, 14, 10]);
  });

  it('leaves the axon out where asked, and what grows from it', () => {
    const tree = treeOf(neuron(), { axons: false });
    expect(tree.sections.map((section) => section.sonataId)).toEqual([0, 1, 2, 3]);
    expect(Array.from(tree.segmentTypes)).toEqual([3, 3, 3, 3, 4]);
  });

  it("makes a contour's soma one sphere about its centre, as far out as its points lie", () => {
    const tree = treeOf(
      [
        {
          id: 'soma',
          parent_id: null,
          type: SectionType.Soma,
          points: [
            [4, 0, 0],
            [0, 4, 0],
            [-4, 0, 0],
            [0, -4, 0],
          ],
          radii: [0, 0, 0, 0],
        },
      ],
      { axons: true }
    );
    expect(tree.soma).toEqual([0, 0, 0, 4]);
    expect(tree.sections).toEqual([
      { sonataId: null, type: SectionType.Soma, parent: -1, first: 0, count: 0, length: 0 },
    ]);
  });

  it("takes three points along a cylinder's axis at the cylinder's radius", () => {
    const tree = treeOf(
      [
        {
          id: 'soma',
          parent_id: null,
          type: SectionType.Soma,
          points: [
            [0, 0, 0],
            [0, -5, 0],
            [0, 5, 0],
          ],
          radii: [5, 5, 5],
        },
      ],
      { axons: true }
    );
    expect(tree.soma).toEqual([0, 0, 0, 5]);
  });

  it('has no soma and no stems without one', () => {
    const [, ...neurites] = neuron();
    const tree = treeOf(
      neurites.map((section) =>
        section.parent_id === 'soma' ? { ...section, parent_id: null } : section
      ),
      { axons: true }
    );
    expect(tree.soma).toBeNull();
    expect(segment(tree.segments, 0)).toEqual([6, 0, 10, 2, 10, 0, 10, 1.5]);
    expect(tree.segmentTypes).toHaveLength(6);
  });
});
