/** Works out how crowded each soma is, off the page; terminated after. */
import * as Comlink from 'comlink';

import { crowding } from './crowding';

const api = {
  crowding(positions: Float32Array): Uint8Array | null {
    const bytes = crowding(positions);
    return bytes && Comlink.transfer(bytes, [bytes.buffer]);
  },
};

export type CrowdingApi = typeof api;

Comlink.expose(api);
