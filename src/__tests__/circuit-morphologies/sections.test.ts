import { describe, expect, it } from 'vitest';

import { placeTrees } from '@/features/circuit-viewer/morphologies/load/place-trees';
import { treeOf } from '@/features/circuit-viewer/morphologies/load/tree';
import {
  pointAtOffset,
  sectionAtSegment,
  sectionNumbered,
  somaSectionOf,
} from '@/features/circuit-viewer/morphologies/sections';
import { SectionType } from '@/features/circuit-viewer/section-type';

import type { Sections } from '@/features/scan-config/types';

/** A soma at (0, 0, 10), a basal dendrite out of it 9 µm long in two segments, and a child of it 10 µm long. */
const SECTIONS: Sections = [
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
];

/** A cell with no morphology, then that neuron, unturned, 100 µm along x. */
function data() {
  const tree = treeOf(SECTIONS, { axons: true });
  return placeTrees(
    {
      somas: {
        positions: Float32Array.of(0, 50, 0, 100, 0, 0),
        populations: [{ name: 'A', cells: 2 }],
      },
      orientations: null,
    },
    [null, tree],
    [0, 0, 0]
  );
}

const rounded = (values: readonly number[] | null) =>
  values?.map((value) => Math.round(value * 1000) / 1000);

describe('a morphology location', () => {
  it("is measured along its section's own segments, from the segment a point is on", () => {
    // The dendrite's second segment, 4 µm into the section, 0.4 of the way along its 5 µm.
    const at = sectionAtSegment(data(), 2, 0.4);
    expect(at?.cell).toBe(1);
    expect(at?.section.sonataId).toBe(1);
    expect(at?.offset).toBeCloseTo(6 / 9, 6);
    expect(sectionAtSegment(data(), 3, 1)?.offset).toBe(1);
    expect(sectionAtSegment(data(), 3, 0)?.section.sonataId).toBe(2);
  });

  it('is at the start of its section anywhere on the stem from the soma', () => {
    const at = sectionAtSegment(data(), 0, 0.9);
    expect(at?.section.sonataId).toBe(1);
    expect(at?.offset).toBe(0);
  });

  it('is where the offset falls along the section, in the frame the cells are placed in', () => {
    const placed = data();
    const section = sectionNumbered(placed, 1, 1);
    if (!section) throw new Error('no section 1');
    expect(rounded(pointAtOffset(placed, 1, section, 6 / 9))).toEqual([111.2, 1.6, 10]);
    expect(rounded(pointAtOffset(placed, 1, section, 0))).toEqual([106, 0, 10]);
    expect(rounded(pointAtOffset(placed, 1, section, 1))).toEqual([113, 4, 10]);
    // Past either end, at that end.
    expect(rounded(pointAtOffset(placed, 1, section, 3))).toEqual([113, 4, 10]);
  });

  it('is the same share along the same segment, drawn as far morphed into the dendrogram as it is', () => {
    const tree = treeOf(SECTIONS, { axons: true, chart: true });
    const placed = placeTrees(
      {
        somas: { positions: Float32Array.of(100, 0, 0), populations: [{ name: 'A', cells: 1 }] },
        orientations: null,
      },
      [tree],
      [0, 0, 0]
    );
    const section = sectionNumbered(placed, 0, 1);
    if (!section) throw new Error('no section 1');
    // 4.5 µm into the 9: a tenth of the way along the second segment, (10, 0, 10) to (13, 4, 10). In the chart, 13 µm
    // across and 14 up for a tree 25 µm deep, that segment is the column x = 0 from 10 µm along the tree to 15.
    const y = (distance: number) => distance * (14 / 25) - 0.4 * 14;
    expect(rounded(pointAtOffset(placed, 0, section, 0.5))).toEqual([110.3, 0.4, 10]);
    expect(rounded(pointAtOffset(placed, 0, section, 0.5, 1))).toEqual(rounded([100, y(10.5), 0]));
    expect(rounded(pointAtOffset(placed, 0, section, 0.5, 0.5))).toEqual(
      rounded([105.15, (0.4 + y(10.5)) / 2, 5])
    );
    const soma = somaSectionOf(placed, 0);
    if (!soma) throw new Error('no soma');
    const somaChart = placed.chart?.somas ?? new Float32Array(4);
    expect(rounded(pointAtOffset(placed, 0, soma, 0.5, 1))).toEqual(
      rounded(Array.from(somaChart.subarray(0, 3)))
    );
  });

  it("is the soma's centre on the soma", () => {
    const placed = data();
    const soma = somaSectionOf(placed, 1);
    expect(soma).toEqual(expect.objectContaining({ sonataId: 0, type: SectionType.Soma }));
    if (!soma) throw new Error('no soma');
    expect(rounded(pointAtOffset(placed, 1, soma, 0.5))).toEqual([100, 0, 10]);
  });

  it('is on the soma at section 0 where OBI-One sent the soma unnumbered', () => {
    const unnumbered = SECTIONS.map((section) =>
      section.type === SectionType.Soma ? { ...section, sonata_section_id: undefined } : section
    );
    const placed = placeTrees(
      {
        somas: { positions: Float32Array.of(100, 0, 0), populations: [{ name: 'A', cells: 1 }] },
        orientations: null,
      },
      [treeOf(unnumbered, { axons: true })],
      [0, 0, 0]
    );
    expect(sectionNumbered(placed, 0, 0)).toEqual(
      expect.objectContaining({ sonataId: null, type: SectionType.Soma })
    );
  });

  it('is nowhere on a cell whose morphology was not read whole, nor on a section it has not', () => {
    const placed = data();
    expect(sectionNumbered(placed, 1, 9)).toBeNull();
    expect(sectionNumbered(placed, 0, 1)).toBeNull();
    expect(somaSectionOf(placed, 0)).toBeNull();
    expect(sectionAtSegment({ ...placed, trees: undefined }, 2, 0.5)).toBeNull();
  });
});
