import * as Comlink from 'comlink';

import { CONNECTIVITY_H5_CACHE } from '@/features/circuit-nodes/connectivity/cache-name';
import {
  countConnectivity,
  includedNeurons,
  layOutConnectivity,
  summarizeConnectivity,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import { readConnectivityMatrix } from '@/features/circuit-nodes/connectivity/connectivity-h5';
import { fetchToFS, unlinkFromFS } from '@/utils/h5/fs';

import type {
  ConnectivityGroups,
  ConnectivityLayout,
  ConnectivityRequest,
  ConnectivitySummary,
  NodeProperty,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import type { ConnectivityMatrix } from '@/features/circuit-nodes/connectivity/connectivity-h5';
import type { DownloadProgress } from '@/features/circuit-nodes/types';

let matrix: ConnectivityMatrix | null = null;

// What the page has handed over to ask by: selections, as a flag per neuron, and properties
// from outside the matrix, each under the id it was given.
const selections = new Map<number, Uint8Array>();
const properties = new Map<number, NodeProperty>();

/** The layouts last asked for, so that a zoom or pan of one only counts its connections. */
const layouts = new Map<string, ConnectivityLayout>();
const LAYOUTS_KEPT = 4;

function held<T>(from: Map<number, T>, id: number): T {
  const value = from.get(id);
  if (value === undefined) throw new Error(`Nothing was handed over as ${id}`);
  return value;
}

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

  /** Takes a selection, node ids, to ask by under `id`. */
  async holdCells(id: number, cells: Uint32Array): Promise<void> {
    if (!matrix) throw new Error('No connectivity matrix open; call open() first');
    selections.set(id, includedNeurons(matrix, cells));
  },

  /** Takes a property from outside the matrix to ask by under `id`. */
  async holdProperty(id: number, property: NodeProperty): Promise<void> {
    properties.set(id, property);
  },

  async forget(ids: number[]): Promise<void> {
    for (const id of ids) {
      selections.delete(id);
      properties.delete(id);
    }
  },

  /**
   * The matrix's rows as asked for: of the neurons of the selection handed over as
   * `cellsId`, where given, and by the properties handed over as `propertyIds` besides
   * the matrix's own.
   */
  async group(
    request: ConnectivityRequest,
    cellsId: number | null = null,
    propertyIds: number[] = []
  ): Promise<ConnectivityGroups> {
    if (!matrix) throw new Error('No connectivity matrix open; call open() first');
    const { window: _window, maxRows: _maxRows, ...laidOut } = request;
    const key = `${JSON.stringify(laidOut)}/${cellsId}/${propertyIds.join(',')}`;
    let layout = layouts.get(key);
    layouts.delete(key);
    layout ??= layOutConnectivity(
      matrix,
      request,
      cellsId === null ? null : held(selections, cellsId),
      propertyIds.map((id) => held(properties, id))
    );
    layouts.set(key, layout);
    if (layouts.size > LAYOUTS_KEPT) layouts.delete(layouts.keys().next().value as string);
    const groups = countConnectivity(matrix, layout, request);
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
