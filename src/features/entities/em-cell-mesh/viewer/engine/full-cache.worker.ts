/** Keeps the full mesh in its cache as it goes up to the GPU, and reads it back; terminated after. */
import * as Comlink from 'comlink';

import { FULL_CACHE } from './full-cache';
import { createFullCacheApi } from './worker-apis';

Comlink.expose(
  createFullCacheApi(
    async () => {
      const { MeshoptEncoder } = await import('meshoptimizer/encoder');
      await MeshoptEncoder.ready;
      return MeshoptEncoder;
    },
    async () => {
      const { MeshoptDecoder } = await import('meshoptimizer/decoder');
      await MeshoptDecoder.ready;
      return MeshoptDecoder;
    },
    FULL_CACHE
  )
);
