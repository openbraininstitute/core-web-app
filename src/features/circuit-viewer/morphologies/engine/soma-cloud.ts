/**
 * The somas of a circuit, one low pyramid per cell (`fanGeometry`). Its base faces the eye at the soma's centre and is
 * as wide as the soma's sphere, its tip is a radius nearer, and a fixed light shades it as a sphere. Where two somas
 * meet, each covers the other where its pyramid is nearer, much as their spheres would, and neither covers the other
 * whole as they turn. Where somas are a few pixels across, a flat quad per soma is enough (`QUADS_BELOW_PX`). The cloud
 * is cut into pieces of neighbours (`cloudPieces`). The colours are worked in sRGB and drawn as they come out, with no
 * tone mapping.
 *
 * Each cell takes its colour from the cell table, darkened the more crowded its neighbourhood is; a cell with no
 * colour of its own takes its colour from a blue ramp by crowding instead. A spike swells the soma, lights it towards
 * a warm white, rings it on a light background where the morphologies are ringed, and makes it opaque however
 * translucent the rest are.
 *
 * The same pyramids, drawn in each cell's number, tell which cell is under a pixel (`somaCloudIdMaterial`).
 */

import chroma from 'chroma-js';
import * as THREE from 'three';

import { extentOf } from '../extent';
import { type MortonSorted, mortonSorted } from '../load/morton';
import { CELL_GLSL, GLOW_RIM_COLOR, instancedGeometry, LIFTED } from './impostors';

import type { ImpostorUniforms } from './impostors';

/** What the cloud reads besides the cell table: the uniforms it shares with the impostors, and these. */
export interface SomaCloudUniforms {
  /** The cell table's crowding and own-colour bytes. */
  uShade: { value: THREE.Texture | null };
  /** Taken off every position: the view's origin in the circuit's frame. */
  uOffset: { value: THREE.Vector3 };
  /** A soma's radius, µm. */
  uRadius: { value: number };
  uOpacity: { value: number };
}

export function somaCloudUniforms(): SomaCloudUniforms {
  return {
    uShade: { value: null },
    uOffset: { value: new THREE.Vector3() },
    uRadius: { value: 1 },
    uOpacity: { value: 1 },
  };
}

/** How much wider a soma that glows in full is drawn, as a share of its radius. */
export const GLOW_SWELL = 0.7;

/** Where the somas are lit from, in view space. */
export const LIGHT = new THREE.Vector3(-0.4, 0.5, 0.666).normalize().toArray();
/** The ramp a cell with no colour of its own takes its colour from, from least to most crowded. */
export const BLUE_RAMP = ['hsl(200, 100%, 80%)', 'hsl(200, 100%, 50%)', 'hsl(220, 100%, 30%)'];

const glsl = (values: number[]) => `vec3( ${values.map((v) => v.toFixed(6)).join(', ')} )`;
const srgb = (color: string) => glsl(chroma(color).gl().slice(0, 3));

// A hexagon round the unit circle: with a square base, the corners would show where two somas meet.
const FAN_SIDES = 6;
const FAN_REACH = 1 / Math.cos(Math.PI / FAN_SIDES);
const FAN_CORNERS = [0, 0, 1];
const FAN_TRIANGLES: number[] = [];
for (let k = 0; k < FAN_SIDES; k++) {
  const angle = (2 * Math.PI * (k + 0.5)) / FAN_SIDES;
  FAN_CORNERS.push(FAN_REACH * Math.cos(angle), FAN_REACH * Math.sin(angle), 0);
  FAN_TRIANGLES.push(0, 1 + k, 1 + ((k + 1) % FAN_SIDES));
}

/** `instances` pyramids: the tip first, at z 1, then the base at z 0, its triangles facing the eye. */
export function fanGeometry(instances: number): THREE.InstancedBufferGeometry {
  return instancedGeometry(FAN_CORNERS, FAN_TRIANGLES, instances);
}

