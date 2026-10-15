import { texture, uniform } from 'three/tsl';
import * as THREE from 'three/webgpu';

import { NO_CELL } from '../impostors';

import type { ElectrodeUniforms } from '../electrodes';
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

/** A kind of dot's uniforms as the nodes read them. */
export class DotUniforms {
  readonly radius = uniform(0);
  readonly minRadius = uniform(0);

  constructor(private from: Omit<ElectrodeUniforms, 'uRingColour'>) {}

  sync(): void {
    this.radius.value = this.from.uRadius.value;
    this.minRadius.value = this.from.uMinRadius.value;
  }
}

/** The uniforms `CircuitView` holds that the WebGPU tier's nodes read. */
export interface HeldUniforms {
  impostors: ImpostorUniforms;
  cloud: SomaCloudUniforms;
  segments: { uSegments: { value: number } };
  electrodes: ElectrodeUniforms;
  synapses: ElectrodeUniforms;
  markers: ElectrodeUniforms;
}

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
  readonly shift = uniform(new THREE.Vector3());
  readonly mix = uniform(0);
  /** By SWC's numbers: unknown, soma, axon, basal, apical. */
  readonly sectionColours = Array.from({ length: 5 }, () => uniform(new THREE.Color()));
  readonly segments = uniform(0, 'uint');
  readonly offset = uniform(new THREE.Vector3());
  readonly radius = uniform(1);
  readonly opacity = uniform(1);
  readonly ringColour = uniform(new THREE.Vector3());
  readonly electrodes: DotUniforms;
  readonly synapses: DotUniforms;
  readonly markers: DotUniforms;

  constructor(private held: HeldUniforms) {
    this.electrodes = new DotUniforms(held.electrodes);
    this.synapses = new DotUniforms(held.synapses);
    this.markers = new DotUniforms(held.markers);
  }

  sync(): void {
    const i = this.held.impostors;
    const c = this.held.cloud;
    this.cells.value = i.uCells.value ?? NO_CELLS;
    this.glow.value = i.uGlow.value ?? NO_GLOW;
    this.shade.value = c.uShade.value ?? NO_SHADE;
    this.highlighted.value = i.uHighlighted.value;
    this.highlight.value.copy(i.uHighlight.value);
    this.glowRim.value.copy(i.uGlowRim.value);
    this.shift.value.copy(i.uShift.value);
    this.mix.value = i.uMix.value;
    this.sectionColours.forEach((node, type) => {
      node.value.copy(i.uSectionColours.value[type]);
    });
    this.segments.value = this.held.segments.uSegments.value;
    this.offset.value.copy(c.uOffset.value);
    this.radius.value = c.uRadius.value;
    this.opacity.value = c.uOpacity.value;
    this.ringColour.value.copy(this.held.electrodes.uRingColour.value);
    this.electrodes.sync();
    this.synapses.sync();
    this.markers.sync();
  }
}
