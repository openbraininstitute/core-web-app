// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import { DetailStream } from '@/features/circuit-viewer/morphologies/engine/detail-stream';
import {
  CELL_MASK,
  HOLE,
  TYPE_SHIFT,
} from '@/features/circuit-viewer/morphologies/engine/impostors';
import { BLOCK, SegmentArena } from '@/features/circuit-viewer/morphologies/engine/segment-arena';

import type { DetailView } from '@/features/circuit-viewer/morphologies/engine/detail';
import type { MorphologyChunks } from '@/features/circuit-viewer/morphologies/types';

vi.mock('@/utils/logger', () => ({ logError: vi.fn() }));

describe('DetailStream, over a long run of views', () => {
  it('keeps the arena whole: each box drawn at one level from the start of a block, its segments all there', async () => {
    let seed = 11;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    // An 8 by 8 grid of boxes 10 µm wide, each with fewer segments at each coarser level.
    const side = 8;
    const count = side * side;
    const boxes = new Float32Array(6 * count);
    for (let b = 0; b < count; b++) {
      const x = 10 * (b % side) - 40;
      const y = 10 * Math.floor(b / side) - 40;
      boxes.set([x, y, -5, x + 10, y + 10, 5], 6 * b);
    }
    const finest = Uint32Array.from({ length: count }, () => Math.floor(random() * 400));
    const levels = [1, 0.5, 0.1].map((share, level) => ({
      toleranceUm: [0.125, 0.25, 1][level],
      pruneUm: 0,
      segments: Uint32Array.from(finest, (n) => Math.floor(n * share)),
    }));
    const cellOf = (box: number, level: number) => 10 * box + level;
    const chunks: MorphologyChunks = {
      boxes,
      levels,
      read: async (wanted) =>
        wanted.map(({ level, box }) => {
          const n = levels[level].segments[box];
          return {
            segments: new Float32Array(8 * n),
            segmentCells: new Uint32Array(n).fill(cellOf(box, level)),
            segmentTypes: new Uint8Array(n),
          };
        }),
    };
    const geometry = new THREE.InstancedBufferGeometry();
    const arena = new SegmentArena(geometry, 20_000);
    const stream = new DetailStream(chunks, arena, () => {});

    for (let step = 0; step < 400; step++) {
      // From 3 to 300 µm either side, somewhere over the grid.
      const half = 3 * 100 ** random();
      const camera = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 1e6);
      camera.position.set(80 * random() - 40, 80 * random() - 40, 100);
      camera.updateMatrixWorld();
      const view: DetailView = {
        projection: camera.projectionMatrix,
        view: camera.matrixWorldInverse,
        orthographic: true,
        height: 1000,
        focus: new THREE.Vector3(camera.position.x, camera.position.y, 0),
        shift: new THREE.Vector3(),
      };
      const budget = random() < 0.2 ? 1000 + Math.floor(random() * 5000) : Infinity;
      stream.update(view, { budget, pixels: 2, culling: true }, random() < 0.6);
      await new Promise((resolve) => setTimeout(resolve, 0));
      for (let turn = 0; turn < 3; turn++) stream.apply(1 + Math.floor(random() * 3000));

      // Every segment drawn is of one level of its box, and each box drawn is whole.
      const words = geometry.getAttribute('aCell').array as Uint32Array;
      const drawn = new Map<number, { level: number; n: number }>();
      for (let i = 0; i < geometry.instanceCount; i++) {
        if (words[i] >>> TYPE_SHIFT === HOLE) continue;
        const cell = words[i] & CELL_MASK;
        const box = Math.floor(cell / 10);
        const level = cell % 10;
        const was = drawn.get(box);
        if (was) expect(was.level).toBe(level);
        else expect(i % BLOCK).toBe(0);
        drawn.set(box, { level, n: (was?.n ?? 0) + 1 });
      }
      for (const [box, { level, n }] of drawn) {
        expect(n).toBe(levels[level].segments[box]);
        expect(arena.sizeOf(box)).toBe(n);
      }
    }
  });
});
