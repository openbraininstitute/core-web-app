import * as Comlink from 'comlink';

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
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import type { ConnectivityMatrix } from '@/features/circuit-nodes/connectivity/connectivity-h5';
import type { DownloadProgress } from '@/features/circuit-nodes/types';

/** Matrices kept between sessions, apart from the circuits' own files. */
const CONNECTIVITY_H5_CACHE = 'obi-connectivity-h5-v1';

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

  /** The matrix's rows as asked for: of the neurons whose node ids are `cells`, where given. */
  async group(
    request: ConnectivityRequest,
    cells: Uint32Array | null = null
  ): Promise<ConnectivityGroups> {
    if (!matrix) throw new Error('No connectivity matrix open; call open() first');
    const groups = groupConnectivity(matrix, request, cells);
    const buffers = [
      groups.sizes,
      groups.connections,
      groups.synapses,
      groups.nodeIds,
      groups.members.offsets,
      groups.members.nodeIds,
    ].flatMap((array) => (array ? [array.buffer as ArrayBuffer] : []));
    return Comlink.transfer(groups, buffers);
  },
};

export type ConnectivityWorkerApi = typeof api;

Comlink.expose(api);
