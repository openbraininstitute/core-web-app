// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { kernel, smoothMin } from '@/features/entities/cell-morphology/morpho-viewer/engine/field';
import {
  type Binning,
  binSegments,
  SEG_BYTES,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/gpu-slab';
import {
  accumulateField,
  B,
  BS,
  BS3,
  planMesh,
  type SlabJob,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher';
import {
  parseSwc,
  SWC_APICAL,
  SWC_BASAL,
  SWC_SOMA,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';

import { BRANCHED, cell, params, sampleSwc } from './mesh-utils';

/**
 * What the field shader computes for block b, in double precision: per sample, the kernel of the closest segment of
 * every section in the block's list (for the soma, the segments folded by the smooth minimum), summed family by
 * family, and the largest of the sums, from the packed segment records.
 */
function gather(bins: Binning, b: number): Float64Array {
  const f = new Float32Array(bins.segs),
    i32 = new Int32Array(bins.segs),
    u32 = new Uint32Array(bins.segs);
  const out = new Float64Array(BS3);
  const [x0, y0, z0, first] = bins.blocks.subarray(4 * b, 4 * b + 4);
  const last = bins.blocks[4 * (b + 1) + 3];
  for (let lz = 0; lz < BS; lz++) {
    for (let ly = 0; ly < BS; ly++) {
      for (let lx = 0; lx < BS; lx++) {
        const gx = x0 + lx,
          gy = y0 + ly,
          gz = z0 + lz;
        let best = 0,
          sum = 0,
          section = -1,
          family = -1,
          uMin = Infinity;
        for (let n = first; n <= last; n++) {
          const o = n < last ? (bins.lists[n] * SEG_BYTES) / 4 : -1;
          const next = o < 0 ? -2 : u32[o + 19] >>> 8;
          if (next !== section) {
            if (uMin < 2) sum += kernel(uMin);
            uMin = Infinity;
            section = next;
            const nextFamily = o < 0 ? -2 : u32[o + 20];
            if (nextFamily !== family) {
              best = Math.max(best, sum);
              sum = 0;
              family = nextFamily;
            }
          }
          if (o < 0) break;
          if (gx < i32[o + 12] || gy < i32[o + 13] || gz < i32[o + 14]) continue;
          if (gx > i32[o + 16] || gy > i32[o + 17] || gz > i32[o + 18]) continue;
          const dx = gx - i32[o] - f[o + 4],
            dy = gy - i32[o + 1] - f[o + 5],
            dz = gz - i32[o + 2] - f[o + 6];
          const abx = f[o + 8],
            aby = f[o + 9],
            abz = f[o + 10];
          const t = Math.min(1, Math.max(0, (dx * abx + dy * aby + dz * abz) * f[o + 11]));
          const dist = Math.hypot(dx - abx * t, dy - aby * t, dz - abz * t);
          const r = f[o + 3] + f[o + 7] * t;
          const scale = Math.max(f[o + 15] * r, 1);
          if (!(dist < r + 2 * scale)) continue;
          const u = (dist - r) / scale;
          uMin = f[o + 21] > 0 ? smoothMin(uMin, u, f[o + 21]) : Math.min(uMin, u);
        }
        out[(lz * BS + ly) * BS + lx] = best;
      }
    }
  }
  return out;
}

/** The binned lists reproduce the CPU field of the job: same blocks wherever the field is not zero, same values. */
function expectSameField(job: SlabJob): { blocks: number; culled: number } {
  const bins = binSegments(job);
  const cpu = accumulateField(job).blocks;
  let worst = 0,
    culled = 0;
  for (const blk of cpu.values()) {
    const b = bins.find(blk.bx, blk.by, blk.bz);
    if (b < 0) {
      // A block the binning dropped must be one no segment reaches.
      culled++;
      expect(Math.max(...blk.acc)).toBe(0);
      continue;
    }
    const got = gather(bins, b);
    for (let i = 0; i < BS3; i++) worst = Math.max(worst, Math.abs(got[i] - blk.acc[i]));
  }
  // The records hold f32 values in voxel units; the CPU field works in f64 µm.
  expect(worst).toBeLessThan(1e-4);

  // No empty lists, every list in segment order, the slab's own blocks ahead of its halo.
  expect(bins.count + culled).toBe(cpu.size);
  for (let b = 0; b < bins.count; b++) {
    const first = bins.blocks[4 * b + 3],
      last = bins.blocks[4 * (b + 1) + 3];
    expect(last).toBeGreaterThan(first);
    for (let n = first + 1; n < last; n++) expect(bins.lists[n]).toBeGreaterThan(bins.lists[n - 1]);
    expect(bins.coords[3 * b + job.axis] >= job.a0).toBe(b < bins.ownedBlocks);
    expect(bins.blocks[4 * b + job.axis]).toBe(bins.coords[3 * b + job.axis] * B);
  }
  return { blocks: bins.count, culled };
}

describe('binSegments', () => {
  it('gives the shader the lists that reproduce the CPU field', () => {
    const plan = planMesh(parseSwc(BRANCHED), params(), { maxSlabs: 1 });
    const { blocks, culled } = expectSameField(plan.jobs[0]);
    expect(blocks).toBeGreaterThan(100);
    // The forked, oblique dendrites leave bounding-box corners that their bands do not reach.
    expect(culled).toBeGreaterThan(0);
  });

  it('does so for every slab of a split grid, halo included', () => {
    const plan = planMesh(parseSwc(BRANCHED), params(), { maxSlabs: 4, bandVoxelsPerSlab: 1e4 });
    expect(plan.slabs).toBeGreaterThan(1);
    for (const job of plan.jobs) expectSameField(job);
  });

  it('does so for a soma with necks, whose parts fold by the smooth minimum', () => {
    // Two stems close together, so that their necks cross, and a third far off.
    const necked = parseSwc(
      cell([
        { d: 8, r: 2 },
        { d: 9, r: 1.5, dir: [0.8, 0.6, 0] },
        { d: 12, r: 1, dir: [0, 0, 1] },
      ])
    );
    const plan = planMesh(necked, params({ somaBlend: 0.3 }), {
      maxSlabs: 2,
      bandVoxelsPerSlab: 1e5,
    });
    for (const job of plan.jobs) {
      const soma = job.primType.indexOf(SWC_SOMA);
      expect(job.primStart[soma + 1] - job.primStart[soma]).toBe(4);
      expectSameField(job);
    }
  });

  it("does so on the sample cell's dendrites", () => {
    const text = sampleSwc();
    const plan = planMesh(
      parseSwc(text),
      params({ voxel: 1, includeTypes: [SWC_BASAL, SWC_APICAL], minRadius: 1 }),
      {
        maxSlabs: 3,
        bandVoxelsPerSlab: 1e5,
      }
    );
    expect(plan.slabs).toBeGreaterThan(1);
    for (const job of plan.jobs) expectSameField(job);
  });
});
