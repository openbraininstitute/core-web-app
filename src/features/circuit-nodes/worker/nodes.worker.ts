import * as Comlink from 'comlink';

import { CIRCUIT_H5_CACHE } from '@/features/circuit-nodes/types';
import { NodesSession } from '@/features/circuit-nodes/worker/nodes-h5';
import { fetchToFS, unlinkFromFS } from '@/utils/h5/fs';

import type {
  ColumnValues,
  DownloadProgress,
  GetRowsRequest,
  GetRowsResponse,
  NodeGeometry,
  NodeGeometryOptions,
  OpenRequest,
  OpenResponse,
} from '@/features/circuit-nodes/types';

let session: NodesSession | null = null;

const api = {
  async open(
    opts: OpenRequest,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<OpenResponse> {
    if (session) {
      session.close();
      await unlinkFromFS(session.filename);
      session = null;
    }
    const { filename } = await fetchToFS({
      url: opts.url,
      headers: opts.headers,
      fileKey: opts.fileKey,
      cacheName: CIRCUIT_H5_CACHE,
      onProgress,
    });
    session = new NodesSession(filename, opts.populationKey);
    return { rowCount: session.rowCount, columns: session.columns };
  },

  async getRows(req: GetRowsRequest): Promise<GetRowsResponse> {
    if (!session) throw new Error('NodesSession not initialized; call open() first');
    return session.getRows(req);
  },

  async getColumn(name: string): Promise<ColumnValues> {
    if (!session) throw new Error('NodesSession not initialized; call open() first');
    const column = session.getColumnValues(name);
    // Transferred, not cloned, like `getGeometry` — and for a categorical
    // column the payload is its library plus one Uint32 per node, never a
    // string per node. `getColumnValues` hands back fresh arrays, so
    // detaching them cannot touch the session's column cache.
    if (column.kind === 'categorical') {
      return Comlink.transfer(column, [column.indices.buffer as ArrayBuffer]);
    }
    if (column.kind === 'numeric') {
      return Comlink.transfer(column, [column.values.buffer as ArrayBuffer]);
    }
    return column;
  },

  async getGeometry(options?: NodeGeometryOptions): Promise<NodeGeometry> {
    if (!session) throw new Error('NodesSession not initialized; call open() first');
    const geometry = session.getGeometry(options);
    // Transferred, not cloned: at region scale these arrays are tens of
    // megabytes. Detaching them here is safe because `getGeometry` packs fresh
    // arrays on every call rather than handing out a cached one.
    const buffers: ArrayBuffer[] = [geometry.positions.buffer as ArrayBuffer];
    if (geometry.orientations) buffers.push(geometry.orientations.buffer as ArrayBuffer);
    return Comlink.transfer(geometry, buffers);
  },

  async close(): Promise<void> {
    if (!session) return;
    const fname = session.filename;
    session.close();
    session = null;
    await unlinkFromFS(fname);
  },
};

export type NodesWorkerApi = typeof api;

Comlink.expose(api);
