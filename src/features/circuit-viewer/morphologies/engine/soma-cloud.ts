/**
 * The somas of a circuit drawn as the somas view, morphoviewer's `MorphoViewerCircuitMultipleNeuronsSomaOnly` that this
 * replaces, drew them: a quad a cell, facing the eye at the soma's centre and as wide as its sphere, shaded as one by a
 * fixed light, with no depth of its own. The colours are worked in sRGB, as the view mixed them, and drawn as they come
 * out, with no tone mapping.
 *
 * Each cell takes its colour from the cell table, darkened the more crowded its neighbourhood is; a cell with no
 * colour of its own runs along a blue ramp by it instead. A spike swells it, lights it towards a warm white and rings
 * it, and makes it opaque however translucent the rest are.
 *
 * The same quads drawn in each cell's number tell which cell is under a pixel (`somaCloudIdMaterial`).
 */

import chroma from 'chroma-js';
import * as THREE from 'three';

import { CELL_GLSL, GLOW_RIM_COLOR } from './impostors';

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

/** How much wider a soma glowing in full is drawn, a share of its radius. */
export const GLOW_SWELL = 0.7;

const glsl = (values: number[]) => `vec3( ${values.map((v) => v.toFixed(6)).join(', ')} )`;
const srgb = (color: string) => glsl(chroma(color).gl().slice(0, 3));
const LIGHT = new THREE.Vector3(-0.4, 0.5, 0.666).normalize().toArray();

const SHARED_VERTEX = /* glsl */ `
uniform highp sampler2D uCells;
uniform vec3 uOffset;
uniform float uRadius;
in vec3 aPosition;

${CELL_GLSL}
uint cellOf() {
	return uint( gl_InstanceID );
}
// The quad's corner.
vec4 cornerAt( float radius ) {
	vec4 centre = modelViewMatrix * vec4( aPosition - uOffset, 1.0 );
	return projectionMatrix * vec4( centre.xy + position.xy * radius, centre.z, 1.0 );
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
out vec2 vCoord;
out float vGlow;
out float vAlpha;

vec3 toSRGB( vec3 linear ) {
	return mix( linear * 12.92, 1.055 * pow( linear, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, linear ) );
}

// How crowded the cell is darkens it by up to 55%; with no colour of its own it runs along the blue ramp.
vec3 crowded( vec3 colour, vec2 shade ) {
	if ( shade.g < 0.5 ) return colour * ( 1.0 - 0.55 * shade.r );
	return shade.r < 0.5
		? mix( ${srgb('hsl(200, 100%, 80%)')}, ${srgb('hsl(200, 100%, 50%)')}, 2.0 * shade.r )
		: mix( ${srgb('hsl(200, 100%, 50%)')}, ${srgb('hsl(220, 100%, 30%)')}, 2.0 * shade.r - 1.0 );
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
	vCoord = position.xy;
	gl_Position = cornerAt( uRadius * ( 1.0 + ${GLOW_SWELL.toFixed(6)} * glow ) );
}
`;

const FRAGMENT = /* glsl */ `
in vec3 vColour;
in vec2 vCoord;
in float vGlow;
in float vAlpha;

void main() {
	float z2 = 1.0 - dot( vCoord, vCoord );
	if ( z2 < 0.0 ) discard;
	float facing = 0.5 * ( 1.0 + dot( vec3( vCoord, sqrt( z2 ) ), ${glsl(LIGHT)} ) );
	vec3 shaded = vColour * ( 0.5 + 0.5 * smoothstep( 0.0, 1.0, facing ) ) + 0.33 * pow( facing, 50.0 );
	// Light of its own while it glows, and a ring at its edge.
	vec3 hot = shaded + 0.2 * vGlow * vColour;
	float rim = vGlow * smoothstep( 0.9, 1.0, length( vCoord ) );
	gl_FragColor = vec4( mix( hot, ${srgb(GLOW_RIM_COLOR)}, rim ), vAlpha );
}
`;

const ID_VERTEX = /* glsl */ `
${SHARED_VERTEX}
flat out vec4 vId;
out vec2 vCoord;

void main() {
	uint cell = cellOf();
	if ( texelFetch( uCells, cellXY( cell ), 0 ).a == 0.0 ) {
		gl_Position = NOWHERE;
		return;
	}
	vId = cellId( cell );
	vCoord = position.xy;
	gl_Position = cornerAt( uRadius );
}
`;

const ID_FRAGMENT = /* glsl */ `
flat in vec4 vId;
in vec2 vCoord;

void main() {
	if ( dot( vCoord, vCoord ) > 1.0 ) discard;
	gl_FragColor = vId;
}
`;

type Shared = Pick<ImpostorUniforms, 'uCells' | 'uGlow' | 'uHighlighted' | 'uHighlight'>;

/** The cloud's material. Translucent below an opacity of 1, it blends, and still writes its depth, unsorted. */
export function somaCloudMaterial(shared: Shared, own: SomaCloudUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared, ...own },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
  });
}

/** The same quads in their cells' numbers, where a cell is drawn, as large as when it does not glow. */
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
