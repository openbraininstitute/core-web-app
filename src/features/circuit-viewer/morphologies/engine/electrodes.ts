/**
 * Draws electrode contacts as the somas view draws them: each is a flat disc in the colour the host gives its array,
 * in front of the cells even where they are nearer the eye. A contact is as wide as its radius in µm, but never under
 * a pixel or two across, so a probe stays visible from afar. A ring in the theme's foreground colour goes round each
 * contact, so that it stands out on cells of its own colour.
 *
 * A contact may be drawn among the cells instead, in two passes whose depth tests are each other's opposite: solid and
 * ringed with a halo where nothing is nearer the eye, faint where something is, and fainter the further it is across
 * its array.
 * Over morphologies that says little, as nearly every contact has a branch in front of it. There it is drawn over the
 * cells with a halo to stand out on them, and its depth shows in its size and opacity across the array.
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
/** The halo's width, in CSS pixels, outside the ring. */
export const HALO_PX = 1.5;
/** The least radius, in CSS pixels, of a contact with a halo, whose colour must show inside it however far the zoom. */
export const HALOED_LEAST_PX = 3;
/** How opaque a hidden contact is on the near side of its array, and on the far side. */
export const HIDDEN_OPACITIES = [0.6, 0.2] as const;
/** How opaque a contact over morphologies is on the near side of its array and on the far side, and how large. */
export const OVER_OPACITIES = [1, 0.35] as const;
export const OVER_SIZES = [1.25, 0.8] as const;
/** The share of the depth range that contacts over the cells are squeezed into, in front of all else. */
export const FRONT_DEPTH = 0.001;
const LEAST_FADE_REACH_UM = 1;

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
  /** Where opacity falls with depth: xyz the array's middle, w how far from it, in µm, the fade runs; w 0 for none. */
  uFade: { value: THREE.Vector4 };
  /** The halo's width, in device pixels of the full resolution; 0 for none. */
  uHalo: { value: number };
  /** The halo's colour, in sRGB. */
  uHaloColour: { value: THREE.Vector3 };
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
uniform vec4 uFade;
uniform float uHalo;
uniform vec2 uOpacities;
uniform vec2 uSizes;
uniform float uFront;
in vec3 aContact;
in vec4 aLook;
out vec3 vColour;
out vec2 vCorner;
out float vInner;
out float vRingEnd;
out float vOpacity;
${PIXEL_UM}
void main() {
	vec3 c = ( modelViewMatrix * vec4( aContact, 1.0 ) ).xyz;
	float um = pixelUm( c.z ) * uScale;
	float away = clamp( 0.5 + ( ( modelViewMatrix * vec4( uFade.xyz, 1.0 ) ).z - c.z ) / ( 2.0 * uFade.w ), 0.0, 1.0 );
	bool fades = uFade.w > 0.0;
	float r = max( uRadius * aLook.a, uMinRadius * um ) * ( fades ? mix( uSizes.x, uSizes.y, away ) : 1.0 );
	float outer = r + ( uRing + uHalo ) * um;
	vInner = r / outer;
	vRingEnd = ( r + uRing * um ) / outer;
	vColour = aLook.rgb;
	vCorner = position.xy;
	vOpacity = fades ? mix( uOpacities.x, uOpacities.y, away ) : 1.0;
	gl_Position = projectionMatrix * vec4( c.xy + position.xy * outer, c.z + uLift * r, 1.0 );
	// Clip z runs from -w to w here: to just past -w, keeping the order among the contacts.
	gl_Position.z = mix( gl_Position.z, ${FRONT_DEPTH.toFixed(4)} * gl_Position.z - ${(1 - FRONT_DEPTH).toFixed(4)} * gl_Position.w, uFront );
}
`;

// The colours as they came, in sRGB: no tone mapping and no conversion.
const FRAGMENT = /* glsl */ `
uniform vec3 uRingColour;
uniform vec3 uHaloColour;
in vec3 vColour;
in vec2 vCorner;
in float vInner;
in float vRingEnd;
in float vOpacity;

