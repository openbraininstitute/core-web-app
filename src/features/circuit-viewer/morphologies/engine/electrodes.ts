/**
 * Electrode contacts drawn as the somas view draws them: a flat disc each, in its array's colour as the host gives it,
 * in front of the cells whatever is nearer the eye. A contact is as wide as its radius in µm, and never under a pixel or
 * two across, so a probe stays in sight from afar. A ring in the theme's foreground goes round each, so that a contact
 * reads on cells of its own colour.
 */

import chroma from 'chroma-js';
import * as THREE from 'three';

import { followViewport, type ImpostorUniforms, PIXEL_UM } from './impostors';

import type { Vec3 } from '../types';

/** How much larger and how much nearer white the highlighted array is drawn, as in the somas view. */
const HIGHLIGHT_SCALE = 1.55;
const HIGHLIGHT_LIGHTEN = 0.55;
/** What a contact is drawn in where the host's colour cannot be read, which its styling passes on as it is. */
const UNREADABLE = '#808080';
/** The ring's width, in CSS pixels, outside the disc. */
const RING_PX = 1;

export interface ElectrodeUniforms {
  /** A contact's radius, in µm. */
  uRadius: { value: number };
  /** The least radius a contact is drawn with, in device pixels. */
  uMinRadius: { value: number };
  /** The ring's colour, in sRGB. */
  uRingColour: { value: THREE.Vector3 };
}

/** The least radius in device pixels for contacts `radius` µm wide: the somas view's, which counts it so. */
export function minRadius(radius: number): number {
  return Math.max(2, Math.round(0.32 * radius)) / 2;
}

/**
 * How far from its centre a contact `radius` µm wide is drawn, its ring taken in, as the vertex shader draws it: in CSS
 * pixels where one spans `um` µm, on a screen of `pixelRatio`.
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
in vec3 aContact;
in vec4 aLook;
out vec3 vColour;
out vec2 vCorner;
out float vInner;
${PIXEL_UM}
void main() {
	vec3 c = ( modelViewMatrix * vec4( aContact, 1.0 ) ).xyz;
	float um = pixelUm( c.z );
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
 * The contacts' material, its ring a CSS pixel wide on a screen of `pixelRatio`. Dots drawn `among` the cells, as
 * synapses are, have no ring and are hidden by what is nearer the eye, brought towards it by their radius to sit on the
 * surface they are on rather than in it.
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
 * Write `groups`' dots, `centre` taken off, three floats each, into `contacts`, and their looks into `looks`: the
 * colour in sRGB and the scale, four floats each. True where that changed a float.
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