/**
 * Where a soma's radius spans fewer device pixels than `QUADS_BELOW_PX`, a piece of the cloud is drawn as flat quads,
 * 4 corners per soma against the pyramid's 7; above `PYRAMIDS_ABOVE_PX` it is drawn as pyramids again. At that size,
 * nobody can see a jump in which of two overlapping somas covers the other.
 */
export const QUADS_BELOW_PX = 3;
export const PYRAMIDS_ABOVE_PX = 3.6;

/** The fewest cells a piece of the cloud has, and the most pieces it is cut into. */
const PIECE_CELLS = 32768;
const MOST_PIECES = 512;

/** Somas near one another: their positions and cells, and the sphere round their positions. */
export interface CloudPiece {
  positions: Float32Array;
  cells: Uint32Array;
  centre: THREE.Vector3;
  reach: number;
}

/**
 * The somas in the Morton order of their positions (as the given `MortonSorted` has them), cut into pieces of
 * neighbours. Each piece is drawn by meshes of its own, so three leaves out the pieces out of view and draws the nearer
 * ones first.
 */
export function cloudPieces(
  positions: Float32Array,
  { order, sorted }: MortonSorted = mortonSorted(positions)
): CloudPiece[] {
  const n = order.length;
  const size = Math.max(PIECE_CELLS, Math.ceil(n / MOST_PIECES));
  const pieces: CloudPiece[] = [];
  for (let first = 0; first < n; first += size) {
    const end = Math.min(n, first + size);
    const piece = sorted.subarray(3 * first, 3 * end);
    const extent = extentOf(piece);
    const point = new THREE.Vector3();
    const centre = new THREE.Vector3();
    if (extent) centre.fromArray(extent.min).add(point.fromArray(extent.max)).multiplyScalar(0.5);
    let reach = 0;
    for (let i = 0; i < piece.length; i += 3) {
      const d = point.fromArray(piece, i).distanceTo(centre);
      if (Number.isFinite(d)) reach = Math.max(reach, d);
    }
    pieces.push({ positions: piece, cells: order.subarray(first, end), centre, reach });
  }
  return pieces;
}

const SHARED_VERTEX = /* glsl */ `
uniform highp sampler2D uCells;
uniform vec3 uOffset;
uniform float uRadius;
in vec3 aPosition;
#ifndef WHOLE
in uint aCell;
#endif

${CELL_GLSL}
${LIFTED}
// When the somas are drawn whole, they are in the page's order, so each instance's number is its cell's.
uint cellOf() {
#ifdef WHOLE
	return uint( gl_InstanceID );
#else
	return aCell;
#endif
}
// The pyramid's corner, its tip a radius nearer.
vec4 cornerAt( float radius ) {
	vec4 centre = modelViewMatrix * vec4( aPosition - uOffset, 1.0 );
	return projectionMatrix * vec4( lifted( vec3( centre.xy + position.xy * radius, centre.z ), position.z * radius ), 1.0 );
}
// The corner on the unit disc times the corner's w, and w. The fragments divide by w, so the coordinate runs straight
// across the screen; otherwise the tip, nearer than the base, would bend it.
vec3 discCoord( vec4 clip ) {
	return vec3( position.xy * clip.w, clip.w );
}
`;

