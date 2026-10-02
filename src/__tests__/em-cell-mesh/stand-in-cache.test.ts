// @vitest-environment node
import { MeshoptSimplifier } from 'meshoptimizer';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { STAND_IN_CACHE } from '@/features/entities/em-cell-mesh/viewer/engine/asset-cache';
import { makeStandIn } from '@/features/entities/em-cell-mesh/viewer/engine/stand-in';
import {
  decodeStandIn,
  encodeStandIn,
  readStandIn,
  STAND_IN_VERSION,
  standInKey,
  storeStandIn,
} from '@/features/entities/em-cell-mesh/viewer/engine/stand-in-cache';

import { FakeCacheStorage } from './fake-caches';
import { torus } from './mesh-fixtures';

import type { StandIn } from '@/features/entities/em-cell-mesh/viewer/engine/types';

const URL_A = 'https://entitycore.test/em-cell-mesh/1/assets/a/download?asset_path=mesh.glb';
let standIn: StandIn;

beforeAll(async () => {
  await MeshoptSimplifier.ready;
  const { positions, indices } = torus(200, 100, { centre: [0, 0, 0] });
  standIn = makeStandIn(
    {
      positions: positions.map((v) => v / 1000),
      grid: null,
      indices,
      bounds: { min: [-49, -49, -9], max: [49, 49, 9] },
      dracoBits: null,
    },
    MeshoptSimplifier,
    5000
  ).standIn;
});

beforeEach(() => {
  vi.stubGlobal('caches', new FakeCacheStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the stand-in cache', () => {
  it('gives back the stand-in as it was packed', () => {
    const back = decodeStandIn(encodeStandIn(standIn));
    expect(back).toEqual(standIn);
  });

  it('misses a stand-in made by another version of the pipeline', () => {
    const buffer = encodeStandIn(standIn);
    const length = new DataView(buffer).getUint32(0, true);
    const json = new TextDecoder().decode(new Uint8Array(buffer, 4, length));
    const other = new TextEncoder().encode(json.replace(STAND_IN_VERSION, 'older-pipeline'));
    const copy = new Uint8Array(buffer.byteLength);
    copy.set(new Uint8Array(buffer));
    copy.set(other, 4);
    new DataView(copy.buffer).setUint32(0, other.byteLength, true);
    expect(decodeStandIn(copy.buffer)).toBeNull();
    expect(standInKey(URL_A, 5000)).toContain(encodeURIComponent(STAND_IN_VERSION));
    expect(standInKey(URL_A, 5000)).toContain('asset_path=mesh.glb');
  });

  it('stores a stand-in in its own bucket, and reads it back', async () => {
    expect(await readStandIn(URL_A, 5000)).toBeNull();
    expect(await storeStandIn(URL_A, 5000, encodeStandIn(standIn))).toBe(true);
    expect((caches as unknown as FakeCacheStorage).buckets.has(STAND_IN_CACHE.name)).toBe(true);
    expect(await readStandIn(URL_A, 5000)).toEqual(standIn);
  });

  it('keeps a stand-in of each size apart', async () => {
    await storeStandIn(URL_A, 5000, encodeStandIn(standIn));
    expect(await readStandIn(URL_A, 10_000)).toBeNull();
  });
});
