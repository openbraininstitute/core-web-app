/**
 * A segment and a soma drawn as one quad each, on a look's material: the vertex shader places the quad's corner on
 * screen, and the fragment shader hands the material the normal of the tube or the sphere under the pixel. The lights,
 * the tone mapping and the rest of the shading stay the look's.
 *
 * A segment's quad is flat: it is shaded as a cylinder across its width and drawn at one depth, the tube's nearest. A
 * soma's quad finds the sphere per pixel and writes the sphere's own depth.
 *
 * The same quads, drawn in each cell's number in place of its shading, tell which cell is under a pixel (`idMaterial`).
 */

import chroma from 'chroma-js';
import * as THREE from 'three';

import { DEFAULT_SPIKE_AFTERGLOW_IN_SECONDS } from '@/features/circuit-viewer/spike-clock';
import { addShaderHook } from '@/features/viewer-3d/engine/looks';

import { BY_SECTION, ROW_BITS } from './cell-table';
import { NEON, PULSE_FRONT_GLSL, SOMA_LINE, SPIKE_LIGHT_GLSL } from './spike-light';

import type { SectionColors } from '../types';

/** What the impostors' shaders read: one set per viewer. */
export interface ImpostorUniforms {
  /** The cell table's texture, and its glow beside it. */
  uCells: { value: THREE.Texture | null };
  uGlow: { value: THREE.Texture | null };
  /** Each cell's soma, laid out as the cell table (`somaTexture`). */
  uSomas: { value: THREE.Texture | null };
  /** The seconds a spike takes to fade to 1/e, and how a spike lights a cell on the background (`NEON`). */
  uAfterglow: { value: number };
  uNeon: { value: THREE.Vector2 };
  /** The colour a lit cell takes, linear, and in w how much of it (`SPIKE_HUE`). */
  uSpikeHue: { value: THREE.Vector4 };
  /** The viewport that is drawn into, in device pixels: where it starts, x and y, then its width and height. */
  uViewport: { value: THREE.Vector4 };
  /** Added to every position: where the data's origin is in the view's. */
  uShift: { value: THREE.Vector3 };
  /** How far the morphologies are morphed into their dendrograms, from 0 to 1. */
  uMix: { value: number };
  /** The cell that is highlighted, or `NO_CELL`, and the colour it is drawn in. */
  uHighlighted: { value: number };
  uHighlight: { value: THREE.Color };
  /**
   * The colour of the ring round a glowing soma in the somas view, and in w how much of it. The ring shows on a light
   * background, where a soma lit near white would seem to fade out, and not on a dark one, where it would hide a small
   * soma.
   */
  uGlowRim: { value: THREE.Vector4 };
  /** The colours of a cell drawn in its sections' colours, by SWC's numbers: unknown, soma, axon, basal, apical. */
  uSectionColours: { value: THREE.Color[] };
  /** The section type not drawn, besides holes; `HOLE` for none. */
  uHidden: { value: number };
}

/** No cell has this number: the cell table has fewer texels. */
export const NO_CELL = 0xffffffff;
/** The section type of a segment that is not drawn: a place in a buffer that no box holds. */
export const HOLE = 255;
/** An axon's section type, as SWC numbers it. */
export const AXON = 2;
/** A segment's cell and section type share a word: the type in its top byte, the cell below, under 2^24. */
export const TYPE_SHIFT = 24;
export const CELL_MASK = (1 << TYPE_SHIFT) - 1;
/** The word of a hole. */
export const HOLE_WORD = (HOLE << TYPE_SHIFT) >>> 0;

/** Each segment's cell and type in one word (`TYPE_SHIFT`), written into `words` from `at`. */
export function packCellTypes(
  cells: ArrayLike<number>,
  types: ArrayLike<number>,
  words: Uint32Array = new Uint32Array(cells.length),
  at = 0
): Uint32Array {
  for (let i = 0; i < cells.length; i++)
    words[at + i] = (cells[i] | (types[i] << TYPE_SHIFT)) >>> 0;
  return words;
}

/** The least radius a fibre is drawn with, in device pixels, so that a thin one far away is not left in dashes. */
export const MIN_RADIUS = 0.75;
/** How far a segment's quad reaches from its line, in the wider end's radii on screen: a little past the tube. */
export const QUAD_REACH = 1.15;

/** The somas view's ring round a spiking soma, in sRGB. */
export const GLOW_RIM_COLOR = '#4d4233';
const GLOW_RIM = new THREE.Color(GLOW_RIM_COLOR);

