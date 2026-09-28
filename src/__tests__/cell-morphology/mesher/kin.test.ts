// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';

import {
  bandHalfWidth,
  FieldSampler,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/field';
import {
  buildHybrid,
  type HybridParams,
  hybridLayout,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/hybrid';
import {
  kinship,
  partsBetween,
  SOMA_NODE,
  STAR_MAX,
  weldContacts,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/kin';
import {
  buildMesh,
  collectPrimitives,
  type Prim,
  planPrimitives,
  simplifierReady,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher';
import { parseSwc } from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';

import { checkMesh, connectedComponents, degrees, params as testParams } from './mesh-utils';

const params = (over: Partial<HybridParams> = {}): HybridParams =>
  testParams({ voxel: 0.1, simplifyMesh: 0.05, ...over });

const VOXEL = 0.1;
const band = (r: number, beta: number): number => bandHalfWidth(r, beta, VOXEL);
const margin = (): number => VOXEL;
const primsOf = (swc: string): Prim[] => collectPrimitives(parseSwc(swc), params());

/** A dendrite of radius 0.5 along x that forks at x = 20 into two branches, 60° apart, each 40 µm long. */
const FORK = `
  1 3 0 0 0 0.5 -1
  2 3 20 0 0 0.5 1
  3 3 54.64 20 0 0.5 2
  4 3 54.64 -20 0 0.5 2
`;

/** The same, with branches only 6° apart: they are within each other's reach for tens of microns. */
const NARROW = `
  1 3 0 0 0 0.5 -1
  2 3 20 0 0 0.5 1
  3 3 99.89 4.19 0 0.5 2
  4 3 99.89 -4.19 0 0.5 2
`;

/** Two fibres of radius 0.5 that are no part of each other, side by side along x, their surfaces `gap` apart. */
const beside = (gap: number): string => `
  1 3 0 0 0 0.5 -1
  2 3 30 0 0 0.5 1
  3 2 0 ${1 + gap} 0 0.5 -1
  4 2 30 ${1 + gap} 0 0.5 3
`;

/** Two such fibres that cross at right angles, the second one `gap` above the first where they cross. */
const crossing = (gap: number): string => `
  1 3 -15 0 0 0.5 -1
  2 3 15 0 0 0.5 1
  3 2 0 -15 ${1 + gap} 0.5 -1
  4 2 0 15 ${1 + gap} 0.5 3
`;

beforeAll(() => simplifierReady);

describe('kinship', () => {
  it("makes a star of a fork, as far as its sections are within each other's reach, and shafts of the rest", () => {
    const prims = primsOf(FORK);
    const kin = kinship(prims, band, margin);
    expect(prims.length).toBe(3);
    // Parent: a shaft, then the star. Children: the star, then a shaft.
    expect(kin.families.map((f) => f.length)).toEqual([2, 2, 2]);
    const star = kin.families[0][1];
    expect(kin.families[1][0]).toBe(star);
    expect(kin.families[2][0]).toBe(star);
    expect(kin.social[star]).toBe(1);
    const shafts = [kin.families[0][0], kin.families[1][1], kin.families[2][1]];
    expect(new Set(shafts).size).toBe(3);
    for (const f of shafts) expect(kin.social[f]).toBe(0);
    // One branch is within the other's reach while its axis is no farther from the other's than a radius, a band and a
    // voxel, 1.6 µm; at 60° that is 1.6 / sin 60° = 1.85 µm from the fork. The star goes a band's width farther, in
    // steps of a quarter of it, and nowhere near as far as it might.
    const w = band(0.5, 0.5);
    for (const p of [1, 2]) {
      expect(kin.bounds[p][1]).toBeGreaterThan(1.85 + w - 0.25 * w);
      expect(kin.bounds[p][1]).toBeLessThanOrEqual(1.85 + w);
      expect(kin.bounds[p][1]).toBeLessThan(0.5 * STAR_MAX * w);
    }
    expect(20 - kin.bounds[0][1]).toBeGreaterThan(1.6);
    expect(20 - kin.bounds[0][1]).toBeLessThanOrEqual(1.6 + w);
  });

  it('ends a star that would go on for ever', () => {
    const prims = primsOf(NARROW);
    const kin = kinship(prims, band, margin);
    const w = band(0.5, 0.5);
    for (const p of [1, 2]) expect(kin.bounds[p][1]).toBeCloseTo(STAR_MAX * w, 6);
  });

  it('makes one star of two forks that a short section joins, and of the soma with its stems', () => {
    const kin = kinship(
      primsOf(`
        1 1 0 0 0 3 -1
        2 3 0 0 0 0.5 1
        3 3 30 0 0 0.5 2
        4 3 30.8 0.3 0 0.5 3
        5 3 50 15 0 0.4 4
        6 3 50 -2 0 0.4 4
        7 3 45 -18 0 0.4 3
      `),
      band,
      margin
    );
    // The soma, the stem, the short section between the forks, and the three branches.
    expect(kin.families.length).toBe(6);
    const soma = kin.families[0][0];
    expect(kin.families[1][0]).toBe(soma);
    expect(kin.families[2].length).toBe(1);
    const forks = kin.families[2][0];
    expect(forks).not.toBe(soma);
    expect(kin.families[1][kin.families[1].length - 1]).toBe(forks);
    for (const p of [3, 4, 5]) expect(kin.families[p][0]).toBe(forks);
  });

  it('leaves primitives that do not say where they are attached one family', () => {
    const prims = primsOf(FORK).map(({ ends: _ends, ...P }) => P);
    const kin = kinship(prims, band, margin);
    expect(kin.social.length).toBe(1);
    expect(kin.families.map((f) => Array.from(f))).toEqual([[0], [0], [0]]);
  });

  it('welds what touches, from where it comes within reach to where it leaves it', () => {
    const prims = primsOf(crossing(-0.2));
    const kin = kinship(prims, band, margin);
    expect(kin.families.map((f) => f.length)).toEqual([1, 1]);
    const welded = weldContacts(kin, prims, [{ p: 0, sp: 15, q: 1, sq: 15 }], band, margin);
    // Shaft, weld, shaft on either fibre; one weld, four shafts.
    expect(welded.families.map((f) => f.length)).toEqual([3, 3]);
    const weld = welded.families[0][1];
    expect(welded.families[1][1]).toBe(weld);
    expect(welded.social[weld]).toBe(1);
    expect(
      new Set([
        welded.families[0][0],
        welded.families[0][2],
        welded.families[1][0],
        welded.families[1][2],
      ]).size
    ).toBe(4);
    // Axes at right angles, 0.8 µm apart where they cross, are within reach (a radius, a band and a voxel: 1.6 µm)
    // for √(1.6² − 0.8²) = 1.39 µm to either side; the weld goes a band's width (1 µm) farther.
    for (const p of [0, 1]) {
      const [, from, to] = welded.bounds[p];
      for (const half of [15 - from, to - 15]) {
        expect(half).toBeGreaterThan(2.39 - 0.25);
        expect(half).toBeLessThanOrEqual(2.39);
      }
    }
    expect(partsBetween(welded, 0, 14, 16).map((part) => part[2])).toEqual([weld]);
  });

  it("takes the soma's node for the stems' start", () => {
    const prims = primsOf('1 1 0 0 0 3 -1\n2 3 0 0 0 0.5 1\n3 3 30 0 0 0.5 2');
    expect(prims[0].ends).toEqual([SOMA_NODE, SOMA_NODE]);
    expect(prims[1].ends![0]).toBe(SOMA_NODE);
  });
});

/** Largest and smallest distance of the vertices from the nearer of two axes along x, at y = 0 and y = y1. */
function offAxes(
  positions: Float32Array,
  center: number[],
  y1: number,
  x0: number,
  x1: number
): { min: number; max: number } {
  let min = Infinity,
    max = 0;
  for (let v = 0; v < positions.length; v += 3) {
    const x = positions[v] + center[0],
      y = positions[v + 1] + center[1],
      z = positions[v + 2] + center[2];
    if (x < x0 || x > x1) continue;
    const d = Math.min(Math.hypot(y, z), Math.hypot(y - y1, z));
    min = Math.min(min, d);
    max = Math.max(max, d);
  }
  return { min, max };
}

describe('fibres that do not belong together', () => {
  it('have no effect on each other within their bands, with voxels throughout', () => {
    // 0.3 µm apart: either is well within the other's band (1 µm), and the sum of the kernels would join them.
    const m = parseSwc(beside(0.3));
    const res = buildMesh(m, params());
    expect(connectedComponents(res.positions.length / 3, res.indices)).toBe(2);
    expect(checkMesh(res.positions, res.indices).closed).toBe(true);
    const { min, max } = offAxes(res.positions, res.center, 1.3, 2, 28);
    expect(max).toBeLessThan(0.5 + 0.02);
    expect(min).toBeGreaterThan(0.5 - 0.06);
  });

  it('are tubes all the way with the hybrid mesher, and no patch', () => {
    const m = parseSwc(beside(0.3));
    const { layout } = hybridLayout(m, params());
    expect(layout.patches.length).toBe(0);
    expect(layout.contacts).toBe(0);
    const res = buildHybrid(m, params());
    expect(connectedComponents(res.positions.length / 3, res.indices)).toBe(2);
    const { max } = offAxes(res.positions, res.center, 1.3, 2, 28);
    // The rings stand outside the circle by as much as their chords pass inside.
    expect(max).toBeLessThan(0.5 + 0.03);
  });

  it("are welded where they touch, in one patch that ends where they are out of each other's reach", () => {
    const m = parseSwc(crossing(-0.2));
    const { layout } = hybridLayout(m, params());
    expect(layout.contacts).toBe(1);
    expect(layout.patches.length).toBe(1);
    expect(layout.patches[0].pieces.length).toBe(2);
    for (const piece of layout.patches[0].pieces) {
      expect(15 - piece.s0).toBeGreaterThan(1.9);
      expect(15 - piece.s0).toBeLessThan(6);
      expect(piece.s1 - 15).toBeGreaterThan(1.9);
      expect(piece.s1 - 15).toBeLessThan(6);
    }
    const res = buildHybrid(m, params());
    const c = checkMesh(res.positions, res.indices);
    expect(c.closed).toBe(true);
    expect(c.manifold).toBe(true);
    expect(connectedComponents(res.positions.length / 3, res.indices)).toBe(1);
    expect(res.stats.hybrid!.contacts).toBe(1);
    // Welded as the sum of the kernels welds: the surface stands off both fibres in the corners of the cross.
    const sampler = new FieldSampler(
      planPrimitives(collectPrimitives(m, params()), params(), [0, 0, 0], { maxSlabs: 1 }).jobs[0]
    );
    sampler.sample(0.62, 0.62, 0.4);
    expect(sampler.value).toBeLessThan(1);
    let filleted = false;
    for (let v = 0; v < res.positions.length && !filleted; v += 3) {
      const x = res.positions[v] + res.center[0],
        y = res.positions[v + 1] + res.center[1],
        z = res.positions[v + 2] + res.center[2];
      filleted =
        Math.abs(x) < 1 &&
        Math.abs(y) < 1 &&
        Math.hypot(y, z) > 0.6 &&
        Math.hypot(x, z - 0.8) > 0.6 &&
        z > 0 &&
        z < 0.8;
    }
    expect(filleted).toBe(true);
  });

  it('pass each other by more than a voxel without a patch', () => {
    const m = parseSwc(crossing(0.15));
    const { layout } = hybridLayout(m, params());
    expect(layout.contacts).toBe(0);
    expect(layout.patches.length).toBe(0);
  });
});

describe('the field of a fork', () => {
  it("is the sum of its sections' kernels within the star, and each shaft's own beyond it", () => {
    const m = parseSwc(FORK);
    const prims = collectPrimitives(m, params());
    const plain = prims.map(({ ends: _ends, ...P }) => P);
    const families = new FieldSampler(
      planPrimitives(prims, params(), [0, 0, 0], { maxSlabs: 1 }).jobs[0]
    );
    const sum = new FieldSampler(
      planPrimitives(plain, params(), [0, 0, 0], { maxSlabs: 1 }).jobs[0]
    );
    // Around the fork, on and off the surface: nothing has changed.
    let compared = 0;
    for (let x = 17; x <= 23; x += 0.37) {
      for (let y = -2; y <= 2; y += 0.41) {
        for (let z = -1; z <= 1; z += 0.5) {
          families.sample(x, y, z);
          sum.sample(x, y, z);
          expect(families.value).toBeCloseTo(sum.value, 12);
          if (sum.value > 0) compared++;
        }
      }
    }
    expect(compared).toBeGreaterThan(300);
    // Far along a branch the other branch is out of reach, and the two fields are the branch's kernel alike.
    families.sample(40, 11.55 + 0.6, 0);
    sum.sample(40, 11.55 + 0.6, 0);
    expect(families.value).toBeGreaterThan(0.3);
    expect(families.value).toBeCloseTo(sum.value, 12);
  });

  it('shades a tapering section across the end of a star as across any skeleton point', () => {
    // A stem that tapers at 0.05 from a fork. Where the star ends, the section is cut in two for the field; the
    // normal must not show it.
    const swc = `
      1 3 0 0 0 1.5 -1
      2 3 20 0 0 1.5 1
      3 3 60 0 0 0.5 2
      4 3 40 30 0 0.4 2
    `;
    const prims = collectPrimitives(parseSwc(swc), params());
    const kin = kinship(prims, band, margin);
    // The tapering branch is the one along x; its star ends well inside it.
    const branch = prims.findIndex((P) => P.segs[4] === 60);
    const cut = kin.bounds[branch][1];
    expect(cut).toBeGreaterThan(3);
    expect(cut).toBeLessThan(30);
    const sampler = new FieldSampler(
      planPrimitives(prims, params(), [0, 0, 0], { maxSlabs: 1 }).jobs[0]
    );
    let last: number[] | null = null,
      worst = 0;
    // Along the top of the branch, on the side away from the other one, through the cut.
    for (let x = 20 + cut - 1; x <= 20 + cut + 1; x += 0.01) {
      let lo = 0,
        hi = 3;
      for (let i = 0; i < 50; i++) {
        const z = 0.5 * (lo + hi);
        sampler.sample(x, -0.3, z);
        if (sampler.value > 1) lo = z;
        else hi = z;
      }
      expect(sampler.shade(x, -0.3, 0.5 * (lo + hi))).toBe(true);
      const n = [sampler.nx, sampler.ny, sampler.nz];
      if (last !== null)
        worst = Math.max(worst, degrees(n[0] * last[0] + n[1] * last[1] + n[2] * last[2]));
      last = n;
    }
    // The cone's normal leans by atan 0.025 = 1.4° all along; a sphere at the cut would turn it by that much at once.
    expect(worst).toBeLessThan(0.2);
  });
});
