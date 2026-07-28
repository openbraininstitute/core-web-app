import * as Comlink from 'comlink';
import { File } from 'h5wasm';

import { parseSpikeData } from '@/features/spike-viewer/spike-trace';
import { writeToFS } from '@/utils/h5/fs';

import type { SpikeData } from '@/features/spike-viewer/spike-trace';

const api = {
  async parseSpikeFile(id: string, buffer: ArrayBuffer): Promise<SpikeData> {
    const { FS, filename } = await writeToFS(id, buffer);

    let file: File | null = null;
    try {
      file = new File(filename, 'r');
      const data = parseSpikeData(file);

      // Transfer Float32Array buffers back to main thread (zero-copy)
      const transferables: ArrayBuffer[] = [];
      for (const pop of data.populations) {
        const tsBuf = pop.timestamps.buffer as ArrayBuffer;
        const idBuf = pop.nodeIds.buffer as ArrayBuffer;
        transferables.push(tsBuf, idBuf);
      }

      return Comlink.transfer(data, transferables);
    } finally {
      file?.close();
      try {
        FS.unlink(filename);
      } catch {
        // ignore cleanup errors
      }
    }
  },
};

export type SpikeTraceWorkerApi = typeof api;

Comlink.expose(api);