const VERTEX = /* glsl */ `
${SHARED_VERTEX}
uniform highp sampler2D uShade;
uniform highp sampler2D uGlow;
uniform uint uHighlighted;
uniform vec3 uHighlight;
uniform float uOpacity;
out vec3 vColour;
out vec3 vCoord;
out float vGlow;
out float vAlpha;

vec3 toSRGB( vec3 linear ) {
	return mix( linear * 12.92, 1.055 * pow( linear, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, linear ) );
}

// Crowding darkens the cell by up to 55%; a cell with no colour of its own takes its colour from the blue ramp.
vec3 crowded( vec3 colour, vec2 shade ) {
	if ( shade.g < 0.5 ) return colour * ( 1.0 - 0.55 * shade.r );
	return shade.r < 0.5
		? mix( ${srgb(BLUE_RAMP[0])}, ${srgb(BLUE_RAMP[1])}, 2.0 * shade.r )
		: mix( ${srgb(BLUE_RAMP[1])}, ${srgb(BLUE_RAMP[2])}, 2.0 * shade.r - 1.0 );
}

void main() {
	uint cell = cellOf();
	ivec2 xy = cellXY( cell );
	vec4 texel = texelFetch( uCells, xy, 0 );
	if ( texel.a == 0.0 ) {
		gl_Position = NOWHERE;
		return;
	}
	// The highlighted cell keeps the highlight.
	bool lit = cell == uHighlighted;
	float glow = lit ? 0.0 : texelFetch( uGlow, xy, 0 ).r;
	vec3 colour = lit ? toSRGB( uHighlight ) : crowded( toSRGB( texel.rgb ), texelFetch( uShade, xy, 0 ).rg );
	vColour = glowing( colour, glow );
	vGlow = glow;
	vAlpha = lit ? 1.0 : mix( uOpacity, 1.0, glow );
	gl_Position = cornerAt( uRadius * ( 1.0 + ${GLOW_SWELL.toFixed(6)} * glow ) );
	vCoord = discCoord( gl_Position );
}
`;

const FRAGMENT = /* glsl */ `
uniform vec4 uGlowRim;
in vec3 vColour;
in vec3 vCoord;
in float vGlow;
in float vAlpha;

void main() {
	vec2 coord = vCoord.xy / vCoord.z;
	float z2 = 1.0 - dot( coord, coord );
	if ( z2 < 0.0 ) discard;
	float facing = 0.5 * ( 1.0 + dot( vec3( coord, sqrt( z2 ) ), ${glsl(LIGHT)} ) );
	vec3 shaded = vColour * ( 0.5 + 0.5 * smoothstep( 0.0, 1.0, facing ) ) + 0.33 * pow( facing, 50.0 );
	// A glowing soma gives light of its own, and gets a ring at its edge where the morphologies have one.
	vec3 hot = shaded + 0.2 * vGlow * vColour;
	float rim = vGlow * uGlowRim.a * smoothstep( 0.9, 1.0, length( coord ) );
	gl_FragColor = vec4( mix( hot, ${srgb(GLOW_RIM_COLOR)}, rim ), vAlpha );
}
`;

const ID_VERTEX = /* glsl */ `
${SHARED_VERTEX}
flat out vec4 vId;
out vec3 vCoord;

void main() {
	uint cell = cellOf();
	if ( texelFetch( uCells, cellXY( cell ), 0 ).a == 0.0 ) {
		gl_Position = NOWHERE;
		return;
	}
	vId = cellId( cell );
	gl_Position = cornerAt( uRadius );
	vCoord = discCoord( gl_Position );
}
`;

const ID_FRAGMENT = /* glsl */ `
flat in vec4 vId;
in vec3 vCoord;

void main() {
	vec2 coord = vCoord.xy / vCoord.z;
	if ( dot( coord, coord ) > 1.0 ) discard;
	gl_FragColor = vId;
}
`;

type Shared = Pick<
  ImpostorUniforms,
  'uCells' | 'uGlow' | 'uHighlighted' | 'uHighlight' | 'uGlowRim'
>;

/**
 * The cloud's material. Below an opacity of 1 it blends, still writes its depth, and is not sorted. With `whole`, for
 * the somas drawn whole in the page's order, it reads each soma's cell from its instance and is translucent.
 */
export function somaCloudMaterial(
  shared: Shared,
  own: SomaCloudUniforms,
  { whole = false }: { whole?: boolean } = {}
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared, ...own },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    defines: whole ? { WHOLE: '' } : {},
    transparent: whole,
  });
}

/** The same pyramids in their cells' numbers, for the cells drawn, at the size of a soma that does not glow. */
export function somaCloudIdMaterial(
  shared: Pick<ImpostorUniforms, 'uCells'>,
  own: SomaCloudUniforms
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uCells: shared.uCells, uOffset: own.uOffset, uRadius: own.uRadius },
    vertexShader: ID_VERTEX,
    fragmentShader: ID_FRAGMENT,
    blending: THREE.NoBlending,
  });
}