export function impostorUniforms(): ImpostorUniforms {
  return {
    uCells: { value: null },
    uGlow: { value: null },
    uSomas: { value: null },
    uAfterglow: { value: DEFAULT_SPIKE_AFTERGLOW_IN_SECONDS },
    uNeon: { value: new THREE.Vector2(...NEON.light) },
    uSpikeHue: { value: new THREE.Vector4() },
    uViewport: { value: new THREE.Vector4(0, 0, 1, 1) },
    uShift: { value: new THREE.Vector3() },
    uMix: { value: 0 },
    uHighlighted: { value: NO_CELL },
    uHighlight: { value: new THREE.Color(0x000000) },
    uGlowRim: { value: new THREE.Vector4(GLOW_RIM.r, GLOW_RIM.g, GLOW_RIM.b, 1) },
    uSectionColours: { value: Array.from({ length: 5 }, () => new THREE.Color()) },
    uHidden: { value: HOLE },
  };
}

/** Set `uniforms` to draw in `colors`. */
export function setSectionColours(uniforms: ImpostorUniforms, colors: SectionColors): void {
  const { unknown, soma, axon, basalDendrite, apicalDendrite } = colors;
  [unknown, soma, axon, basalDendrite, apicalDendrite].forEach((color, type) => {
    uniforms.uSectionColours.value[type].set(chroma.valid(color) ? color : unknown);
  });
}

/** What every shader that draws cells needs, the soma cloud's included. */
export const CELL_GLSL = /* glsl */ `
ivec2 cellXY( uint cell ) {
	return ivec2( int( cell & ${(1 << ROW_BITS) - 1}u ), int( cell >> ${ROW_BITS}u ) );
}
// The cell's number plus one, a byte per channel, so that a pixel of zeros belongs to no cell.
vec4 cellId( uint cell ) {
	uint id = cell + 1u;
	return vec4( id & 255u, ( id >> 8u ) & 255u, ( id >> 16u ) & 255u, id >> 24u ) / 255.0;
}
// Brightens the colour and takes it a third of the way to a warm white, in sRGB, as the somas view lights a spiking
// soma.
vec3 glowing( vec3 colour, float glow ) {
	vec3 hot = mix( min( colour * 2.2, vec3( 1.0 ) ), vec3( 1.0, 0.97, 0.88 ), 0.35 );
	return mix( colour, hot, glow );
}
// Where the corners of a cell that is not drawn go: one point outside the view.
const vec4 NOWHERE = vec4( 2.0, 2.0, 2.0, 1.0 );
`;

/**
 * `geometry` with the attributes that place the segments' quads: both ends of each segment as x, y, z and radius, eight
 * floats per segment; the same in the dendrogram (`charted`, a copy of the ends where none was charted); and each
 * segment's cell and type in one word (`packCellTypes`).
 */
export function segmentAttributes(
  geometry: THREE.InstancedBufferGeometry,
  ends: THREE.InstancedInterleavedBuffer,
  charted: THREE.InstancedInterleavedBuffer,
  cellTypes: THREE.InstancedBufferAttribute
): THREE.InstancedBufferGeometry {
  return geometry
    .setAttribute('aA', new THREE.InterleavedBufferAttribute(ends, 4, 0))
    .setAttribute('aB', new THREE.InterleavedBufferAttribute(ends, 4, 4))
    .setAttribute('aChartA', new THREE.InterleavedBufferAttribute(charted, 4, 0))
    .setAttribute('aChartB', new THREE.InterleavedBufferAttribute(charted, 4, 4))
    .setAttribute('aCell', cellTypes);
}

/** A quad's corners, x, y, z after one another, and its two triangles, which face the eye. */
const CORNERS = [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0];
const TRIANGLES = [0, 1, 2, 2, 1, 3];

/** `instances` of one shape; the caller adds the attributes that a shader places each instance by. */
export function instancedGeometry(
  corners: number[],
  triangles: number[],
  instances: number
): THREE.InstancedBufferGeometry {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3));
  geometry.setIndex(triangles);
  geometry.instanceCount = instances;
  return geometry;
}

/** `instances` quads. */
export function quadGeometry(instances: number): THREE.InstancedBufferGeometry {
  return instancedGeometry(CORNERS, TRIANGLES, instances);
}

