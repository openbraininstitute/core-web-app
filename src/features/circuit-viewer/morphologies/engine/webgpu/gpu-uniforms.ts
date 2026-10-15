import { texture, uniform } from 'three/tsl';
import * as THREE from 'three/webgpu';

import { NO_CELL } from '../impostors';

import type { ImpostorUniforms } from '../impostors';
import type { SomaCloudUniforms } from '../soma-cloud';

/** A texel of `format`, for a texture node to bind while there is no cell table. */
function empty(format: THREE.PixelFormat, channels: number): THREE.DataTexture {
  const blank = new THREE.DataTexture(new Uint8Array(channels), 1, 1, format);
  blank.needsUpdate = true;
  return blank;
}

const NO_CELLS = empty(THREE.RGBAFormat, 4);
NO_CELLS.colorSpace = THREE.SRGBColorSpace;
const NO_GLOW = empty(THREE.RedFormat, 1);
const NO_SHADE = empty(THREE.RGFormat, 2);

/**
 * The uniforms of `CircuitView` as the WebGPU tier's nodes read them, copied into the nodes before each draw
 * (`sync`): the textures of a new cell table and the numbers change where the holders change them.
 */
export class GpuUniforms {
  readonly cells = texture(NO_CELLS);
  readonly glow = texture(NO_GLOW);
  readonly shade = texture(NO_SHADE);
  readonly highlighted = uniform(NO_CELL, 'uint');
  readonly highlight = uniform(new THREE.Color());
  readonly glowRim = uniform(new THREE.Vector4());
  readonly offset = uniform(new THREE.Vector3());
  readonly radius = uniform(1);
  readonly opacity = uniform(1);

  constructor(
    private impostors: ImpostorUniforms,
    private cloud: SomaCloudUniforms
  ) {}

  sync(): void {
    const i = this.impostors;
    const c = this.cloud;
    this.cells.value = i.uCells.value ?? NO_CELLS;
    this.glow.value = i.uGlow.value ?? NO_GLOW;
    this.shade.value = c.uShade.value ?? NO_SHADE;
    this.highlighted.value = i.uHighlighted.value;
    this.highlight.value.copy(i.uHighlight.value);
    this.glowRim.value.copy(i.uGlowRim.value);
    this.offset.value.copy(c.uOffset.value);
    this.radius.value = c.uRadius.value;
    this.opacity.value = c.uOpacity.value;
  }
}
