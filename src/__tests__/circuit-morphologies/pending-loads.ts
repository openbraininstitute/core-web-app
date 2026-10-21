import { waitFor } from '@testing-library/react';
import { expect } from 'vitest';

import type { Loaded, LoadOptions } from '@/features/circuit-viewer/morphologies/load/load';
import type {
  CircuitMorphologyData,
  Population,
} from '@/features/circuit-viewer/morphologies/types';

/**
 * In place of the loader's module, as `vi.mock(path, () => import('./pending-loads'))`: every load waits for the test
 * to end it.
 */
export const loads: {
  options: LoadOptions;
  resolve(loaded: Loaded): void;
  reject(e: unknown): void;
}[] = [];

export const loadCircuitMorphologies = (options: LoadOptions) =>
  new Promise<Loaded>((resolve, reject) => {
    loads.push({ options, resolve, reject });
  });

/** The load started last, once `count` have been. */
export async function started(count = 1) {
  await waitFor(() => expect(loads).toHaveLength(count));
  return loads[count - 1];
}

/** A load that ended with `data`, the whole pack in once `whole` settles. */
export const loadedOf = (
  data: CircuitMorphologyData,
  fromCache = false,
  whole: Promise<void> = Promise.resolve()
) => ({ kind: 'loaded', data, fromCache, whole }) as const;

/** What the loader hands over: `somas` are four floats a cell, NaN where the pack has none of it. */
export function loadedData(
  populations: Population[],
  somas: number[],
  centre: [number, number, number] = [0, 0, 0]
): CircuitMorphologyData {
  return {
    segments: new Float32Array(0),
    segmentCells: new Uint32Array(0),
    segmentTypes: new Uint8Array(0),
    somas: Float32Array.from(somas),
    populations,
    centre,
    bounds: { min: [-5, -5, -5], max: [11, 5, 5] },
    level: { toleranceUm: 0.125, pruneUm: 0 },
  };
}