void main() {
	float d = length( vCorner );
	if ( d > 1.0 ) discard;
	gl_FragColor = vec4( d > vRingEnd ? uHaloColour : d > vInner ? uRingColour : vColour, vOpacity );
}
`;

/**
 * Blending set out in full on `material`: three blends a material marked transparent only after every opaque one,
 * whatever its order, and the contacts are to be drawn over these boxes.
 */
export function blendOver(material: THREE.Material): void {
  material.blending = THREE.CustomBlending;
  material.blendEquation = THREE.AddEquation;
  material.blendSrc = THREE.SrcAlphaFactor;
  material.blendDst = THREE.OneMinusSrcAlphaFactor;
  material.blendSrcAlpha = THREE.OneFactor;
  material.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  material.depthTest = false;
  material.depthWrite = false;
}

/** Has `material` draw only where something nearer the eye is drawn already, blended over it. */
export function drawWhereHidden(material: THREE.Material): void {
  blendOver(material);
  material.depthTest = true;
  material.depthFunc = THREE.GreaterDepth;
}

/**
 * The contacts' material, with a ring one CSS pixel wide on a screen of `pixelRatio`. Dots drawn `among` the cells, as
 * synapses are, have no ring unless `ringed`, and anything nearer the eye hides them. The shader moves them towards the
 * eye by their radius, so that they sit on the surface they lie on rather than inside it.
 */
export function electrodeMaterial(
  uniforms: ElectrodeUniforms & Pick<ImpostorUniforms, 'uViewport'>,
  pixelRatio: number,
  {
    among = false,
    ringed = !among,
    opacities = [1, 1],
    sizes = [1, 1],
    front = false,
  }: {
    among?: boolean;
    ringed?: boolean;
    opacities?: readonly [number, number];
    sizes?: readonly [number, number];
    front?: boolean;
  } = {}
): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uRing: { value: ringed ? RING_PX * pixelRatio : 0 },
      uLift: { value: among ? 1 : 0 },
      uOpacities: { value: new THREE.Vector2(...opacities) },
      uSizes: { value: new THREE.Vector2(...sizes) },
      uFront: { value: front ? 1 : 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthTest: among,
    depthWrite: false,
  });
  followViewport(material, uniforms);
  return material;
}

/** Has `material` draw in front of all else, blended over it, with the nearest of its own dots over the rest. */
export function drawInFront(material: THREE.Material): void {
  blendOver(material);
  material.depthTest = true;
  material.depthWrite = true;
}

/**
 * The materials of contacts drawn among the cells, where nothing is nearer the eye and where something is, and over
 * morphologies.
 */
export function contactMaterials(
  uniforms: ElectrodeUniforms & Pick<ImpostorUniforms, 'uViewport'>,
  fadingUniforms: ElectrodeUniforms & Pick<ImpostorUniforms, 'uViewport'>,
  pixelRatio: number
) {
  const contactAmong = electrodeMaterial(uniforms, pixelRatio, { among: true, ringed: true });
  contactAmong.depthWrite = true;
  const contactHidden = electrodeMaterial(fadingUniforms, pixelRatio, {
    among: true,
    opacities: HIDDEN_OPACITIES,
  });
  drawWhereHidden(contactHidden);
  const contactOver = electrodeMaterial(fadingUniforms, pixelRatio, {
    opacities: OVER_OPACITIES,
    sizes: OVER_SIZES,
    front: true,
  });
  drawInFront(contactOver);
  return { contactAmong, contactHidden, contactOver };
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

/** Sets `fade` to run across the dots of `groups`, with `centre` taken off: from one side to the other, seen face on. */
export function fadeAcross(groups: readonly DotGroup[], centre: Vec3, fade: THREE.Vector4): void {
  const box = new THREE.Box3();
  growRoundDots(box, groups, centre, 0);
  if (box.isEmpty()) return;
  const middle = box.getCenter(new THREE.Vector3());
  const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const reach = Math.max(half.length() / Math.sqrt(3), LEAST_FADE_REACH_UM);
  fade.set(middle.x, middle.y, middle.z, reach);
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

/** Grows `box` round the dots of `groups`, each reaching `radius` µm from where it is, with `centre` taken off. */
export function growRoundDots(
  box: THREE.Box3,
  groups: readonly DotGroup[],
  centre: Vec3,
  radius: number
): void {
  for (const { coordinates: xyz } of groups) {
    for (let i = 0; i + 2 < xyz.length; i += 3) {
      growRound(
        box,
        xyz[i] - centre[0],
        xyz[i + 1] - centre[1],
        xyz[i + 2] - centre[2],
        radius,
        radius,
        radius
      );
    }
  }
}

/** Grows `box` round what is at x, y, z and reaches that far from there along each axis. */
export function growRound(
  box: THREE.Box3,
  x: number,
  y: number,
  z: number,
  reachX: number,
  reachY: number,
  reachZ: number
): void {
  box.min.set(
    Math.min(box.min.x, x - reachX),
    Math.min(box.min.y, y - reachY),
    Math.min(box.min.z, z - reachZ)
  );
  box.max.set(
    Math.max(box.max.x, x + reachX),
    Math.max(box.max.y, y + reachY),
    Math.max(box.max.z, z + reachZ)
  );
}

export function countDots(groups: readonly DotGroup[]): number {
  let count = 0;
  for (const group of groups) count += Math.floor(group.coordinates.length / 3);
  return count;
}
