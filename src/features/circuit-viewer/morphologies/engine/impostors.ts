/**
 * A segment and a soma drawn as one quad each, on a look's material: the vertex shader places the quad's corner on
 * screen, and the fragment shader hands the material the normal of the tube or the sphere under the pixel. The lights,
 * the tone mapping and the rest of the shading stay the look's.
 *
 * A segment's quad is flat: shaded as a cylinder across its width, at one depth, the tube's nearest. A soma's is a
 * sphere found per pixel, with its own depth.
 *
 * The same quads drawn in each cell's number in place of its shading tell which cell is under a pixel (`idMaterial`).
 */

import * as THREE from 'three';

import { addShaderHook } from '@/features/viewer-3d/engine/looks';

import { ROW_BITS } from './cell-table';

/** What the impostors' shaders read, one set a viewer. */
export interface ImpostorUniforms {
  /** The cell table's texture, and its glow beside it. */
  uCells: { value: THREE.Texture | null };
  uGlow: { value: THREE.Texture | null };
  /** The viewport that is drawn into, in device pixels: where it starts, x and y, then its width and height. */
  uViewport: { value: THREE.Vector4 };
  /** The cell that is highlighted, or `NO_CELL`, and the colour it is drawn in. */
  uHighlighted: { value: number };
  uHighlight: { value: THREE.Color };
  /**
   * The colour a glowing cell is ringed in, and in w how much: on a light background, where a cell lit near white would
   * read as fading out, and not on a dark one, where the ring would hide a thin one.
   */
  uGlowRim: { value: THREE.Vector4 };
}

/** No cell has this number: the cell table has not that many texels. */
export const NO_CELL = 0xffffffff;

/** The somas view's ring round a spiking soma. */
const GLOW_RIM = new THREE.Color('#4d4233');

export function impostorUniforms(): ImpostorUniforms {
  return {
    uCells: { value: null },
    uGlow: { value: null },
    uViewport: { value: new THREE.Vector4(0, 0, 1, 1) },
    uHighlighted: { value: NO_CELL },
    uHighlight: { value: new THREE.Color(0x000000) },
    uGlowRim: { value: new THREE.Vector4(GLOW_RIM.r, GLOW_RIM.g, GLOW_RIM.b, 1) },
  };
}

/** `pixelUm`, for a vertex shader that has `uViewport`. */
export const PIXEL_UM = /* glsl */ `
// The µm a device pixel spans at the view depth z.
float pixelUm( float z ) {
	float span = 2.0 / ( projectionMatrix[ 1 ][ 1 ] * uViewport.w );
	return isOrthographic ? span : span * max( - z, 1e-3 );
}
`;

const SHARED_VERTEX = /* glsl */ `
uniform highp sampler2D uCells;
uniform vec4 uViewport;
in uint aCell;

// The least radius a fibre is drawn with, in device pixels, so that a thin one far away is not left in dashes.
const float MIN_RADIUS = 0.75;

ivec2 cellXY() {
	return ivec2( int( aCell & ${(1 << ROW_BITS) - 1}u ), int( aCell >> ${ROW_BITS}u ) );
}
vec4 cellTexel() {
	return texelFetch( uCells, cellXY(), 0 );
}
${PIXEL_UM}
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
 * What a kind adds to each shader: `impostorCorner`, a corner of its quad in view space, false where it is not drawn,
 * no thinner than `least` device pixels, and `impostorNormal`, the normal under the pixel in view space, and in `edge`
 * how far the pixel is from the impostor's edge and its radius, both in device pixels.
 */
interface Kind {
  vertex: string;
  fragment: string;
}

const SEGMENT: Kind = {
  vertex: /* glsl */ `
in vec4 aA;
in vec4 aB;
flat out vec2 vSegmentA;
flat out vec2 vSegmentB;
flat out vec2 vSegmentRadii;

