import * as Comlink from 'comlink';
import { File } from 'h5wasm';

import { fetchToFS, unlinkFromFS } from '@/utils/h5/fs';

import { buffersOf, readSpiny } from './read-spiny';

import type { SpinyData, SpinyProgress } from './types';

/** Where spiny H5s are kept between visits. */
const SPINY_H5_CACHE = 'spiny-morphology-h5';

const api = {
  /**
   * Download the spiny H5 straight into h5wasm's file system (or take it from the cache), read all of it, and hand the
   * arrays over. The file is let go of once read.
   */
  async load(
    request: { url: string; headers: Record<string, string>; fileKey: string },
    onProgress: (p: SpinyProgress) => void
  ): Promise<SpinyData> {
    const { filename } = await fetchToFS({
      url: request.url,
      headers: request.headers,
      fileKey: request.fileKey,
      cacheName: SPINY_H5_CACHE,
      onProgress: ({ received, total }) => onProgress({ stage: 'download', done: received, total }),
    });
    onProgress({ stage: 'open', done: 0, total: null });
    let file: File | null = null;
    try {
      file = new File(filename, 'r');
      const data = readSpiny(file, onProgress);
      onProgress({ stage: 'done', done: data.counts.spines, total: data.counts.spines });
      return Comlink.transfer(data, buffersOf(data));
    } finally {
      file?.close();
      await unlinkFromFS(filename);
    }
  },
};

export type SpinyWorkerApi = typeof api;

Comlink.expose(api);
