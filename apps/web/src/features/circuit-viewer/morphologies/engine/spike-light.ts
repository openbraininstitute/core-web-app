/**
 * How a spike lights a cell's morphology. The cell is lit from inside and unshaded, in its own colour brightened, or in
 * the spike's hue where the background has one, with a white-hot line along the middle of each fibre. The light is a
 * band that runs out from the soma and fades as the glow does, and the whole cell stays a little lit behind it. The
 * time since the spike is read back from the glow, which falls by a factor of e every afterglow.
 */

import { GLOW_POWER } from './cell-table';

import type { ThemeColors } from '@/features/viewer-3d/engine/looks';

/** How fast the band runs out from the soma, in µm per wall-clock second, and how wide its front and tail are, µm. */
const PULSE_UM_PER_S = 400;
const PULSE_WIDTH_UM = 30;
const PULSE_TAIL_UM = 120;
/** How lit the whole cell stays while it glows, as a share of the glow. */
const PULSE_FLOOR = 0.25;
/** How much a lit cell's colour is brightened, and how bright the line along the middle is, on each background. */
export const NEON: Record<keyof ThemeColors, [number, number]> = {
  light: [1.5, 0.6],
  dark: [1.4, 0.4],
};
/** How much of the line a soma gets: a soma faces the eye over its whole disc, so the full line makes a white blob. */
export const SOMA_LINE = 0.35;
/** The colour, in sRGB, a lit cell takes in place of its own on each background; null keeps its own. */
export const SPIKE_HUE: Record<keyof ThemeColors, string | null> = {
  light: '#00c8ff',
  dark: null,
};

/** A lit cell's own colour is not brightened past this linear value, so that a pale colour keeps its hue. */
const BRIGHTEST = 1.1;

const f = (v: number) => v.toFixed(6);
const WHITE = '1.0, 0.92, 0.8';
// The band has run PULSE_UM_PER_S * age, where age = -afterglow * ln( glow ) / GLOW_POWER.
const RUN = f(PULSE_UM_PER_S / GLOW_POWER);

/** `pulseFront`, per vertex, and `spikeLight` and `spikeColour`, per fragment, in GLSL. */
export const PULSE_FRONT_GLSL = /* glsl */ `
// How far, in µm, a point d µm from its soma is ahead of its cell's band, given the glow as the cell table stores it.
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
// A lit cell's linear colour, from its own colour and how squarely the surface faces the eye.
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
