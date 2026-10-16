import * as THREE from 'three/webgpu';

import { shareBuffer } from './three-hooks';

import type { ArenaUploads } from '../segment-arena';

// GPUBufferUsage's bits. TypeScript's DOM library types WebGPU but leaves the object out.
const COPY_DST = 0x0008;
const STORAGE = 0x0080;

/** What an arena's materials read: its segments' ends, two `vec4`s each, and their cell-and-type words. */
export interface ArenaStorage {
  ends: THREE.StorageBufferAttribute;
  words: THREE.StorageBufferAttribute;
}

/** An arena's storage, bound to no buffer until `arenaOnGpu` gives it the page's. */
export function arenaStorage(): ArenaStorage {
  return {
    ends: new THREE.StorageBufferAttribute(new Float32Array(4), 4),
    words: new THREE.StorageBufferAttribute(new Uint32Array(4), 1),
  };
}

/**
 * An arena's arrays `ends` and `words` in buffers of the page's on `device`, which three binds for `storage`: what
 * changes written to them, and no copy kept by three.
 */
export function arenaOnGpu(
  renderer: THREE.WebGPURenderer,
  device: GPUDevice,
  storage: ArenaStorage,
  ends: Float32Array,
  words: Uint32Array
): ArenaUploads {
  const bufferOf = (array: Float32Array | Uint32Array, label: string) =>
    device.createBuffer({
      label,
      // A binding holds something.
      size: Math.max(array.byteLength, 32),
      usage: STORAGE | COPY_DST,
    });
  const endsBuffer = bufferOf(ends, 'arena ends');
  const wordsBuffer = bufferOf(words, 'arena words');
  shareBuffer(renderer, storage.ends, endsBuffer);
  shareBuffer(renderer, storage.words, wordsBuffer);
  return {
    upload(start, count, wordsOnly) {
      if (!wordsOnly) device.queue.writeBuffer(endsBuffer, 32 * start, ends, 8 * start, 8 * count);
      device.queue.writeBuffer(wordsBuffer, 4 * start, words, start, count);
    },
    dispose() {
      endsBuffer.destroy();
      wordsBuffer.destroy();
    },
  };
}
