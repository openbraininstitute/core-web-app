/**
 * How a spike lights a cell's morphology: from inside, unshaded, in its own colour brightened, or in the spike's hue
 * where the background has one, with a white-hot line along the middle of each fibre, in a band that runs out from the soma and fades as the glow does, the whole cell
 * kept a little lit behind it. The time since the spike is read back from the glow, which falls by e every afterglow.
 */

import { GLOW_POWER } from './cell-table';

import type { ThemeColors } from '@/features/viewer-3d/engine/looks';

/** How fast the band runs out from the soma, µm a second of the wall clock, how wide its front is and its tail, µm. */
export const PULSE_UM_PER_S = 400;
export const PULSE_WIDTH_UM = 30;
export const PULSE_TAIL_UM = 120;
/** How lit the whole cell stays while it glows, a share of the glow. */
export const PULSE_FLOOR = 0.25;
/** How much a lit cell's colour is brightened, and how bright the line along the middle is, on each background. */
export const NEON: Record<keyof ThemeColors, [number, number]> = {
  light: [1.5, 0.6],
  dark: [1.4, 0.4],
};
/** How much of the line a soma takes: facing the eye over its whole disc, in full it is a white blob. */
export const SOMA_LINE = 0.35;
/** The colour a lit cell takes in place of its own, sRGB, on each background; none, its own. */
export const SPIKE_HUE: Record<keyof ThemeColors, string | null> = {
  light: '#00c8ff',
  dark: null,
};

/** Past this its own colour is not brightened, linear, so a pale one keeps its hue. */
const BRIGHTEST = 1.1;

const f = (v: number) => v.toFixed(6);
const WHITE = '1.0, 0.92, 0.8';
// The band has run PULSE_UM_PER_S * age, the age -afterglow * ln( glow ) / GLOW_POWER.
const RUN = f(PULSE_UM_PER_S / GLOW_POWER);

/** `pulseFront`, per vertex, and `spikeLight` and `spikeColour`, per fragment, in GLSL. */
export const PULSE_FRONT_GLSL = /* glsl */ `
// How far a point d µm from its soma is ahead of its cell's band, µm, by the cell's glow as the cell table keeps it.
float pulseFront( float d, float glow, float afterglow ) {
	return d + ${RUN} * afterglow * log( glow );
}
`;

export const SPIKE_LIGHT_GLSL = /* glsl */ `
// How lit a point x µm ahead of its cell's band is.
float spikeLight( float x, float glow ) {
	if ( glow == 0.0 ) return 0.0;
	float band = exp( - x * x / ${f(PULSE_WIDTH_UM ** 2)} );
	if ( x < 0.0 ) band = max( band, exp( x / ${f(PULSE_TAIL_UM)} ) );
	return glow * max( band, ${f(PULSE_FLOOR)} );
}
// A lit cell's colour, linear, by its own and how squarely the surface faces the eye.
vec3 spikeColour( vec3 own, float facing, vec2 neon, vec4 hue ) {
	float squared = clamp( facing, 0.0, 1.0 ) * clamp( facing, 0.0, 1.0 );
	float most = max( own.r, max( own.g, max( own.b, 1e-4 ) ) );
	vec3 bright = mix( own * min( neon.x, ${f(BRIGHTEST)} / most ), hue.rgb * neon.x, hue.a );
	return bright + vec3( ${WHITE} ) * neon.y * squared * squared;
}
`;

/** The same in WGSL, a function each. */
export const PULSE_FRONT_WGSL = /* wgsl */ `
fn pulseFront(d: f32, glow: f32, afterglow: f32) -> f32 {
  return select(0.0, d + ${RUN} * afterglow * log(glow), glow > 0.0);
}`;

export const SPIKE_LIGHT_WGSL = /* wgsl */ `
fn spikeLight(x: f32, glow: f32) -> f32 {
  if (glow == 0.0) { return 0.0; }
  var band = exp(-x * x / ${f(PULSE_WIDTH_UM ** 2)});
  if (x < 0.0) { band = max(band, exp(x / ${f(PULSE_TAIL_UM)})); }
  return glow * max(band, ${f(PULSE_FLOOR)});
}`;

export const SPIKE_COLOUR_WGSL = /* wgsl */ `
fn spikeColour(own: vec3f, facing: f32, neon: vec2f, hue: vec4f) -> vec3f {
  let squared = clamp(facing, 0.0, 1.0) * clamp(facing, 0.0, 1.0);
  let most = max(own.r, max(own.g, max(own.b, 1e-4)));
  let bright = mix(own * min(neon.x, ${f(BRIGHTEST)} / most), hue.rgb * neon.x, hue.a);
  return bright + vec3f(${WHITE}) * neon.y * squared * squared;
}`;
