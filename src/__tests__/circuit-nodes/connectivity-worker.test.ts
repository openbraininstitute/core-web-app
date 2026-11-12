import { beforeAll, describe, expect, it, vi } from 'vitest';

import { groupConnectivity } from '@/features/circuit-nodes/connectivity/connectivity-groups';

import type { ConnectivityWorkerApi } from '@/features/circuit-nodes/connectivity/connectivity.worker';
import type { NodeProperty } from '@/features/circuit-nodes/connectivity/connectivity-groups';
import type { ConnectivityMatrix } from '@/features/circuit-nodes/connectivity/connectivity-h5';

const exposed = vi.hoisted(() => ({ api: null as unknown }));

vi.mock('comlink', () => ({
  expose: (api: unknown) => {
    exposed.api = api;
  },
  transfer: (value: unknown) => value,
}));
vi.mock('@/utils/h5/fs', () => ({
  fetchToFS: async () => ({ filename: 'matrix.h5' }),
  unlinkFromFS: async () => {},
}));
vi.mock('@/features/circuit-nodes/connectivity/connectivity-h5', () => ({
  readConnectivityMatrix: () => MATRIX,
}));

/** Six neurons, node ids 0 to 5, each connected to the next, and the last to the first. */
const MATRIX: ConnectivityMatrix = {
  size: 6,
  nodeIds: Float64Array.from([0, 1, 2, 3, 4, 5]),
  properties: [
    {
      name: 'mtype',
      kind: 'categorical',
      library: ['PC', 'MC'],
      codes: Int32Array.from([0, 1, 0, 1, 0, 1]),
    },
  ],
  pre: Uint32Array.from([0, 1, 2, 3, 4, 5]),
  post: Uint32Array.from([1, 2, 3, 4, 5, 0]),
  synapses: Float32Array.from([1, 2, 3, 4, 5, 6]),
};
const LAYER: NodeProperty = {
  name: 'layer',
  library: ['L1', 'L2', 'L3'],
  codes: Int32Array.from([0, 0, 1, 1, 2, 2]),
};
const DEPTH: NodeProperty = { ...LAYER, codes: Int32Array.from([2, 1, 0, 2, 1, 0]) };

let worker: ConnectivityWorkerApi;

beforeAll(async () => {
  await import('@/features/circuit-nodes/connectivity/connectivity.worker');
  worker = exposed.api as ConnectivityWorkerApi;
  await worker.open({ url: 'https://matrix', headers: {}, fileKey: 'matrix' });
});

describe('the connectivity worker', () => {
  it('answers by what it was handed, as the grouping does from scratch', async () => {
    const some = Uint32Array.from([0, 1, 2, 3]);
    const others = Uint32Array.from([2, 3, 4, 5]);
    await worker.holdCells(1, some);
    await worker.holdCells(2, others);
    await worker.holdProperty(3, LAYER);
    await worker.holdProperty(4, DEPTH);
    const byLayer = { by: 'property', property: 'layer' } as const;
    const byMtype = { by: 'neuron', orderBy: 'mtype' } as const;
    const side = { start: 0, end: 2, step: 1 };
    // Each asked twice over, and in turn, so that an answer kept for one is never another's.
    for (let round = 0; round < 2; round++) {
      expect(await worker.group(byLayer, 1, [3])).toEqual(
        groupConnectivity(MATRIX, byLayer, some, [LAYER])
      );
      expect(await worker.group(byLayer, 2, [3])).toEqual(
        groupConnectivity(MATRIX, byLayer, others, [LAYER])
      );
      expect(await worker.group(byLayer, 2, [4])).toEqual(
        groupConnectivity(MATRIX, byLayer, others, [DEPTH])
      );
      expect(await worker.group(byLayer, null, [3])).toEqual(
        groupConnectivity(MATRIX, byLayer, null, [LAYER])
      );
      expect(await worker.group(byMtype, 1)).toEqual(groupConnectivity(MATRIX, byMtype, some));
      const zoomed = { ...byMtype, window: { pre: side, post: side } };
      expect(await worker.group(zoomed, 1)).toEqual(groupConnectivity(MATRIX, zoomed, some));
      expect(await worker.group(byMtype, 2)).toEqual(groupConnectivity(MATRIX, byMtype, others));
    }
  });

  it('fails a request by what it was never handed, or has forgotten', async () => {
    const request = { by: 'neuron', orderBy: null } as const;
    await expect(worker.group(request, 77)).rejects.toThrow('Nothing was handed over as 77');
    await worker.holdCells(10, Uint32Array.from([0, 1]));
    await worker.forget([10]);
    await expect(worker.group({ ...request, orderBy: 'mtype' }, 10)).rejects.toThrow(
      'Nothing was handed over as 10'
    );
    await expect(worker.group({ by: 'property', property: 'layer' }, null, [78])).rejects.toThrow(
      'Nothing was handed over as 78'
    );
  });
});
