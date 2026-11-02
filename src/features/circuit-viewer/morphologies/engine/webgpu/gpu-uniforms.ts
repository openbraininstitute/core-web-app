import { texture, uniform } from 'three/tsl';
import * as THREE from 'three/webgpu';

import { HOLE, NO_CELL } from '../impostors';

import type { ElectrodeUniforms } from '../electrodes';
import type { ImpostorUniforms } from '../impostors';
import type { SomaCloudUniforms } from '../soma-cloud';

/** A texel of `format`, for a texture node to bind while there is no cell table. */
function empty(
  format: THREE.PixelFormat,
  channels: number,
  type: THREE.TextureDataType = THREE.UnsignedByteType
): THREE.DataTexture {
  const data =
    type === THREE.FloatType
      ? new Float32Array(channels)
      : type === THREE.HalfFloatType
        ? new Uint16Array(channels)
        : new Uint8Array(channels);
  const blank = new THREE.DataTexture(data, 1, 1, format, type);
  blank.needsUpdate = true;
  return blank;
}

const NO_CELLS = empty(THREE.RGBAFormat, 4);
NO_CELLS.colorSpace = THREE.SRGBColorSpace;
const NO_GLOW = empty(THREE.RedFormat, 1);
const NO_SHADE = empty(THREE.RGFormat, 2);
const NO_SOMAS = empty(THREE.RGBAFormat, 4, THREE.FloatType);
const NO_FRONT = empty(THREE.RGBAFormat, 4, THREE.HalfFloatType);

/**
 * How wide on screen a segment is drawn as the tube itself, round in depth and meeting the next in a round joint, in
 * device pixels; a thinner one is drawn flat, as on WebGL 2. A tube writes its own depth, so each of its pixels is
 * shaded under whatever covers it: from 12 px, CA1's 300 cells took 15 ms more a frame at 16 times nearer, and from 48
 * px 2.6 ms.
 */
const TUBE_FROM_PX = 48;

/** A kind of dot's uniforms as the nodes read them. */
export class DotUniforms {
  readonly radius = uniform(0);
  readonly minRadius = uniform(0);

  constructor(private from: Omit<ElectrodeUniforms, 'uRingColour' | 'uScale'>) {}

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
  readonly somas = texture(NO_SOMAS);
  readonly afterglow = uniform(0);
  readonly neon = uniform(new THREE.Vector2());
  readonly spikeHue = uniform(new THREE.Vector4());
  /** How much brighter than white a fully lit cell is drawn besides, on a screen that shows past it; 0 on others. */
  overWhite = 0;
  /** How far behind what is in front a lit cell shows through, µm, and half the line it shows as, device pixels. */
  readonly throughUm = uniform(0);
  readonly throughHalfPx = uniform(0);
  /** The frame's picture and surfaces as the occlusion drew them (`Occlusion.front`): what is in front, where. */
  readonly frontPicture = texture(NO_FRONT);
  readonly frontSurface = texture(NO_FRONT);

  /** What the frame drew in front (`Occlusion.front`), or none. */
  showFront(front: { picture: THREE.Texture; surface: THREE.Texture } | null): void {
    this.frontPicture.value = front?.picture ?? NO_FRONT;
    this.frontSurface.value = front?.surface ?? NO_FRONT;
  }
  readonly highlighted = uniform(NO_CELL, 'uint');
  readonly highlight = uniform(new THREE.Color());
  readonly glowRim = uniform(new THREE.Vector4());
  readonly shift = uniform(new THREE.Vector3());
  readonly mix = uniform(0);
  /** By SWC's numbers: unknown, soma, axon, basal, apical. */
  readonly sectionColours = Array.from({ length: 5 }, () => uniform(new THREE.Color()));
  readonly hidden = uniform(HOLE, 'uint');
  readonly segments = uniform(0, 'uint');
  /** The least radius of a segment drawn as the tube itself, in device pixels. */
  readonly tubeFrom = uniform(TUBE_FROM_PX / 2);
  readonly offset = uniform(new THREE.Vector3());
  readonly radius = uniform(1);
  readonly opacity = uniform(1);
  readonly ringColour = uniform(new THREE.Vector3());
  /** The fraction of the resolution the frame is drawn at, as the dots take it (`ElectrodeUniforms.uScale`). */
  readonly dotScale = uniform(1);
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
    this.somas.value = i.uSomas.value ?? NO_SOMAS;
    this.afterglow.value = i.uAfterglow.value;
    this.neon.value.copy(i.uNeon.value);
    this.spikeHue.value.copy(i.uSpikeHue.value);
    this.highlighted.value = i.uHighlighted.value;
    this.highlight.value.copy(i.uHighlight.value);
    this.glowRim.value.copy(i.uGlowRim.value);
    this.shift.value.copy(i.uShift.value);
    this.mix.value = i.uMix.value;
    this.sectionColours.forEach((node, type) => {
      node.value.copy(i.uSectionColours.value[type]);
    });
    this.hidden.value = i.uHidden.value;
    this.segments.value = this.held.segments.uSegments.value;
    this.offset.value.copy(c.uOffset.value);
    this.radius.value = c.uRadius.value;
    this.opacity.value = c.uOpacity.value;
    this.ringColour.value.copy(this.held.electrodes.uRingColour.value);
    this.dotScale.value = this.held.electrodes.uScale.value;
    this.electrodes.sync();
    this.synapses.sync();
    this.markers.sync();
  }
}