/** `pixelUm`, for a vertex shader that has `uViewport`. */
export const PIXEL_UM = /* glsl */ `
// The µm a device pixel spans at the view depth z.
float pixelUm( float z ) {
	float span = 2.0 / ( projectionMatrix[ 1 ][ 1 ] * uViewport.w );
	return isOrthographic ? span : span * max( - z, 1e-3 );
}
`;

/** `lifted`, for a vertex shader: as `VIEW_WGSL` has it. */
export const LIFTED = /* glsl */ `
// Brings the view point p nearer the eye by lift without moving it on screen: by at most half its depth, and never
// past the near plane.
vec3 lifted( vec3 p, float lift ) {
	if ( isOrthographic ) return vec3( p.xy, p.z + lift );
	float near = projectionMatrix[ 3 ][ 2 ] / ( projectionMatrix[ 2 ][ 2 ] - 1.0 );
	float z = max( p.z, min( p.z + lift, min( 0.5 * p.z, - 1.01 * near ) ) );
	return vec3( p.xy * ( z / p.z ), z );
}
`;

const SHARED_VERTEX = /* glsl */ `
uniform highp sampler2D uCells;
uniform highp sampler2D uSomas;
uniform vec4 uViewport;
uniform vec3 uShift;
uniform float uMix;
uniform uint uHidden;
in uint aCell;

const float MIN_RADIUS = ${MIN_RADIUS.toFixed(6)};

${CELL_GLSL}
// A segment's word has its type in the top byte.
uint impostorCell() {
	return aCell & ${CELL_MASK}u;
}
vec4 cellTexel() {
	return texelFetch( uCells, cellXY( impostorCell() ), 0 );
}
${PIXEL_UM}
${LIFTED}
// Where a view point is drawn, as gl_FragCoord counts pixels.
vec2 toPixels( vec3 p ) {
	vec4 clip = projectionMatrix * vec4( p, 1.0 );
	return uViewport.xy + ( clip.xy / clip.w * 0.5 + 0.5 ) * uViewport.zw;
}
vec3 viewToWorld( vec3 v ) {
	return transpose( mat3( viewMatrix ) ) * ( v - viewMatrix[ 3 ].xyz );
}
`;

/**
 * What a kind adds to each shader. `impostorCorner` gives a corner of its quad in view space, no thinner than `least`
 * device pixels, and returns false where the impostor is not drawn. `somaDistance` gives how far the corner's end is
 * from its cell's soma, in µm. `impostorNormal` gives the normal under the pixel in view space, and in `edge` how far
 * the pixel is from the impostor's edge and its radius, both in device pixels.
 */
interface Kind {
  vertex: string;
  fragment: string;
}

