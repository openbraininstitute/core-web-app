import * as Comlink from 'comlink';

import { CONNECTIVITY_H5_CACHE } from '@/features/circuit-nodes/connectivity/cache-name';
import {
  groupConnectivity,
  summarizeConnectivity,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import { readConnectivityMatrix } from '@/features/circuit-nodes/connectivity/connectivity-h5';
import { fetchToFS, unlinkFromFS } from '@/utils/h5/fs';

import type {
  ConnectivityGroups,
  ConnectivityRequest,
  ConnectivitySummary,
  NodeProperty,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import type { ConnectivityMatrix } from '@/features/circuit-nodes/connectivity/connectivity-h5';
import type { DownloadProgress } from '@/features/circuit-nodes/types';

let matrix: ConnectivityMatrix | null = null;

const api = {
  async open(
    request: { url: string; headers: Record<string, string>; fileKey: string },
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<ConnectivitySummary> {
    const { filename } = await fetchToFS({
      ...request,
      cacheName: CONNECTIVITY_H5_CACHE,
      onProgress,
    });
    // Read whole, then the file let go: the arrays are a fraction of its size.
    try {
      matrix = readConnectivityMatrix(filename);
    } finally {
      await unlinkFromFS(filename);
    }
    return summarizeConnectivity(matrix);
  },

  /**
   * The matrix's rows as asked for: of the neurons whose node ids are `cells`, where
   * given, and by `outside`'s properties besides the matrix's own.
   */
  async group(
    request: ConnectivityRequest,
    cells: Uint32Array | null = null,
    outside: NodeProperty[] = []
  ): Promise<ConnectivityGroups> {
    if (!matrix) throw new Error('No connectivity matrix open; call open() first');
    const groups = groupConnectivity(matrix, request, cells, outside);
    // A set: grouped by a property, the two sides are one, and a buffer goes over only once.
    const buffers = new Set(
      [
        groups.connections,
        groups.synapses,
        groups.neuronsBefore,
        ...[groups.pre, groups.post].flatMap((side) => [
          side.sizes,
          side.members.offsets,
          side.members.nodeIds,
        ]),
      ].flatMap((array) => (array ? [array.buffer as ArrayBuffer] : []))
    );
    return Comlink.transfer(groups, [...buffers]);
  },
};

export type ConnectivityWorkerApi = typeof api;

Comlink.expose(api);
