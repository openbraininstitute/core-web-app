import { storage as storageNode, texture, uniform } from 'three/tsl';
import * as THREE from 'three/webgpu';

import { PACKED_WORDS } from '../../load/packed-ends';
import { BLOCK } from '../segment-arena';
import { seenRoom } from './culling-wgsl';
import { scoped } from './error-scope';
import { shareBuffer } from './three-hooks';
import { COPY_DST, COPY_SRC, STORAGE } from './usage';

import type { ArenaArrays, ArenaUploads } from '../segment-arena';

/** A texel with no depth drawn, used until the culling has drawn its own. */
const NOTHING_DRAWN = new THREE.DataTexture(
  new Float32Array([Infinity]),
  1,
  1,
  THREE.RedFormat,
  THREE.FloatType
);
NOTHING_DRAWN.needsUpdate = true;

/** Any length will do: the arena's buffers are bound in place of these attributes' own. */
const wordsAttribute = () => new THREE.StorageBufferAttribute(new Uint32Array(4), 1);

/**
 * What an arena's materials read, and how: its segments' ends, packed (`packed-ends.ts`), with the pack's grid, µm,
 * and one over its radius steps in `packing`; their cell-and-type words, and the culling's lists; where the arena
 * ends; how many segments it and the kept list hold, and how many each part of the seen list (`seenRoom`); whether it
 * is drawn culled, through the lists (`listed` is 1); and the farthest depth drawn before the culling's tests, in µm
 * from the eye.
 */
export function arenaStorage() {
  return {
    ends: storageNode(wordsAttribute(), 'uint', 0).toReadOnly(),
    packing: uniform(new THREE.Vector2(1, 1)),
    words: storageNode(wordsAttribute(), 'uint', 0).toReadOnly(),
    lists: storageNode(wordsAttribute(), 'uint', 0).toReadOnly(),
    end: uniform(0, 'uint'),
    capacity: uniform(0, 'uint'),
    seenRoom: uniform(0, 'uint'),
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
  /**
   * The kept, as long as the arena, then the seen, twice `seenRoom` long: in each, the flat segments from its start and
   * the tubes back from its end.
   */
  lists: GPUBuffer;
  /** The blocks that pass their test. */
  passed: GPUBuffer;
  /** A bit a block, set where a segment of it is kept. */
  marked: GPUBuffer;
}

/**
 * Puts an arena's `arrays`, and the culling's lists, in buffers the page makes on `device`, which three binds for
 * `storage`. The arena's ends must be packed. Only what changes is written to them, and three keeps no copy. `told` is
 * handed the buffers, and null once they are let go of. `outOfMemory` is called a moment later if the device could not
 * make them, unless they were let go of first.
 */
export function arenaOnGpu(
  renderer: THREE.WebGPURenderer,
  device: GPUDevice,
  storage: ArenaStorage,
  arrays: ArenaArrays,
  told: (buffers: ArenaBuffers | null) => void,
  outOfMemory: () => void
): ArenaUploads {
  let { words, blocks } = arrays;
  const { packing } = arrays;
  if (!packing) throw new Error('an arena on the GPU holds its ends packed');
  const capacity = words.length;
  // A binding cannot be empty.
  const bufferOf = (bytes: number, label: string, usage = STORAGE | COPY_DST) =>
    device.createBuffer({ label, size: Math.max(bytes, 32), usage });
  let gone = false;
  const buffers = scoped(
    device,
    'out-of-memory',
    (): ArenaBuffers => ({
      ends: bufferOf(4 * PACKED_WORDS * capacity, 'arena ends'),
      words: bufferOf(words.byteLength, 'arena words'),
      blocks: bufferOf(blocks.byteLength, 'arena blocks'),
      lists: bufferOf(4 * (capacity + 2 * seenRoom(capacity)), 'arena lists', STORAGE),
      passed: bufferOf((4 * capacity) / BLOCK, 'arena blocks passed', STORAGE),
      marked: bufferOf(
        4 * Math.ceil(capacity / BLOCK / 32),
        'arena blocks marked',
        STORAGE | COPY_DST | COPY_SRC
      ),
    }),
    () => {
      if (!gone) outOfMemory();
    }
  );
  storage.ends.value = shareBuffer(renderer, wordsAttribute(), buffers.ends);
  storage.packing.value.set(packing.gridUm, 1 / packing.radiusSteps);
  storage.words.value = shareBuffer(renderer, wordsAttribute(), buffers.words);
  storage.lists.value = shareBuffer(renderer, wordsAttribute(), buffers.lists);
  storage.capacity.value = capacity;
  storage.seenRoom.value = seenRoom(capacity);
  told(buffers);
  return {
    upload(start, count, ends) {
      if (ends) device.queue.writeBuffer(buffers.ends, 4 * PACKED_WORDS * start, ends);
      device.queue.writeBuffer(buffers.words, 4 * start, words, start, count);
      const first = Math.floor(start / BLOCK);
      const last = Math.ceil((start + count) / BLOCK);
      device.queue.writeBuffer(buffers.blocks, 32 * first, blocks, 8 * first, 8 * (last - first));
    },
    dispose() {
      gone = true;
      told(null);
      for (const buffer of Object.values(buffers)) buffer.destroy();
      // The out-of-memory callback, which shares this scope, may make the next arena while this one still holds its
      // arrays.
      words = new Uint32Array(0);
      blocks = new Float32Array(0);
    },
  };
}