const SEGMENT: Kind = {
  vertex: /* glsl */ `
in vec4 aA;
in vec4 aB;
in vec4 aChartA;
in vec4 aChartB;
flat out vec2 vSegmentA;
flat out vec2 vSegmentB;
flat out vec2 vSegmentRadii;

float sectionType() {
	return float( aCell >> ${TYPE_SHIFT}u );
}

// corner.x picks the end, corner.y the side.
bool impostorCorner( vec3 corner, float shown, float least, out vec3 P ) {
	uint segmentType = aCell >> ${TYPE_SHIFT}u;
	if ( shown < 0.5 || segmentType == ${HOLE}u || segmentType == uHidden ) return false;
	vec4 A = mix( aA, aChartA, uMix );
	vec4 B = mix( aB, aChartB, uMix );
	vec3 a = ( viewMatrix * vec4( A.xyz + uShift, 1.0 ) ).xyz;
	vec3 b = ( viewMatrix * vec4( B.xyz + uShift, 1.0 ) ).xyz;
	float ra = A.w, rb = B.w;
	if ( ! isOrthographic ) {
		// Cut the segment at twice the near plane's depth. An end nearer the eye than that has no place on screen, and up
		// to that depth the lifted quad stays behind the near plane.
		float cut = - 2.0 * projectionMatrix[ 3 ][ 2 ] / ( projectionMatrix[ 2 ][ 2 ] - 1.0 );
		if ( min( a.z, b.z ) > cut ) return false;
		if ( a.z > cut ) {
			float t = ( cut - b.z ) / ( a.z - b.z );
			a = mix( b, a, t );
			ra = mix( rb, ra, t );
		} else if ( b.z > cut ) {
			float t = ( cut - a.z ) / ( b.z - a.z );
			b = mix( a, b, t );
			rb = mix( ra, rb, t );
		}
	}
	float umA = pixelUm( a.z ), umB = pixelUm( b.z );
	ra = max( ra, least * umA );
	rb = max( rb, least * umB );
	vSegmentA = toPixels( a );
	vSegmentB = toPixels( b );
	vSegmentRadii = vec2( ra / umA, rb / umB );
	vec2 along = vSegmentB - vSegmentA;
	float len = length( along );
	along = len > 1e-6 ? along / len : vec2( 1.0, 0.0 );
	vec2 across = vec2( - along.y, along.x );
	bool atB = corner.x > 0.0;
	vec3 end = atB ? b : a;
	// Keep the quad as wide on screen as the wider end along its whole length, plus a little. If the quad narrowed with
	// the tube, its side would cut into the wider end.
	float wide = ${QUAD_REACH} * max( vSegmentRadii.x, vSegmentRadii.y ) * ( atB ? umB : umA );
	vec2 outward = ( atB ? along : - along ) + across * corner.y;
	P = lifted( vec3( end.xy + outward * wide, end.z ), atB ? rb : ra );
	return true;
}

// Measured from the real ends, not the dendrogram's. A cell with no place for its soma is lit as if its soma were at
// the corner's end.
float somaDistance( vec3 corner ) {
	vec4 soma = texelFetch( uSomas, cellXY( impostorCell() ), 0 );
	return soma.w > 0.5 ? distance( ( corner.x > 0.0 ? aB : aA ).xyz, soma.xyz ) : 0.0;
}
`,
  fragment: /* glsl */ `
flat in vec2 vSegmentA;
flat in vec2 vSegmentB;
flat in vec2 vSegmentRadii;

// The normal is round across the tube's width only, set by how far the pixel is from the edge, so that a round end
// carries on into the next segment without a seam.
vec3 impostorNormal( out vec2 edge ) {
	vec2 q = gl_FragCoord.xy;
	vec2 ab = vSegmentB - vSegmentA;
	float l2 = dot( ab, ab );
	float t = l2 > 0.0 ? clamp( dot( q - vSegmentA, ab ) / l2, 0.0, 1.0 ) : 0.0;
	float r = mix( vSegmentRadii.x, vSegmentRadii.y, t );
	if ( length( q - vSegmentA - ab * t ) > r ) discard;
	vec2 across = l2 > 0.0 ? normalize( vec2( - ab.y, ab.x ) ) : vec2( 0.0, 1.0 );
	float s = clamp( dot( q - vSegmentA, across ) / max( r, 1e-3 ), - 1.0, 1.0 );
	edge = vec2( r * ( 1.0 - abs( s ) ), r );
	return vec3( across * s, sqrt( max( 1.0 - s * s, 0.0 ) ) );
}
`,
};

const SOMA: Kind = {
  vertex: /* glsl */ `
in vec4 aSoma;
in vec4 aSomaChart;
flat out vec3 vSomaCentre;
flat out float vSomaRadius;
flat out float vSomaRadiusPx;
out vec3 vSomaPoint;

float sectionType() {
	return 1.0;
}

bool impostorCorner( vec3 corner, float shown, float least, out vec3 P ) {
	if ( shown < 0.5 ) return false;
	vec4 S = mix( aSoma, aSomaChart, uMix );
	vec3 c = ( viewMatrix * vec4( S.xyz + uShift, 1.0 ) ).xyz;
	float um = pixelUm( c.z );
	float r = max( S.w, 1.5 * least * um );
	// How far from its centre the sphere reaches on screen, in µm at the centre's depth.
	float reach = r;
	if ( ! isOrthographic ) {
		// Seen from d away, at the angle t off the view's axis, the sphere spans asin( r / d ) either way and reaches
		// r / cos( t + asin( r / d ) ) outwards. lean / d2 is that cosine. Below an eighth, the eye is inside the sphere
		// or nearly so, and the soma is not drawn.
		float d2 = dot( c, c );
		float lean = - c.z * sqrt( max( d2 - r * r, 0.0 ) ) - length( c.xy ) * r;
		if ( 8.0 * lean < d2 ) return false;
		reach = r * d2 / lean;
	}
	// Make the quad a little wider than the sphere. The fragment shader writes its depth.
	P = vec3( c.xy + corner.xy * ( 1.2 * reach ), c.z );
	vSomaCentre = c;
	vSomaRadius = r;
	vSomaRadiusPx = r / um;
	vSomaPoint = P;
	return true;
}

float somaDistance( vec3 corner ) {
	return 0.0;
}
`,
  fragment: /* glsl */ `
uniform mat4 projectionMatrix;
flat in vec3 vSomaCentre;
flat in float vSomaRadius;
flat in float vSomaRadiusPx;
in vec3 vSomaPoint;

// Also writes the sphere's own depth.
vec3 impostorNormal( out vec2 edge ) {
	vec3 ray = isOrthographic ? vec3( 0.0, 0.0, - 1.0 ) : normalize( vSomaPoint );
	vec3 from = isOrthographic ? vec3( vSomaPoint.xy, vSomaCentre.z + 2.0 * vSomaRadius ) : vec3( 0.0 );
	vec3 oc = from - vSomaCentre;
	float b = dot( oc, ray );
	float h = b * b - dot( oc, oc ) + vSomaRadius * vSomaRadius;
	if ( h < 0.0 ) discard;
	vec3 p = from + ray * ( - b - sqrt( h ) );
	vec4 clip = projectionMatrix * vec4( p, 1.0 );
	gl_FragDepth = clip.z / clip.w * 0.5 + 0.5;
	vec3 n = normalize( p - vSomaCentre );
	// A point of the sphere seen at an angle off its normal is drawn the sine of that angle times the radius from the
	// centre.
	float facing = dot( n, - ray );
	edge = vec2( vSomaRadiusPx * ( 1.0 - sqrt( max( 1.0 - facing * facing, 0.0 ) ) ), vSomaRadiusPx );
	return n;
}
`,
};

