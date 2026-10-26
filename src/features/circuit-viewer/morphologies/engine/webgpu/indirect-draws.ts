import * as THREE from 'three/webgpu';

import { shareBuffer } from './three-hooks';
import { COPY_DST, INDIRECT } from './usage';

/** A draw's arguments, bytes: five words. */
const ARGS_BYTES = 20;

interface Draw {
  buffer: GPUBuffer;
  attribute: THREE.IndirectStorageBufferAttribute;
}

/**
 * The draws whose arguments are at `offsets` of a buffer the culling writes, each drawn from a buffer of its own that
 * the arguments are copied into: Safari 27 hangs the GPU where draws in a pass read their arguments from one buffer
 * (WebKit bug 321876).
 */
export class IndirectDraws {
  private draws = new Map<number, Draw>();

  constructor(
    renderer: THREE.WebGPURenderer,
    device: GPUDevice,
    offsets: readonly number[],
    label: string
  ) {
    for (const offset of offsets) {
      const buffer = device.createBuffer({
        size: ARGS_BYTES,
        usage: INDIRECT | COPY_DST,
        label: `${label} ${offset}`,
      });
      const attribute = new THREE.IndirectStorageBufferAttribute(
        new Uint32Array(ARGS_BYTES / 4),
        1
      );
      this.draws.set(offset, { buffer, attribute: shareBuffer(renderer, attribute, buffer) });
    }
  }

  /** What the draw at `offset` is drawn by, from its start. */
  of(offset: number): THREE.IndirectStorageBufferAttribute {
    const draw = this.draws.get(offset);
    if (!draw) throw new Error(`no draw at ${offset}`);
    return draw.attribute;
  }

  /** Each draw's arguments copied from `from`, once `encoder` has written them. */
  copy(encoder: GPUCommandEncoder, from: GPUBuffer): void {
    for (const [offset, { buffer }] of this.draws) {
      encoder.copyBufferToBuffer(from, offset, buffer, 0, ARGS_BYTES);
    }
  }

  /** The draws' arguments set from `words`, laid out as the culling's buffer. */
  write(queue: GPUQueue, words: Uint32Array): void {
    for (const [offset, { buffer }] of this.draws) {
      queue.writeBuffer(buffer, 0, words, offset / 4, ARGS_BYTES / 4);
    }
  }

  destroy(): void {
    for (const { buffer } of this.draws.values()) buffer.destroy();
  }
}
