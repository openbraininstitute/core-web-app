/** Works out how crowded each soma is, or the somas' Morton order, off the page; terminated after. */
import * as Comlink from 'comlink';

import { crowding } from './crowding';
import { type MortonSorted, mortonSorted } from './morton';

const api = {
  crowding(positions: Float32Array): Uint8Array | null {
    const bytes = crowding(positions);
    return bytes && Comlink.transfer(bytes, [bytes.buffer]);
  },
  mortonSorted(positions: Float32Array): MortonSorted {
    const ordered = mortonSorted(positions);
    return Comlink.transfer(ordered, [ordered.order.buffer, ordered.sorted.buffer]);
  },
};

export type CrowdingApi = typeof api;

Comlink.expose(api);
