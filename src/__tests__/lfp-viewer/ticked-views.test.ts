import { describe, expect, it } from 'vitest';

import { contactGrid, placeVoxels } from '@/features/lfp-viewer/contact-grid';
import { rowsOfTraced } from '@/features/lfp-viewer/field-structure';

// A 6 × 6 × 6 lattice, 20 µm apart: contact 7 in the first plane along z, 50 in the second, 93 in the third
const positions = Float32Array.from(
  Array.from({ length: 216 }, (_, c) => [
    (c % 6) * 20,
    (Math.floor(c / 6) % 6) * 20,
    Math.floor(c / 36) * 20,
  ]).flat()
);
const grid = contactGrid(positions);
if (!grid) throw new Error('no grid');

describe('rowsOfTraced', () => {
  it('is a row of each traced contact, in their order, called as its trace is', () => {
    expect(rowsOfTraced([7, 2], ['+20 µm', '−20 µm'])).toEqual([
      { contacts: [7], lead: 7, label: '+20 µm' },
      { contacts: [2], lead: 2, label: '−20 µm' },
    ]);
  });
});

describe('placeVoxels with ticked contacts', () => {
  it('boxes the ticked alone', () => {
    const { shown, centres } = placeVoxels(grid, null, new Set([7, 50, 93]));
    expect([...shown].sort((a, b) => a - b)).toEqual([7, 50, 93]);
    expect(centres.length).toBe(9);
  });

  it('boxes those of a slice that are ticked', () => {
    const axis = 2;
    const index = grid.sliceOf[axis][50];
    const { shown } = placeVoxels(grid, { axis, index }, new Set([7, 50, 93]));
    expect(shown).toEqual([50]);
  });

  it('boxes every contact with none ticked', () => {
    expect(placeVoxels(grid, null).shown.length).toBe(216);
  });
});
