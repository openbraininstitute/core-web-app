/**
 * Draws electrode contacts as the somas view draws them: each is a flat disc in the colour the host gives its array,
 * in front of the cells even where they are nearer the eye. A contact is as wide as its radius in µm, but never under
 * a pixel or two across, so a probe stays visible from afar. A ring in the theme's foreground colour goes round each
 * contact, so that it stands out on cells of its own colour.
 */

import chroma from 'chroma-js';
import * as THREE from 'three';

import { followViewport, type ImpostorUniforms, PIXEL_UM } from './impostors';

import type { Vec3 } from '../types';

/** How much larger and how much nearer white the highlighted array is drawn, as in the somas view. */
const HIGHLIGHT_SCALE = 1.55;
const HIGHLIGHT_LIGHTEN = 0.55;
/** The colour of a contact whose host colour cannot be read. The host's styling passes such a colour on unchanged. */
const UNREADABLE = '#808080';
/** The ring's width, in CSS pixels, outside the disc. */
export const RING_PX = 1;

export interface ElectrodeUniforms {
  /** A contact's radius, in µm. */
  uRadius: { value: number };
  /** The least radius a contact is drawn with, in device pixels. */
  uMinRadius: { value: number };
  /** The ring's colour, in sRGB. */
  uRingColour: { value: THREE.Vector3 };
  /**
   * The fraction of the full resolution the frame is drawn at. The least radius and the ring are in device pixels of
   * the full resolution, so a frame drawn at less still draws them as wide on screen.
   */
  uScale: { value: number };
}

/** The least radius in device pixels for contacts `radius` µm wide, counted the way the somas view counts it. */
export function minRadius(radius: number): number {
  return Math.max(2, Math.round(0.32 * radius)) / 2;
}

/**
 * How far from its centre the vertex shader draws a contact `radius` µm wide, ring included: in CSS pixels, where one
 * CSS pixel spans `um` µm, on a screen of `pixelRatio`.
 */
export function drawnRadius(radius: number, lit: boolean, um: number, pixelRatio: number): number {
  const disc = (radius * (lit ? HIGHLIGHT_SCALE : 1)) / um;
  return Math.max(disc, minRadius(radius) / pixelRatio) + RING_PX;
}

const VERTEX = /* glsl */ `
uniform vec4 uViewport;
uniform float uRadius;
uniform float uMinRadius;
uniform float uRing;
uniform float uLift;
uniform float uScale;
in vec3 aContact;
in vec4 aLook;
out vec3 vColour;
out vec2 vCorner;
out float vInner;
${PIXEL_UM}
void main() {
	vec3 c = ( modelViewMatrix * vec4( aContact, 1.0 ) ).xyz;
	float um = pixelUm( c.z ) * uScale;
	float r = max( uRadius * aLook.a, uMinRadius * um );
	float outer = r + uRing * um;
	vInner = r / outer;
	vColour = aLook.rgb;
	vCorner = position.xy;
	gl_Position = projectionMatrix * vec4( c.xy + position.xy * outer, c.z + uLift * r, 1.0 );
}
`;

// The colours as they came, in sRGB: no tone mapping and no conversion.
const FRAGMENT = /* glsl */ `
uniform vec3 uRingColour;
in vec3 vColour;
in vec2 vCorner;
in float vInner;

void main() {
	float d = length( vCorner );
	if ( d > 1.0 ) discard;
	gl_FragColor = vec4( d > vInner ? uRingColour : vColour, 1.0 );
}
`;

/**
 * The contacts' material, with a ring one CSS pixel wide on a screen of `pixelRatio`. Dots drawn `among` the cells, as
 * synapses are, have no ring, and anything nearer the eye hides them. The shader moves them towards the eye by their
 * radius, so that they sit on the surface they lie on rather than inside it.
 */
export function electrodeMaterial(
  uniforms: ElectrodeUniforms & Pick<ImpostorUniforms, 'uViewport'>,
  pixelRatio: number,
  { among = false } = {}
): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uRing: { value: among ? 0 : RING_PX * pixelRatio },
      uLift: { value: among ? 1 : 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthTest: among,
    depthWrite: false,
  });
  followViewport(material, uniforms);
  return material;
}

/**
 * Dots in one colour, three floats each in the circuit's frame: an electrode array's contacts, a group of synapses, or
 * a location marker. Only an electrode array has an `id`, by which it is highlighted.
 */
export interface DotGroup {
  id?: string;
  color: string;
  coordinates: ArrayLike<number>;
}

/**
 * Writes the dots of `groups` into `contacts`, three floats each with `centre` subtracted, and their looks into
 * `looks`, four floats each: the colour in sRGB and the scale. Returns true where that changed a float.
 */
export function writeDots(
  groups: readonly DotGroup[],
  highlighted: string | null,
  centre: Vec3,
  contacts: Float32Array,
  looks: Float32Array
): boolean {
  let changed = false;
  const write = (array: Float32Array, at: number, value: number) => {
    const float = Math.fround(value);
    if (array[at] === float) return;
    array[at] = float;
    changed = true;
  };
  let k = 0;
  for (const group of groups) {
    const lit = group.id !== undefined && group.id === highlighted;
    const own = chroma.valid(group.color) ? group.color : UNREADABLE;
    const colour = lit ? chroma.mix(own, '#ffffff', HIGHLIGHT_LIGHTEN, 'rgb') : chroma(own);
    const look = [...colour.gl().slice(0, 3), lit ? HIGHLIGHT_SCALE : 1];
    const xyz = group.coordinates;
    for (let i = 0; i + 2 < xyz.length; i += 3, k++) {
      for (let c = 0; c < 3; c++) write(contacts, 3 * k + c, xyz[i + c] - centre[c]);
      for (let c = 0; c < 4; c++) write(looks, 4 * k + c, look[c]);
    }
  }
  return changed;
}

export function countDots(groups: readonly DotGroup[]): number {
  let count = 0;
  for (const group of groups) count += Math.floor(group.coordinates.length / 3);
  return count;
}
