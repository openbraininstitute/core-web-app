import { describe, expect, it } from 'vitest';

import { levelOf, SCENE_LEVELS } from '@/features/lfp-viewer/colour-scale';
import {
  contactGrid,
  openingSliceAxis,
  slicePosition,
  voxelsOf,
} from '@/features/lfp-viewer/contact-grid';

function lattice(nx: number, ny: number, nz: number, step: [number, number, number]) {
  const points: number[] = [];
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) points.push(x * step[0], y * step[1], z * step[2]);
    }
  }
  return Float32Array.from(points);
}

/** Depth planes of a lattice of their own, each with another offset and footprint, as the CA1 array is. */
function offsetPlanes() {
  const offsets = [
    [0, 0],
    [37, 11],
    [-23, 52],
    [71, -41],
    [12, 88],
    [-55, 19],
  ];
  const points: number[] = [];
  offsets.forEach(([dx, dz], plane) => {
    for (let x = 0; x < 8 - (plane % 2); x++) {
      for (let z = 0; z < 6; z++) points.push(dx + x * 110, plane * 51.3, dz + z * 110);
    }
  });
  return Float32Array.from(points);
}

describe('contactGrid', () => {
  it('reads a regular lattice', () => {
    const grid = contactGrid(lattice(6, 5, 7, [20, 30, 40]));
    expect(grid?.pitch).toEqual([20, 30, 40]);
    expect(grid?.slices).toEqual([6, 5, 7]);
    expect(grid?.first).toEqual([0, 0, 0]);
  });

  it('reads the planes of a stack whose lattices are offset from each other', () => {
    const grid = contactGrid(offsetPlanes());
    expect(grid?.pitch[0]).toBeCloseTo(110, 3);
    expect(grid?.pitch[1]).toBeCloseTo(51.3, 3);
    expect(grid?.pitch[2]).toBeCloseTo(110, 3);
    expect(grid?.slices[1]).toBe(6);
  });

  it('puts every contact in a slice along every axis, and leaves none of them empty', () => {
    const positions = offsetPlanes();
    const grid = contactGrid(positions);
    expect(grid).not.toBeNull();
    for (let axis = 0; axis < 3; axis++) {
      const counts = new Array<number>(grid?.slices[axis] ?? 0).fill(0);
      for (const slice of grid?.sliceOf[axis] ?? []) counts[slice]++;
      expect(counts.reduce((a, b) => a + b, 0)).toBe(positions.length / 3);
      expect(counts.every((count) => count > 0)).toBe(true);
    }
  });

  it('reads a single plane, its thickness the finer step', () => {
    const grid = contactGrid(lattice(6, 8, 1, [20, 30, 0]));
    expect(grid?.pitch).toEqual([20, 30, 20]);
    expect(grid?.slices).toEqual([6, 8, 1]);
  });

  it('has no grid of a probe, in one line or a few columns', () => {
    expect(contactGrid(lattice(1, 16, 1, [0, 20, 0]))).toBeNull();
    expect(contactGrid(lattice(4, 96, 1, [16, 20, 0]))).toBeNull();
  });

  it('has no grid of scattered contacts, nor of a lattice turned off the axes', () => {
    const scattered = Float32Array.from({ length: 300 }, (_, i) => (i * 7919.13) % 1000);
    expect(contactGrid(scattered)).toBeNull();

    const flat = lattice(6, 6, 6, [20, 20, 20]);
    const turned = new Float32Array(flat.length);
    const [cos, sin] = [Math.cos(0.5), Math.sin(0.5)];
    for (let c = 0; c < flat.length; c += 3) {
      turned[c] = flat[c] * cos - flat[c + 1] * sin;
      turned[c + 1] = flat[c] * sin + flat[c + 1] * cos;
      turned[c + 2] = flat[c + 2];
    }
    expect(contactGrid(turned)).toBeNull();
  });

  it('has no grid of nothing', () => {
    expect(contactGrid(new Float32Array(0))).toBeNull();
  });

  it('opens its slices along the axis with the fewest, passing over a single plane', () => {
    const stack = contactGrid(lattice(9, 5, 7, [20, 30, 40]));
    expect(stack && openingSliceAxis(stack)).toBe(1);
    const plane = contactGrid(lattice(6, 8, 1, [20, 30, 0]));
    expect(plane && openingSliceAxis(plane)).toBe(0);
  });
});

describe('voxelsOf', () => {
  const positions = offsetPlanes();
  const grid = contactGrid(positions);
  if (!grid) throw new Error('no grid');
  const contacts = positions.length / 3;

  it('draws every contact where it is, more opaque the larger |V|', () => {
    const levels = new Uint8Array(contacts).fill(levelOf(0));
    levels[0] = SCENE_LEVELS - 1;
    levels[1] = 0;
    levels[2] = levelOf(0.5);
    const { centres, sizes, looks } = voxelsOf(positions, grid, levels, null);
    expect(Array.from(centres)).toEqual(Array.from(positions));
    expect(sizes[0]).toBeCloseTo(grid.pitch[0] * 0.85, 3);
    expect(looks[3]).toBeCloseTo(0.55, 5);
    expect(looks[7]).toBeCloseTo(0.55, 5);
    expect(looks[11]).toBeGreaterThan(0.05);
    expect(looks[11]).toBeLessThan(0.3);
    expect(looks[15]).toBe(0);
  });

  it('draws a slice as opaque tiles on its plane, the quiet ones too', () => {
    const levels = new Uint8Array(contacts).fill(levelOf(0));
    for (const axis of [0, 1, 2]) {
      let total = 0;
      for (let index = 0; index < grid.slices[axis]; index++) {
        const slice = { axis, index };
        const { centres, sizes, looks } = voxelsOf(positions, grid, levels, slice);
        total += centres.length / 3;
        for (let i = axis; i < centres.length; i += 3) {
          expect(centres[i]).toBeCloseTo(slicePosition(grid, slice), 3);
          expect(sizes[i]).toBeCloseTo(grid.pitch[axis] * 0.12, 3);
        }
        expect(looks.filter((_, i) => i % 4 === 3).every((a) => a > 0.94)).toBe(true);
      }
      expect(total).toBe(contacts);
    }
  });
});