// A spike lights a cell from inside (`spike-light.ts`).
const LOOK_VERTEX = /* glsl */ `
uniform uint uHighlighted;
uniform vec3 uHighlight;
uniform highp sampler2D uGlow;
uniform vec3 uSectionColours[ 5 ];
uniform float uAfterglow;
out float vGlow;
out float vPulse;
${PULSE_FRONT_GLSL}

// Defined by the kind.
float sectionType();

// The cell table marks a cell drawn in its sections' colours with an alpha just under opaque.
vec3 ownColour( vec4 cell ) {
	if ( cell.a > ${(BY_SECTION + 0.5) / 255} ) return cell.rgb;
	int type = int( sectionType() + 0.5 );
	return uSectionColours[ type >= 0 && type < 5 ? type : 0 ];
}

// The highlighted cell keeps the highlight.
float cellGlow() {
	uint cell = impostorCell();
	return cell == uHighlighted ? 0.0 : texelFetch( uGlow, cellXY( cell ), 0 ).r;
}

vec3 cellColour( vec3 own ) {
	return impostorCell() == uHighlighted ? uHighlight : own;
}
`;

const LOOK_FRAGMENT = /* glsl */ `
uniform vec2 uNeon;
uniform vec4 uSpikeHue;
in float vGlow;
in float vPulse;
${SPIKE_LIGHT_GLSL}
`;

/** `id` the number the impostor is drawn in. */
const idVertex = (id: string) => /* glsl */ `
flat out vec4 vId;

void main() {
	vec3 corner;
	bool on = impostorCorner( position, cellTexel().a, MIN_RADIUS, corner );
	gl_Position = on ? projectionMatrix * vec4( corner, 1.0 ) : NOWHERE;
	vId = cellId( ${id} );
}
`;

/** How each kind is numbered in a pass of the segments: a segment by its own number, a soma after all the segments. */
const SEGMENT_NUMBERS: Record<KindName, string> = {
  segment: 'uint( gl_InstanceID )',
  soma: 'uSegments + impostorCell()',
};

const ID_FRAGMENT = /* glsl */ `
flat in vec4 vId;

void main() {
	vec2 edge;
	impostorNormal( edge );
	gl_FragColor = vId;
}
`;

const KINDS = { segment: SEGMENT, soma: SOMA };
type KindName = keyof typeof KINDS;

const NEON_OF: Record<KindName, string> = {
  segment: 'uNeon',
  soma: `uNeon * vec2( 1.0, ${SOMA_LINE.toFixed(6)} )`,
};

/** Keep `uniforms.uViewport` at what `material` is drawn into. */
export function followViewport(
  material: THREE.Material,
  uniforms: Pick<ImpostorUniforms, 'uViewport'>
): void {
  const before = material.onBeforeRender;
  material.onBeforeRender = (renderer, ...rest) => {
    before.call(material, renderer, ...rest);
    renderer.getCurrentViewport(uniforms.uViewport.value);
  };
}

