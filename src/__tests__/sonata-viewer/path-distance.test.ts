import { describe, expect, it } from 'vitest';

import { sectionPaths } from '@/features/sonata-viewer/path-distance';
import { MorphoViewerTreeItemType } from '@/morpho-viewer/tree-item-type';

import type { Sections } from '@/features/scan-config/types';

const section = (
  id: string,
  parent: string | null,
  sonata: number,
  points: [number, number, number][],
  type = MorphoViewerTreeItemType.ApicalDendrite
): Sections[number] => ({
  id,
  parent_id: parent,
  sonata_section_id: sonata,
  type,
  points,
  radii: points.map(() => 1),
});

describe('sectionPaths', () => {
  it('measures each section from the soma along its parents, whatever order they come in', () => {
    const paths = sectionPaths([
      // A grandchild listed ahead of its parent.
      section('3', '2', 3, [
        [10, 20, 0],
        [10, 20, 5],
      ]),
      section(
        'soma',
        null,
        0,
        [
          [0, 0, 0],
          [3, 0, 0],
        ],
        MorphoViewerTreeItemType.Soma
      ),
      section('1', 'soma', 1, [
        [0, 0, 0],
        [6, 8, 0],
      ]),
      section('2', '1', 2, [
        [6, 8, 0],
        [10, 20, 0],
      ]),
    ]);
    expect(paths.get(0)).toMatchObject({
      start: 0,
      length: 0,
      type: MorphoViewerTreeItemType.Soma,
    });
    expect(paths.get(1)).toMatchObject({ start: 0, length: 10 });
    expect(paths.get(2)?.start).toBe(10);
    expect(paths.get(2)?.length).toBeCloseTo(Math.hypot(4, 12), 9);
    expect(paths.get(3)?.start).toBeCloseTo(10 + Math.hypot(4, 12), 9);
    expect(paths.get(3)?.length).toBe(5);
  });
});
