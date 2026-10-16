/**
 * The private parts of three's WebGPU renderer the circuit engine takes, in one place, as three r186 has them: what
 * holds a GPU object for each of three's (`backend.get`), whose buffer three binds for an attribute in place of making
 * one and whose texture is the one three made for a texture of its own, and three's own loop. `checkHooks` is called
 * once the renderer is ready; where a release of three changed one the engine cannot do without, the view is drawn
 * with WebGL 2.
 */
import { Unfit } from '../probe';

import type * as THREE from 'three/webgpu';

interface Backend {
  get(object: object): { buffer?: GPUBuffer; texture?: GPUTexture };
}

function backendOf(renderer: THREE.WebGPURenderer): Partial<Backend> | undefined {
  return (renderer as unknown as { backend?: Partial<Backend> }).backend;
}

/** Throws `Unfit` where `renderer` lacks a part the tier takes. */
export function checkHooks(renderer: THREE.WebGPURenderer): void {
  if (typeof backendOf(renderer)?.get !== 'function') {
    throw new Unfit("three's backend.get is missing");
  }
}

/** `attribute` bound as `buffer`, of the page's: three makes no buffer of its own for an attribute that has one. */
export function shareBuffer(
  renderer: THREE.WebGPURenderer,
  attribute: THREE.BufferAttribute,
  buffer: GPUBuffer
): void {
  (backendOf(renderer) as Backend).get(attribute).buffer = buffer;
}

/** The GPU texture three made for `texture`; undefined until it has made one. */
export function gpuTexture(
  renderer: THREE.WebGPURenderer,
  texture: THREE.Texture
): GPUTexture | undefined {
  return (backendOf(renderer) as Backend).get(texture).texture;
}

interface Turns {
  start(): void;
  stop(): void;
}

/** three's own loop: null where a release of three changed it, which leaves it turning. */
export function threeLoop(renderer: THREE.WebGPURenderer): Turns | null {
  const turns = (renderer as unknown as { _animation?: Partial<Turns> | null })._animation;
  return typeof turns?.start === 'function' && typeof turns.stop === 'function'
    ? (turns as Turns)
    : null;
}