// The view point p brought nearer the eye by lift, where it stays on screen: by half its depth at most.
vec3 lifted( vec3 p, float lift ) {
	if ( isOrthographic ) return vec3( p.xy, p.z + lift );
	float z = p.z + min( lift, - 0.5 * p.z );
	return vec3( p.xy * ( z / p.z ), z );
}

// corner.x picks the end, corner.y the side.
bool impostorCorner( vec3 corner, float shown, float least, out vec3 P ) {
	if ( shown < 0.5 ) return false;
	vec3 a = ( viewMatrix * vec4( aA.xyz, 1.0 ) ).xyz;
	vec3 b = ( viewMatrix * vec4( aB.xyz, 1.0 ) ).xyz;
	float ra = aA.w, rb = aB.w;
	if ( ! isOrthographic ) {
		// Cut at twice the near plane's depth: nearer the eye an end has no place on screen, and up to there the lifted
		// quad stays behind the near plane.
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
	// As wide on screen as the wider end all along, and a little more: narrowing with the tube, the quad's side would
	// cut into the wider end.
	float wide = 1.15 * max( vSegmentRadii.x, vSegmentRadii.y ) * ( atB ? umB : umA );
	vec2 outward = ( atB ? along : - along ) + across * corner.y;
	P = lifted( vec3( end.xy + outward * wide, end.z ), atB ? rb : ra );
	return true;
}
`,
  fragment: /* glsl */ `
flat in vec2 vSegmentA;
flat in vec2 vSegmentB;
flat in vec2 vSegmentRadii;

// Round across the tube's width, and across only, as far from its edge, so that a round end carries on into the next
// segment without a seam.
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
flat out vec3 vSomaCentre;
flat out float vSomaRadius;
flat out float vSomaRadiusPx;
out vec3 vSomaPoint;

bool impostorCorner( vec3 corner, float shown, float least, out vec3 P ) {
	if ( shown < 0.5 ) return false;
	vec3 c = ( viewMatrix * vec4( aSoma.xyz, 1.0 ) ).xyz;
	float um = pixelUm( c.z );
	float r = max( aSoma.w, 1.5 * least * um );
	// How far from its centre the sphere reaches on screen, in µm at the centre's depth.
	float reach = r;
	if ( ! isOrthographic ) {
		// From d away, at the angle t off the view's axis, the sphere spans asin( r / d ) either way, and reaches
		// r / cos( t + asin( r / d ) ) outwards. lean / d2 is that cosine: under an eighth the eye is in the sphere, or all
		// but, and it is not drawn.
		float d2 = dot( c, c );
		float lean = - c.z * sqrt( max( d2 - r * r, 0.0 ) ) - length( c.xy ) * r;
		if ( 8.0 * lean < d2 ) return false;
		reach = r * d2 / lean;
	}
	// A little wider than the sphere. Its depth is the fragment shader's to write.
	P = vec3( c.xy + corner.xy * ( 1.2 * reach ), c.z );
	vSomaCentre = c;
	vSomaRadius = r;
	vSomaRadiusPx = r / um;
	vSomaPoint = P;
	return true;
}
`,
  fragment: /* glsl */ `
uniform mat4 projectionMatrix;
flat in vec3 vSomaCentre;
flat in float vSomaRadius;
flat in float vSomaRadiusPx;
in vec3 vSomaPoint;

// The sphere's own depth is written with it.
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
	// Seen at an angle off the normal, a point of the sphere is drawn its sine of the radius from the centre.
	float facing = dot( n, - ray );
	edge = vec2( vSomaRadiusPx * ( 1.0 - sqrt( max( 1.0 - facing * facing, 0.0 ) ) ), vSomaRadiusPx );
	return n;
}
`,
};

// A spike lights a cell as it does a soma of the somas view: brighter, nearer a warm white, shining, and ringed on a
// light background.
const LOOK_VERTEX = /* glsl */ `
uniform uint uHighlighted;
uniform vec3 uHighlight;
uniform highp sampler2D uGlow;
out float vGlow;

