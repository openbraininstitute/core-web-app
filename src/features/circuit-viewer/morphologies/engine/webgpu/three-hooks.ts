/**
 * The private parts of three's WebGPU renderer the circuit engine takes, in one place, as three r186 has them: what
 * holds a GPU object for each of three's (`backend.get`), whose buffer three binds for an attribute in place of making
 * one, and three's own loop. `checkHooks` is called once the renderer is ready; where a release of three changed one the
 * engine cannot do without, the view is drawn with WebGL 2.
 */
import type * as THREE from 'three/webgpu';

/** A part of three the WebGPU tier cannot do without, missing from the release in use. */
export class MissingHook extends Error {
  constructor(readonly hook: string) {
    super(`three's ${hook} is missing`);
    this.name = 'MissingHook';
  }
}

interface Backend {
  get(object: object): { buffer?: GPUBuffer };
}

function backendOf(renderer: THREE.WebGPURenderer): Partial<Backend> | undefined {
  return (renderer as unknown as { backend?: Partial<Backend> }).backend;
}

/** Throws `MissingHook` where `renderer` lacks a part the tier takes. */
export function checkHooks(renderer: THREE.WebGPURenderer): void {
  if (typeof backendOf(renderer)?.get !== 'function') throw new MissingHook('backend.get');
}

/** `attribute` bound as `buffer`, of the page's: three makes no buffer of its own for an attribute that has one. */
export function shareBuffer(
  renderer: THREE.WebGPURenderer,
  attribute: THREE.BufferAttribute,
  buffer: GPUBuffer
): void {
  (backendOf(renderer) as Backend).get(attribute).buffer = buffer;
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
