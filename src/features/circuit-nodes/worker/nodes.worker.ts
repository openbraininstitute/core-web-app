import * as Comlink from 'comlink';

import { CIRCUIT_H5_CACHE } from '@/features/circuit-nodes/types';
import { NodesSession } from '@/features/circuit-nodes/worker/nodes-h5';
import { fetchToFS, unlinkFromFS } from '@/utils/h5/fs';

import type {
  ColumnKind,
  DownloadProgress,
  GetRowsRequest,
  GetRowsResponse,
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

  async getColumn(name: string): Promise<{ kind: ColumnKind; values: (string | number)[] }> {
    if (!session) throw new Error('NodesSession not initialized; call open() first');
    return session.getColumnValues(name);
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
