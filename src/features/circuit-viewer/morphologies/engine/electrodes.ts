/**
 * Electrode contacts drawn as the somas view draws them: a flat disc each, in its array's colour as the host gives it,
 * in front of the cells whatever is nearer the eye. A contact is as wide as its radius in µm, and never under a pixel or
 * two across, so a probe stays in sight from afar. A ring in the theme's foreground goes round each, so that a contact
 * reads on cells of its own colour.
 */

import chroma from 'chroma-js';
import * as THREE from 'three';

import { followViewport, type ImpostorUniforms, PIXEL_UM } from './impostors';

import type { ElectrodeGroup, Vec3 } from '../types';

/** How much larger and how much nearer white the highlighted array is drawn, as in the somas view. */
export const HIGHLIGHT_SCALE = 1.55;
const HIGHLIGHT_LIGHTEN = 0.55;
/** The ring's width, in CSS pixels, outside the disc. */
export const RING_PX = 1;

interface ElectrodeUniforms {
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

const VERTEX = /* glsl */ `
uniform vec4 uViewport;
uniform float uRadius;
uniform float uMinRadius;
uniform float uRing;
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
	gl_Position = projectionMatrix * vec4( c.xy + position.xy * outer, c.z, 1.0 );
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

export function electrodeMaterial(
  uniforms: ElectrodeUniforms & Pick<ImpostorUniforms, 'uViewport'>
): THREE.ShaderMaterial {
  // In device pixels, as the drawing buffer has them.
  const ring = { value: RING_PX };
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uRing: ring },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });
  followViewport(material, uniforms);
  const before = material.onBeforeRender;
  material.onBeforeRender = (renderer, ...rest) => {
    before.call(material, renderer, ...rest);
    ring.value = RING_PX * renderer.getPixelRatio();
  };
  return material;
}

/**
 * Write `groups`' contacts, `centre` taken off, three floats each, into `contacts`, and their looks into `looks`: the
 * colour in sRGB and the scale, four floats each.
 */
export function writeElectrodes(
  groups: readonly ElectrodeGroup[],
  highlighted: string | null,
  centre: Vec3,
  contacts: Float32Array,
  looks: Float32Array
): void {
  let k = 0;
  for (const group of groups) {
    const lit = group.id === highlighted;
    const colour = lit
      ? chroma.mix(group.color, '#ffffff', HIGHLIGHT_LIGHTEN, 'rgb')
      : chroma(group.color);
    const [r, g, b] = colour.gl();
    const xyz = group.coordinates;
    for (let i = 0; i + 2 < xyz.length; i += 3, k++) {
      for (let axis = 0; axis < 3; axis++) contacts[3 * k + axis] = xyz[i + axis] - centre[axis];
      looks[4 * k] = r;
      looks[4 * k + 1] = g;
      looks[4 * k + 2] = b;
      looks[4 * k + 3] = lit ? HIGHLIGHT_SCALE : 1;
    }
  }
}

export function countContacts(groups: readonly ElectrodeGroup[]): number {
  let count = 0;
  for (const group of groups) count += Math.floor(group.coordinates.length / 3);
  return count;
}