// The highlighted cell keeps the highlight.
float cellGlow() {
	return aCell == uHighlighted ? 0.0 : texelFetch( uGlow, cellXY(), 0 ).r;
}

// Brightened and taken a third of the way to the white in sRGB, as the somas view's.
vec3 cellColour( vec3 own, float glow ) {
	if ( aCell == uHighlighted ) return uHighlight;
	if ( glow == 0.0 ) return own;
	vec3 base = pow( own, vec3( 1.0 / 2.2 ) );
	vec3 hot = mix( min( base * 2.2, vec3( 1.0 ) ), vec3( 1.0, 0.97, 0.88 ), 0.35 );
	return pow( mix( base, hot, glow ), vec3( 2.2 ) );
}
`;

const LOOK_FRAGMENT = /* glsl */ `
uniform vec4 uGlowRim;
in float vGlow;

// A tenth of the radius in from the edge, a pixel at the least, as the somas view rings a soma.
float glowRim( vec2 edge ) {
	float width = max( 0.1 * edge.y, 1.0 );
	return vGlow * uGlowRim.a * ( 1.0 - smoothstep( width - 0.5, width + 0.5, edge.x ) );
}
`;

// A cell's number and one, a byte a channel, so that a pixel of zeros is no cell's.
const ID_VERTEX = /* glsl */ `
flat out vec4 vId;

void main() {
	vec3 corner;
	bool on = impostorCorner( position, cellTexel().a, MIN_RADIUS, corner );
	// Not drawn, its four corners are one point outside the view.
	gl_Position = on ? projectionMatrix * vec4( corner, 1.0 ) : vec4( 2.0, 2.0, 2.0, 1.0 );
	uint id = aCell + 1u;
	vId = vec4( id & 255u, ( id >> 8u ) & 255u, ( id >> 16u ) & 255u, id >> 24u ) / 255.0;
}
`;

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
 * colour from the cell table where the vertex colour would go, lit by its glow, and keeps `uniforms.uViewport` at what
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
          '\n\t#ifdef USE_COLOR\n\t\tvColor = vec4( cellColour( cell.rgb, vGlow ), 1.0 );\n\t#endif'
      )
      // The vertex normal is never shaded: the fragment shader finds its own. Glowing in full, a cell drawn at the
      // least width is drawn at twice it, to be seen.
      .replace(
        '#include <beginnormal_vertex>',
        'vec3 cornerView;' +
          '\n\tbool cornerOn = impostorCorner( position, cell.a, MIN_RADIUS * ( 1.0 + vGlow ), cornerView );' +
          '\n\tvec3 objectNormal = vec3( 0.0, 0.0, 1.0 );'
      )
      // Not drawn, its four corners are one point.
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
      // Lit where the lights do not reach as well.
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += 0.2 * vGlow * diffuseColor.rgb;'
      )
      .replace(
        '#include <opaque_fragment>',
        'outgoingLight = mix( outgoingLight, uGlowRim.rgb, glowRim( impostorEdge ) );' +
          '\n\t#include <opaque_fragment>'
      );
  });
}

/**
 * A material that draws the impostors of `kind` in their cells' numbers, where a cell is shown: the same quads, cut to
 * the same outlines and at the same depths as `impostor` draws them.
 */
export function idMaterial(kind: KindName, uniforms: ImpostorUniforms): THREE.ShaderMaterial {
  const { vertex, fragment } = KINDS[kind];
  const material = new THREE.ShaderMaterial({
    uniforms: { uCells: uniforms.uCells, uViewport: uniforms.uViewport },
    vertexShader: `${SHARED_VERTEX}\n${vertex}\n${ID_VERTEX}`,
    fragmentShader: `${fragment}\n${ID_FRAGMENT}`,
    blending: THREE.NoBlending,
  });
  followViewport(material, uniforms);
  return material;
}

/**
 * The cell drawn nearest the middle of a square of pixels `side` wide, drawn by `idMaterial` and read as RGBA bytes;
 * null where none is drawn in it.
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
