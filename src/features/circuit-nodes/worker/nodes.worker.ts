import * as Comlink from 'comlink';

import { fetchToFS, unlinkFromFS } from '@/features/circuit-nodes/worker/fetch-and-cache';
import { NodesSession } from '@/features/circuit-nodes/worker/nodes-h5';

import type {
  GetRowsRequest,
  GetRowsResponse,
  OpenRequest,
  OpenResponse,
} from '@/features/circuit-nodes/types';

let session: NodesSession | null = null;

const api = {
  async open(
    opts: OpenRequest,
    onProgress?: (received: number, total: number | null) => void
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
      onProgress,
    });
    session = new NodesSession(filename, opts.populationKey);
    return { rowCount: session.rowCount, columns: session.columns };
  },

  async getRows(req: GetRowsRequest): Promise<GetRowsResponse> {
    if (!session) throw new Error('NodesSession not initialized; call open() first');
    return session.getRows(req);
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