/**
 * Draw `material`, one of three's own lit materials with `vertexColors`, as impostors of `kind`. It reads the cell's
 * colour from the cell table where the vertex colour would go, lit by a spike, and keeps `uniforms.uViewport` at what
 * it is drawn into.
 */
export function impostor<T extends THREE.Material>(
  material: T,
  kind: KindName,
  uniforms: ImpostorUniforms
): T {
  const { vertex, fragment } = KINDS[kind];
  followViewport(material, uniforms);
  return addShaderHook(material, `impostor-${kind}`, (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\n${SHARED_VERTEX}\n${LOOK_VERTEX}\n${vertex}`
      )
      .replace(
        '#include <color_vertex>',
        'vec4 cell = cellTexel();\n\tvGlow = cellGlow();' +
          '\n\t#ifdef USE_COLOR\n\t\tvColor = vec4( cellColour( ownColour( cell ) ), 1.0 );\n\t#endif'
      )
      // The vertex normal is never shaded: the fragment shader finds its own. A cell that glows in full and is drawn
      // at the least width is drawn at twice that width, so that it can be seen.
      .replace(
        '#include <beginnormal_vertex>',
        'vec3 cornerView;' +
          '\n\tbool cornerOn = impostorCorner( position, cell.a, MIN_RADIUS * ( 1.0 + vGlow ), cornerView );' +
          '\n\tvPulse = vGlow > 0.0 ? pulseFront( somaDistance( position ), vGlow, uAfterglow ) : 0.0;' +
          '\n\tvec3 objectNormal = vec3( 0.0, 0.0, 1.0 );'
      )
      // An impostor that is not drawn has its four corners at one point.
      .replace(
        '#include <begin_vertex>',
        'vec3 transformed = cornerOn ? viewToWorld( cornerView ) : vec3( 0.0 );'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${fragment}\n${LOOK_FRAGMENT}`)
      .replace(
        '#include <normal_fragment_begin>',
        '#include <normal_fragment_begin>\n\tvec2 impostorEdge;' +
          '\n\tnormal = impostorNormal( impostorEdge );\n\tnonPerturbedNormal = normal;'
      )
      .replace(
        '#include <opaque_fragment>',
        'float spiking = spikeLight( vPulse, vGlow );' +
          `\n\toutgoingLight = mix( outgoingLight, spikeColour( vColor.rgb, normal.z, ${NEON_OF[kind]}, uSpikeHue ), spiking );` +
          '\n\t#include <opaque_fragment>'
      );
  });
}

/**
 * A material that draws the impostors of `kind` in their cells' numbers, where a cell is shown: the same quads, cut to
 * the same outlines and at the same depths as `impostor` draws them. With `segments`, it draws them in the segments'
 * numbers instead, and a soma in its cell's number after those: `uSegments` + its cell.
 */
export function idMaterial(
  kind: KindName,
  uniforms: ImpostorUniforms,
  segments?: { uSegments: { value: number } }
): THREE.ShaderMaterial {
  const { vertex, fragment } = KINDS[kind];
  const declared = segments && kind === 'soma' ? 'uniform uint uSegments;\n' : '';
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uCells: uniforms.uCells,
      uViewport: uniforms.uViewport,
      uShift: uniforms.uShift,
      uMix: uniforms.uMix,
      uHidden: uniforms.uHidden,
      ...segments,
    },
    vertexShader: `${SHARED_VERTEX}\n${declared}${vertex}\n${idVertex(segments ? SEGMENT_NUMBERS[kind] : 'impostorCell()')}`,
    fragmentShader: `${fragment}\n${ID_FRAGMENT}`,
    blending: THREE.NoBlending,
  });
  followViewport(material, uniforms);
  return material;
}

/**
 * The cell drawn nearest the middle of a square of pixels `side` wide, drawn by `idMaterial` and read back as RGBA
 * bytes; null where no cell is drawn in it.
 */
export function cellNearMiddle(pixels: Uint8Array, side: number): number | null {
  const middle = (side - 1) / 2;
  let cell: number | null = null;
  let least = Number.POSITIVE_INFINITY;
  for (let i = 0; i < side * side; i++) {
    const id =
      (pixels[4 * i] |
        (pixels[4 * i + 1] << 8) |
        (pixels[4 * i + 2] << 16) |
        (pixels[4 * i + 3] << 24)) >>>
      0;
    if (id === 0) continue;
    const away = Math.hypot((i % side) - middle, Math.floor(i / side) - middle);
    if (away < least) {
      least = away;
      cell = id - 1;
    }
  }
  return cell;
}
