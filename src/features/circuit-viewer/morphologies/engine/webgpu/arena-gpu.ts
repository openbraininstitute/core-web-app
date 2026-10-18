import { texture, uniform } from 'three/tsl';
import * as THREE from 'three/webgpu';

import { BLOCK } from '../segment-arena';
import { scoped } from './error-scope';
import { shareBuffer } from './three-hooks';
import { COPY_DST, COPY_SRC, STORAGE } from './usage';

import type { ArenaUploads } from '../segment-arena';

/** A texel of no depth drawn, until the culling has drawn its own. */
const NOTHING_DRAWN = new THREE.DataTexture(
  new Float32Array([Infinity]),
  1,
  1,
  THREE.RedFormat,
  THREE.FloatType
);
NOTHING_DRAWN.needsUpdate = true;

/**
 * What an arena's materials read and how: its segments' ends, two `vec4`s each, their cell-and-type words, and the
 * culling's lists; where the arena ends, how many segments it and each list hold, whether it is culled, through the
 * lists (`listed`, 1), and the farthest depth drawn before the culling's tests, in µm from the eye.
 */
export function arenaStorage() {
  return {
    ends: new THREE.StorageBufferAttribute(new Float32Array(4), 4),
    words: new THREE.StorageBufferAttribute(new Uint32Array(4), 1),
    lists: new THREE.StorageBufferAttribute(new Uint32Array(4), 1),
    end: uniform(0, 'uint'),
    capacity: uniform(0, 'uint'),
    listed: uniform(0, 'uint'),
    farthest: texture(NOTHING_DRAWN),
  };
}

export type ArenaStorage = ReturnType<typeof arenaStorage>;

/** An arena's buffers on the GPU, as the culling reads and fills them. */
export interface ArenaBuffers {
  ends: GPUBuffer;
  words: GPUBuffer;
  blocks: GPUBuffer;
  /** The kept, then the seen: in each, the flat segments from its start and the tubes back from its end. */
  lists: GPUBuffer;
  /** The blocks that pass their test. */
  passed: GPUBuffer;
  /** A bit a block, set where a segment of it is kept. */
  marked: GPUBuffer;
}

/**
 * An arena's arrays `ends`, `words` and `blocks` in buffers of the page's on `device`, which three binds for `storage`,
 * with the culling's lists: what changes written to them, and no copy kept by three. `told` is handed the buffers, and
 * null once they are let go of; `outOfMemory`, told a moment later where the device could not make them.
 */
export function arenaOnGpu(
  renderer: THREE.WebGPURenderer,
  device: GPUDevice,
  storage: ArenaStorage,
  arrays: { ends: Float32Array; words: Uint32Array; blocks: Float32Array },
  told: (buffers: ArenaBuffers | null) => void,
  outOfMemory: () => void
): ArenaUploads {
  const { ends, words, blocks } = arrays;
  const capacity = words.length;
  // A binding holds something.
  const bufferOf = (bytes: number, label: string, usage = STORAGE | COPY_DST) =>
    device.createBuffer({ label, size: Math.max(bytes, 32), usage });
  const buffers = scoped(
    device,
    'out-of-memory',
    (): ArenaBuffers => ({
      ends: bufferOf(ends.byteLength, 'arena ends'),
      words: bufferOf(words.byteLength, 'arena words'),
      blocks: bufferOf(blocks.byteLength, 'arena blocks'),
      lists: bufferOf(2 * 4 * capacity, 'arena lists', STORAGE),
      passed: bufferOf((4 * capacity) / BLOCK, 'arena blocks passed', STORAGE),
      marked: bufferOf(
        4 * Math.ceil(capacity / BLOCK / 32),
        'arena blocks marked',
        STORAGE | COPY_DST | COPY_SRC
      ),
    }),
    outOfMemory
  );
  shareBuffer(renderer, storage.ends, buffers.ends);
  shareBuffer(renderer, storage.words, buffers.words);
  shareBuffer(renderer, storage.lists, buffers.lists);
  storage.capacity.value = capacity;
  told(buffers);
  return {
    upload(start, count, wordsOnly) {
      if (!wordsOnly)
        device.queue.writeBuffer(buffers.ends, 32 * start, ends, 8 * start, 8 * count);
      device.queue.writeBuffer(buffers.words, 4 * start, words, start, count);
      const first = Math.floor(start / BLOCK);
      const last = Math.ceil((start + count) / BLOCK);
      device.queue.writeBuffer(buffers.blocks, 32 * first, blocks, 8 * first, 8 * (last - first));
    },
    dispose() {
      told(null);
      for (const buffer of Object.values(buffers)) buffer.destroy();
    },
  };
}
