import type { PackBoxes } from '@/features/circuit-viewer/morphologies/types';

export const TOLERANCES = [0.125, 0.25, 1];

/** Boxes 10 µm wide down -z, their middles at `depths`, each with `counts[level]` segments at a level of `TOLERANCES`. */
export function boxesAt(depths: number[], counts = [100, 50, 10]): PackBoxes {
  return {
    boxes: new Float32Array(depths.flatMap((d) => [-5, -5, -d - 5, 5, 5, -d + 5])),
    levels: TOLERANCES.map((toleranceUm, level) => ({
      toleranceUm,
      pruneUm: 0,
      segments: new Uint32Array(depths.length).fill(counts[level]),
    })),
  };
}
