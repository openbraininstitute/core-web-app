/**
 * Shading and lighting styles ("looks") for the viewer.
 *
 * Every look owns a material for the morphology mesh, an optional light rig
 * that rides on the camera so the lighting stays put while orbiting, and a
 * background gradient. Three looks reflect an image-based environment (a
 * procedural room from three.js, no asset files), the clay look uses a
 * procedural matcap, and the toon look adds an inverted-hull outline as many
 * pixels wide at any distance (`OUTLINE_WIDTH`).
 *
 * Most materials multiply the per-vertex SWC type colour; the microscopy looks
 * (SEM, Golgi, EM segmentation), Cajal and gold leaf ignore it, EM segmentation
 * up to an optional faint tint, and the fluorescence look maps the type to a
 * channel through the `swcType` vertex attribute. The depth-coded look colours
 * the cell by its depth in front of the camera instead, over a range the
 * viewer keeps up to date (`setDepthRange`). All but Cajal go through the
 * renderer's ACES tone mapping. Backgrounds are CSS gradients behind a
 * transparent canvas, so tone mapping and post-processing never touch them.
 *
 * Every look's vertex shader also carries the bumps (`BUMP_GLSL`): an organic
 * roughness of the surface, displaced along the shading normal by a noise of
 * the world position and scaled by the `radius` vertex attribute, with the
 * normal tilted to follow. It lives in the shader, not in the mesh: the build,
 * its checks and the exports never see it, it costs nothing per build, and it
 * shows on the long strips of a swept tube where there are no vertices to move.
 * The EM segmentation look also shades them per fragment (`withFragmentBumps`).
 * The same hook (`withDisplacement`) can widen a fibre thinner than a few
 * pixels on screen (`WIDEN_GLSL`), so that a whole-cell view of a large cell
 * is not left blank.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface Look {
  id: string;
  label: string;
  /** One line for the UI. */
  hint: string;
  material: THREE.Material;
  /** Background gradient (top, bottom) as CSS colours, for the light and the dark theme. */
  background: { light: [string, string]; dark: [string, string] };
  /** Lights that follow the camera; shown only while the look is active. */
  rig?: THREE.Group;
  /** Whether the image-based environment lights this look. */
  env?: boolean;
  /** Material of the inverted-hull outline mesh, if the look draws one. */
  outline?: THREE.Material;
  /** Depth cue: fog towards the background. The viewer keeps its range tied to the camera distance. */
  fog?: THREE.Fog;
  /** Add a bloom pass in the single view (glow for the fluorescence look). */
  bloom?: boolean;
  /** Clipping plane the viewer keeps through the orbit target, facing the camera. */
  clip?: THREE.Plane;
  /** Called when the theme changes, for looks whose materials depend on it. */
  onTheme?: (dark: boolean) => void;
  /** Bumps the page switches on, with these parameters, when the look is chosen; looks without leave the bumps as they are. */
  bumps?: BumpParams;
  /** Whether the page switches the ambient occlusion on when the look is chosen. */
  ao?: boolean;
  /**
   * What the neurite colours (section or distance, written into the vertex colours) do in this look: they colour it,
   * they tint it while the type tint is on (`showTypeTint`), or nothing, as it draws in colours of its own.
   */
  colors: 'palette' | 'tint' | 'own';
  /** The key to the look's own colours, where they mean something. */
  legend?: LookLegend;
}

export type LookLegend =
  | { kind: 'swatches'; items: { label: string; color: string }[] }
  | { kind: 'ramp'; stops: string[]; from: string; to: string };

// ---------------------------------------------------------------------------
// Bumps

/** The bumps' live parameters; see `BUMP_GLSL`. Every material starts with them off, at amplitude 0. */
export interface BumpParams {
  /** Peak displacement as a fraction of the local radius, 0 to `MAX_BUMP_AMPLITUDE`; 0 turns the bumps off. */
  amplitude: number;
  /** Size of a noise cell, µm: the width of the bumps. */
  scale: number;
  /**
   * 0 to 1. At 1 only the coarsest octave of the noise is left (the low-pass, a smooth waviness); towards 0 a second
   * and a third octave at twice and four times the frequency come in. This is the "smoothing" of the displacement.
   */
  smoothness: number;
}

/** Bumps at most this fraction of the radius, whatever the parameters: past it thin fibres pinch and tubes self-intersect. */
export const MAX_BUMP_AMPLITUDE = 0.2;

export const DEFAULT_LOOK = 'studio';

/**
 * One set of uniform objects shared by every material, so that a change reaches all of them, the compare tiles and
 * the ambient-occlusion pass included.
 */
const bumpUniforms = {
  uBumpAmp: { value: 0 },
  uBumpScale: { value: 1 },
  /** Octaves, 1 to 3, fractional between: 1 + 2 × (1 − smoothness). */
  uBumpDetail: { value: 1 },
};

export function setBumpParams(p: BumpParams): void {
  bumpUniforms.uBumpAmp.value = Math.max(0, Math.min(MAX_BUMP_AMPLITUDE, p.amplitude));
  bumpUniforms.uBumpScale.value = Math.max(1e-3, p.scale);
  bumpUniforms.uBumpDetail.value = 1 + 2 * (1 - Math.max(0, Math.min(1, p.smoothness)));
}

/**
 * GLSL of a gradient noise with its gradient, for either shader stage, and of the integer hash of a lattice cell it
 * is built on. The bumps are made of it, and the gold leaf's flakes are placed by the hash.
 *
 * The noise is a function of the world position alone, so a vertex displaces the same wherever it is drawn from
 * and a cell gets the same bumps from one build to the next, and the cells are hashed as integers (pcg3d): a `sin`-based hash of a millimetre-wide cell
 * would swim at the far end, where floats have no bits left for the fraction. The vertex positions are relative to
 * the mesh centre, so what reaches the hash is about 2 000 cells at most at the finest scale, with a fraction good
 * to 10⁻⁴ of a cell. It is gradient noise, not value noise: value noise is flat at every lattice point, and a
 * surface shaded per fragment (`withFragmentBumps`) shows those flat spots as a grid of lumps. The corners are
 * blended by a quintic, whose analytic gradient is what the displacement's slope is taken from (Quilez): no second
 * evaluation for finite differences. Scaled by 1.2, a sample of 3 million points peaks at ±0.99 with a standard
 * deviation of 0.23, and a median slope of 0.94 per unit of the argument.
 */
const NOISE_GLSL = /* glsl */ `
uvec3 latticeHash( uvec3 v ) {
	v = v * 1664525u + 1013904223u;
	v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
	v ^= v >> 16u;
	v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
	return v;
}
// Three numbers in [0, 1) for the lattice cell c, different ones for another salt.
vec3 latticeRandom( vec3 c, uint salt ) {
	return vec3( latticeHash( uvec3( ivec3( c ) ) + uvec3( salt, 2u * salt, 3u * salt ) ) ) * ( 1.0 / 4294967296.0 );
}
// A lattice corner o of cell q, at w within the cell: its gradient's value there (x) and the gradient (yzw), each
// gradient component in [-1, 1].
vec4 noiseCorner( uvec3 q, vec3 w, vec3 o ) {
	vec3 g = vec3( latticeHash( q + uvec3( o ) ) ) * ( 2.0 / 4294967296.0 ) - 1.0;
	return vec4( dot( g, w - o ), g );
}
// Gradient noise, about [-1, 1] (x), and its gradient (yzw), per unit of the argument.
vec4 gradientNoise( vec3 x ) {
	vec3 p = floor( x ), w = x - p;
	uvec3 q = uvec3( ivec3( p ) );
	vec3 u = w * w * w * ( w * ( w * 6.0 - 15.0 ) + 10.0 );
	vec3 du = 30.0 * w * w * ( w * ( w - 2.0 ) + 1.0 );
	vec4 a = noiseCorner( q, w, vec3( 0.0, 0.0, 0.0 ) ), b = noiseCorner( q, w, vec3( 1.0, 0.0, 0.0 ) );
	vec4 c = noiseCorner( q, w, vec3( 0.0, 1.0, 0.0 ) ), d = noiseCorner( q, w, vec3( 1.0, 1.0, 0.0 ) );
	vec4 e = noiseCorner( q, w, vec3( 0.0, 0.0, 1.0 ) ), f = noiseCorner( q, w, vec3( 1.0, 0.0, 1.0 ) );
	vec4 g = noiseCorner( q, w, vec3( 0.0, 1.0, 1.0 ) ), h = noiseCorner( q, w, vec3( 1.0, 1.0, 1.0 ) );
	vec4 k1 = b - a, k2 = c - a, k3 = e - a, k4 = a - b - c + d, k5 = a - c - e + g, k6 = a - b - e + f;
	vec4 k7 = - a + b + c - d + e - f - g + h;
	// One blend gives the value (x) and the corner gradients blended alike (yzw); the blend's own slope comes on top.
	vec4 n = a + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z;
	n.yzw += du * vec3(
		k1.x + k4.x * u.y + k6.x * u.z + k7.x * u.y * u.z,
		k2.x + k5.x * u.z + k4.x * u.x + k7.x * u.z * u.x,
		k3.x + k6.x * u.x + k5.x * u.y + k7.x * u.x * u.y );
	return 1.2 * n;
}
`;

/**
 * GLSL of the bumps' noise, for either shader stage: the uniforms, the noise, and `bumpField`, its octaves.
 * `BUMP_GLSL` below adds what a vertex shader needs to displace a point by it.
 */
const BUMP_NOISE_GLSL = /* glsl */ `
uniform float uBumpAmp;
uniform float uBumpScale;
uniform float uBumpDetail;
${NOISE_GLSL}
// Up to three octaves, the finer ones faded in by uBumpDetail, normalised to [-1, 1].
vec4 bumpField( vec3 x ) {
	vec4 sum = gradientNoise( x );
	float norm = 1.0;
	float w2 = clamp( uBumpDetail - 1.0, 0.0, 1.0 ), w3 = clamp( uBumpDetail - 2.0, 0.0, 1.0 );
	if ( w2 > 0.0 ) {
		vec4 n = gradientNoise( 2.0 * x + 17.0 );
		sum += 0.5 * w2 * vec4( n.x, 2.0 * n.yzw );
		norm += 0.5 * w2;
	}
	if ( w3 > 0.0 ) {
		vec4 n = gradientNoise( 4.0 * x + 41.0 );
		sum += 0.25 * w3 * vec4( n.x, 4.0 * n.yzw );
		norm += 0.25 * w3;
	}
	return sum / norm;
}
// The slope along a surface of unit normal n of bumps of peak height amp, from the field's gradient: the normal of the
// bumped surface is n minus it.
vec3 bumpSlope( vec3 gradient, vec3 n, float amp ) {
	vec3 g = ( amp / uBumpScale ) * gradient;
	return g - n * dot( g, n );
}
`;

/**
 * GLSL of the bumps for a vertex shader: the noise, the `radius` attribute, and `bumpDisplace`, which moves a point
 * (mesh coordinates, µm) along its unit normal by `amplitude × radius × noise` and tilts the normal by the noise's
 * slope, so that the lighting follows the bumps.
 */
const BUMP_GLSL = /* glsl */ `
${BUMP_NOISE_GLSL}
attribute float radius;

void bumpDisplace( inout vec3 p, inout vec3 n, float r ) {
	float amp = uBumpAmp * r;
	if ( amp <= 0.0 ) return;
	vec4 f = bumpField( p / uBumpScale );
	p += n * ( amp * f.x );
	n = normalize( n - bumpSlope( f.yzw, n, amp ) );
}
`;

// ---------------------------------------------------------------------------
// Width floor and pixel sizes

/**
 * Shared by every material like the bumps' uniforms. The least width, CSS pixels, 0 for off; and the height of the
 * viewport being drawn, which each material reads from the renderer as it is drawn (`withDisplacement`) and
 * `pixelSize` measures by.
 */
const widenUniforms = { uMinWidth: { value: 0 }, uViewHeight: { value: 1 } };
const viewport = new THREE.Vector4();

/** Draw every fibre about `pixels` CSS pixels wide at least; 0 turns it off. */
export function setWidthFloor(pixels: number): void {
  widenUniforms.uMinWidth.value = pixels;
}

/**
 * GLSL for a vertex shader of `pixelSize`, the length in mesh coordinates (µm, which the model matrix leaves
 * unscaled) of a CSS pixel at a point's depth, where the viewport's height spans 2 w / P[1][1] (w, the clip w, is the
 * depth); and of the width floor: `widenToPixels` pushes a point of a fibre of radius r out along its unit normal
 * until it lies half of `uMinWidth` pixels from the axis. Fibres that are wide enough, and points behind the camera,
 * are left alone. Out along the normal is away from the axis on a tube, and an offset of the surface on a patch.
 */
const WIDEN_GLSL = /* glsl */ `
uniform float uMinWidth;
uniform float uViewHeight;

float pixelSize( vec3 p ) {
	float w = projectionMatrix[ 2 ][ 3 ] * ( modelViewMatrix * vec4( p, 1.0 ) ).z + projectionMatrix[ 3 ][ 3 ];
	return 2.0 * w / ( projectionMatrix[ 1 ][ 1 ] * uViewHeight );
}

void widenToPixels( inout vec3 p, vec3 n, float r ) {
	if ( uMinWidth <= 0.0 ) return;
	float grow = 0.5 * uMinWidth * pixelSize( p ) - r;
	if ( grow > 0.0 ) p += n * grow;
}
`;

/**
 * Run `hook` on a material's shader after whatever `onBeforeCompile` it has. three caches programs by
 * `customProgramCacheKey`, by default the hook's source, which would be this same wrapper for every material: the
 * key is `name` in front of the key of what it wraps, so that two materials share a program only if their hooks do.
 */
export function addShaderHook<T extends THREE.Material>(
  m: T,
  name: string,
  hook: (shader: THREE.WebGLProgramParametersWithUniforms) => void
): T {
  const before = m.onBeforeCompile;
  const inner = m.customProgramCacheKey();
  m.onBeforeCompile = (shader, renderer) => {
    before.call(m, shader, renderer);
    hook(shader);
  };
  m.customProgramCacheKey = () => `${name}|${inner}`;
  return m;
}

/**
 * Add the bumps and the width floor to a material's vertex shader, after whatever `onBeforeCompile` it has, and hand
 * the width floor the height of each viewport the material is drawn in (as three's fat lines take their resolution:
 * compare tiles, passes and resizes alike). The shader must have
 * `#include <common>` and, in `main`, the `begin_vertex` chunk and (unless it has no use for a normal, like the
 * outline's) the `beginnormal_vertex` chunk, as three's own vertex shaders and the ShaderMaterials here do. The
 * bumps are made first thing in `main` and handed to whichever of the two chunks there are: a lit material
 * transforms its normal before it takes the position, so neither can be done where the other is. The width floor comes
 * after the bumps, along the normal they started from.
 */
export function withDisplacement<T extends THREE.Material>(m: T): T {
  const before = m.onBeforeRender;
  m.onBeforeRender = (renderer, ...rest) => {
    before.call(m, renderer, ...rest);
    widenUniforms.uViewHeight.value = Math.max(1, renderer.getViewport(viewport).w);
  };
  return addShaderHook(m, 'displace', (shader) => {
    Object.assign(shader.uniforms, bumpUniforms, widenUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${BUMP_GLSL}\n${WIDEN_GLSL}`)
      .replace(
        'void main() {',
        'void main() {\n\tvec3 displacedPosition = vec3( position ), displacedNormal = vec3( normal );' +
          '\n\tbumpDisplace( displacedPosition, displacedNormal, radius );\n\twidenToPixels( displacedPosition, normal, radius );'
      )
      .replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\n\tobjectNormal = displacedNormal;'
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n\ttransformed = displacedPosition;'
      );
  });
}

/** The fragment shader's part of `withFragmentBumps`, after `normal_fragment_maps`: the bumps' normal, per fragment. */
const FRAGMENT_BUMPS_GLSL = /* glsl */ `
	float bumpAmp = uBumpAmp * vBumpRadius;
	if ( bumpAmp > 0.0 ) {
		vec3 bumpN = normalize( vBumpNormal );
		vec3 bumpG = bumpSlope( bumpField( vBumpPosition / uBumpScale ).yzw, bumpN, bumpAmp );
		// No steeper than 45°: past it the normal of a bump's far side turns from the viewer and catches the rim light.
		normal = normalize( normalMatrix * ( bumpN - bumpG / max( 1.0, length( bumpG ) ) ) );
		#ifdef DOUBLE_SIDED
			normal *= faceDirection;
		#endif
	}
`;

/**
 * Shade the bumps per fragment, for a lit material of three's (it needs `normal_fragment_maps`). A vertex tilts its
 * normal by the bumps' slope at the vertex, and the triangle interpolates between: on a simplified soma, whose
 * triangles are as wide as a bump, that draws facets, and on a swept tube, whose rings are microns apart, nothing at
 * all. Here each fragment takes the noise again at its own point of the undisplaced surface and tilts the
 * interpolated normal there, so the bumps are shaded whatever the triangles. The displacement itself stays
 * `withDisplacement`'s, which must be applied on top: it declares the `radius` attribute and hands over the uniforms.
 */
function withFragmentBumps<T extends THREE.Material>(m: T): T {
  const varyings =
    'varying vec3 vBumpPosition;\nvarying vec3 vBumpNormal;\nvarying float vBumpRadius;';
  return addShaderHook(m, 'fragment-bumps', (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${varyings}`)
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n\tvBumpPosition = position;\n\tvBumpNormal = normal;\n\tvBumpRadius = radius;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\n${BUMP_NOISE_GLSL}\nuniform mat3 normalMatrix;\n${varyings}`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>\n${FRAGMENT_BUMPS_GLSL}`
      );
  });
}

export function backgroundCss(look: Look, dark: boolean): string {
  const [top, bottom] = look.background[dark ? 'dark' : 'light'];
  return `linear-gradient(${top}, ${bottom})`;
}

/** A directional light coming from direction `from` in camera space: x right, y up, z towards the viewer. */
function viewLight(
  color: number,
  intensity: number,
  from: [number, number, number]
): THREE.Object3D[] {
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(...from);
  return [light, light.target];
}

function rig(...items: THREE.Object3D[][]): THREE.Group {
  const g = new THREE.Group();
  for (const set of items) g.add(...set);
  return g;
}

function makeMatcap(
  stops: [number, string][],
  centre: [number, number] = [0.38, 0.34]
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(
    size * centre[0],
    size * centre[1],
    0,
    size * 0.5,
    size * 0.5,
    size * 0.52
  );
  for (const [t, c] of stops) grad.addColorStop(t, c);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeToonGradient(steps: number[]): THREE.DataTexture {
  const tex = new THREE.DataTexture(Uint8Array.from(steps), steps.length, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Add static per-pixel grain after tone mapping, like film or detector noise. */
function withGrain<T extends THREE.Material>(m: T, amount: number): T {
  return addShaderHook(m, 'grain', (shader) => {
    shader.uniforms.uGrain = { value: amount };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGrain;')
      .replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>\n\tgl_FragColor.rgb += ( rand( gl_FragCoord.xy ) - 0.5 ) * uGrain;'
      );
  });
}

/** Share of the type colours' hue a look takes with the type tint on; the rest is its own colour. */
const TYPE_TINT = 0.35;
const typeTintUniform = { value: 0 };

/** The page's type tint, for the looks that take the neurite colours as a tint (`Look.colors`). */
export function showTypeTint(on: boolean): void {
  typeTintUniform.value = on ? TYPE_TINT : 0;
}

/**
 * EM segmentation, as a segmented electron-microscopy volume is rendered (Neuroglancer, FlyWire, MICrONS): one matte
 * grey for the whole cell, the bumps shaded per fragment (`withFragmentBumps`), and, with the type tint on, a faint
 * tint of the type colours' hue.
 */
function makeEm(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: 0xb3aba1,
    roughness: 0.55,
    metalness: 0,
    vertexColors: true,
  });
  addShaderHook(m, 'type-tint', (shader) => {
    shader.uniforms.uTypeTint = typeTintUniform;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTypeTint;')
      .replace(
        '#include <color_fragment>',
        // The hue of the type colour at full brightness: the soma's grey leaves the look's own colour as it is.
        'diffuseColor.rgb *= mix( vec3( 1.0 ), vColor.rgb / max( max3( vColor.rgb ), 1e-3 ), uTypeTint );'
      );
  });
  return withGrain(withFragmentBumps(m), 0.03);
}

/**
 * The vertex shader of a ShaderMaterial here: three's chunks, which give the bumps (`withDisplacement`) their objectNormal
 * and transformed to work on, then `body` with the view-space normal n, position mv and direction to the eye viewDir
 * at hand.
 */
function vertexShader(declarations: string, body: string): string {
  return /* glsl */ `
      ${declarations}
      #include <common>
      void main() {
        #include <beginnormal_vertex>
        #include <begin_vertex>
        vec3 n = normalize( normalMatrix * objectNormal );
        vec4 mv = modelViewMatrix * vec4( transformed, 1.0 );
        // Towards the eye: one direction for a whole orthographic view.
        vec3 viewDir = isOrthographic ? vec3( 0.0, 0.0, 1.0 ) : normalize( - mv.xyz );
        ${body}
        gl_Position = projectionMatrix * mv;
      }`;
}

const FLUORESCENCE_DENDRITE = '#63ff5a';
const FLUORESCENCE_AXON = '#ff4d6a';

/**
 * Fluorescence: additive fresnel glow, so fibres look self-luminous, edges
 * brighter than faces, and overlapping fibres add up like a maximum-intensity
 * projection. Dendrites and soma in one channel, the axon in another.
 */
function makeFluorescence(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uDendrite: { value: new THREE.Color(FLUORESCENCE_DENDRITE) },
      uAxon: { value: new THREE.Color(FLUORESCENCE_AXON) },
      uPower: { value: 1.6 },
      uBase: { value: 0.05 },
      uGain: { value: 1.2 },
    },
    vertexShader: vertexShader(
      'attribute float swcType;\nvarying float vFresnel;\nvarying float vType;',
      'vFresnel = 1.0 - abs( dot( n, viewDir ) );\nvType = swcType;'
    ),
    fragmentShader: `
      uniform vec3 uDendrite;
      uniform vec3 uAxon;
      uniform float uPower;
      uniform float uBase;
      uniform float uGain;
      varying float vFresnel;
      varying float vType;
      void main() {
        vec3 c = vType == 2.0 ? uAxon : uDendrite;
        float f = pow( clamp( vFresnel, 0.0, 1.0 ), uPower );
        gl_FragColor = vec4( c * ( uBase + uGain * f ), 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

/**
 * Ink drawing: screen-space cross-hatching that thickens as the shading
 * darkens, plus a fresnel contour. Sepia ink on paper, or chalk on slate.
 */
function makeCajal(pixelRatio: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uInk: { value: new THREE.Color(0x2a1c10) },
      uPaper: { value: new THREE.Color(0xf4edda) },
      uSpacing: { value: 6 * pixelRatio },
    },
    vertexShader: vertexShader(
      'varying vec3 vNormal;\nvarying vec3 vView;',
      'vNormal = n;\nvView = viewDir;'
    ),
    fragmentShader: `
      uniform vec3 uInk;
      uniform vec3 uPaper;
      uniform float uSpacing;
      varying vec3 vNormal;
      varying vec3 vView;
      // 1 on a stroke, 0 between strokes.
      float stroke( float c ) { return 1.0 - smoothstep( 0.3, 0.5, abs( fract( c ) - 0.5 ) ); }
      void main() {
        vec3 n = normalize( vNormal );
        float lambert = clamp( dot( n, normalize( vec3( -0.45, 0.65, 0.75 ) ) ), 0.0, 1.0 );
        float tone = 0.2 + 0.8 * lambert;
        float edge = pow( 1.0 - abs( dot( n, normalize( vView ) ) ), 2.5 );
        vec2 p = gl_FragCoord.xy / uSpacing;
        float ink = smoothstep( 0.85, 0.6, tone ) * stroke( p.x + p.y );
        ink = max( ink, smoothstep( 0.6, 0.4, tone ) * stroke( p.x - p.y ) );
        ink = max( ink, smoothstep( 0.35, 0.2, tone ) * stroke( p.y * 1.4 ) );
        ink = max( ink, smoothstep( 0.5, 0.8, edge ) );
        gl_FragColor = vec4( mix( uPaper, uInk, ink ), 1.0 );
        #include <colorspace_fragment>
      }`,
  });
}

/**
 * Cutaway: a standard material with a clipping plane; back faces exposed by
 * the cut are drawn in a flat cut colour so tubes read as hollow sections.
 */
function makeCutaway(plane: THREE.Plane): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.6,
    metalness: 0,
    side: THREE.DoubleSide,
    clippingPlanes: [plane],
  });
  return addShaderHook(m, 'cutaway', (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\n\tif ( ! gl_FrontFacing ) diffuseColor.rgb = vec3( 0.84, 0.74, 0.60 );'
    );
  });
}

/** Width of the toon look's outline, CSS pixels. */
const OUTLINE_WIDTH = 1.5;

/**
 * Back faces pushed out along the normal by `OUTLINE_WIDTH` pixels at their depth: an outline as wide at any distance,
 * in any viewport. `pixelSize` is `withDisplacement`'s, which must be applied on top, and places the displaced point
 * in `transformed` before this pushes it out.
 */
function makeOutline(): THREE.Material {
  const m = new THREE.MeshBasicMaterial({ color: 0x14141c, side: THREE.BackSide });
  return addShaderHook(m, 'outline', (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n\ttransformed += normal * ( ${OUTLINE_WIDTH.toFixed(1)} * pixelSize( transformed ) );`
    );
  });
}

const depthRangeUniform = { value: new THREE.Vector2(0, 1) };

/** The depths, µm, that the depth-coded look's colours run over, near to far; the viewer sets them each frame (`depthSpan` in framing.ts). */
export function setDepthRange(near: number, far: number): void {
  depthRangeUniform.value.set(near, Math.max(far, near + 1e-3));
}

/**
 * A colour scale for a shader from evenly spaced CSS colours: its uniform (the colours linear, as three keeps them)
 * and the GLSL of the uniform and of `<name>At( t )`, the colour at t from 0 to 1, clamped.
 */
function colourRamp(
  name: string,
  stops: string[]
): { uniform: THREE.IUniform<THREE.Color[]>; glsl: string } {
  const n = stops.length;
  return {
    uniform: { value: stops.map((c) => new THREE.Color(c)) },
    glsl: /* glsl */ `
uniform vec3 ${name}[ ${n} ];
vec3 ${name}At( float t ) {
	float x = clamp( t, 0.0, 1.0 ) * ${n - 1}.0;
	int i = min( int( x ), ${n - 2} );
	return mix( ${name}[ i ], ${name}[ i + 1 ], x - float( i ) );
}
`,
  };
}

/** Near to far: the colours of a depth-coded projection. */
const SPECTRUM = ['#ff4d4d', '#ff9f1c', '#ffe45e', '#5cf07a', '#33d6ff', '#4d7cff', '#a45cff'];

/**
 * Depth-coded projection, as a confocal stack of a whole neuron is published (Fiji's temporal-colour code): every
 * fibre glows in the colour of its depth, from red near through the spectrum to violet far, and each pixel takes the
 * brightest layer, blended by MAX: a maximum-intensity projection. The depths are the view's (`setDepthRange`), so the
 * colours keep telling depth as the cell turns.
 */
function makeDepthCoded(): THREE.ShaderMaterial {
  const ramp = colourRamp('uSpectrum', SPECTRUM);
  return new THREE.ShaderMaterial({
    uniforms: { uSpectrum: ramp.uniform, uDepthRange: depthRangeUniform, uGain: { value: 0.9 } },
    vertexShader: vertexShader(
      'varying float vDepth;\nvarying float vFacing;',
      'vDepth = - mv.z;\nvFacing = abs( dot( n, viewDir ) );'
    ),
    fragmentShader: /* glsl */ `
      ${ramp.glsl}
      uniform vec2 uDepthRange;
      uniform float uGain;
      varying float vDepth;
      varying float vFacing;
      void main() {
        vec3 c = uSpectrumAt( ( vDepth - uDepthRange.x ) / ( uDepthRange.y - uDepthRange.x ) );
        // A filled fibre is brightest down its middle, where the line of sight crosses the most of it.
        gl_FragColor = vec4( c * uGain * ( 0.45 + 0.55 * vFacing ), 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.CustomBlending,
    blendEquation: THREE.MaxEquation,
    transparent: true,
    depthWrite: false,
  });
}

/** Where the gold leaf's key light comes from, in camera space; its flakes glint by it. */
const GOLD_KEY: [number, number, number] = [-0.6, 0.8, 1.3];

/** The gold leaf's flakes, for the fragment shader's declarations. */
const GLINT_PARS_GLSL = /* glsl */ `
${NOISE_GLSL}
uniform vec3 uGlintLight;
uniform vec3 uGlintColor;
uniform mat3 normalMatrix;
varying vec3 vGlintPosition;
// The flakes of one size, cubes size µm on edge, each tilted its own way off the surface: how squarely the flake at p
// mirrors the key light into the eye (half vector h), 0 to 1.
float glintFlakes( vec3 p, float size, vec3 n, vec3 h ) {
	vec3 tilt = 2.0 * latticeRandom( floor( p / size ), 71u ) - 1.0;
	vec3 f = normalize( n + 0.45 * ( normalMatrix * tilt ) );
	return smoothstep( 0.988, 0.998, dot( f, h ) );
}
`;

/** The gold leaf's flakes, added to the light before `opaque_fragment`. */
const GLINT_GLSL = /* glsl */ `
	{
		// Flakes a couple of pixels across at any zoom: the two sizes (powers of two, µm) either side of that are mixed,
		// so that a flake stays on its spot of the surface and fades out as the next size takes over.
		float glintLevel = log2( max( 2.5 * length( fwidth( vGlintPosition ) ), 1e-4 ) );
		float glintSize = exp2( floor( glintLevel ) );
		vec3 glintH = normalize( uGlintLight + geometryViewDir );
		float glint = mix(
			glintFlakes( vGlintPosition, glintSize, normal, glintH ),
			glintFlakes( vGlintPosition, 2.0 * glintSize, normal, glintH ),
			fract( glintLevel ) );
		outgoingLight += uGlintColor * glint;
	}
`;

/**
 * Gold leaf on black lacquer, after the reflective microetchings of neurons: polished gold under the room
 * environment, and flakes of the leaf, anchored to the surface, that catch the key light and go out as the cell turns.
 */
function makeGoldLeaf(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xf2b544, metalness: 1, roughness: 0.3 });
  return addShaderHook(m, 'gold-leaf', (shader) => {
    Object.assign(shader.uniforms, {
      uGlintLight: { value: new THREE.Vector3(...GOLD_KEY).normalize() },
      uGlintColor: { value: new THREE.Color(0xfff0c8).multiplyScalar(8) },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGlintPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvGlintPosition = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLINT_PARS_GLSL}`)
      .replace('#include <opaque_fragment>', `${GLINT_GLSL}\n\t#include <opaque_fragment>`);
  });
}

/** Prefiltered environment map from the procedural room; used by the reflective looks. */
export function makeEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const tex = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  return tex;
}

export function createLooks(pixelRatio: number): Look[] {
  const cajal = makeCajal(pixelRatio);
  const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  const looks: Look[] = [
    {
      id: 'flat',
      label: 'Flat',
      colors: 'palette',
      hint: 'Headlight and sky light, matte surface. The neutral baseline.',
      material: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.7,
        metalness: 0,
      }),
      rig: rig(
        [new THREE.HemisphereLight(0xffffff, 0x8a8a99, 1.8)],
        viewLight(0xffffff, 2.2, [0.4, 0.6, 2])
      ),
      background: { light: ['#f4f5f7', '#f4f5f7'], dark: ['#0f1115', '#0f1115'] },
    },
    {
      id: 'studio',
      label: 'Studio',
      colors: 'palette',
      hint: 'Three-point lighting: warm key, cool fill and a rim light from behind.',
      material: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.45,
        metalness: 0.05,
      }),
      rig: rig(
        [new THREE.HemisphereLight(0xffffff, 0x556070, 0.6)],
        viewLight(0xfff0dc, 2.5, [-0.55, 0.8, 1.9]),
        viewLight(0xd9e5ff, 1.0, [0.9, 0.15, 1.5]),
        viewLight(0xffffff, 2.2, [0.35, 0.7, 0])
      ),
      background: { light: ['#ffffff', '#d9dde6'], dark: ['#2b3140', '#0c0e13'] },
    },
    {
      id: 'clay',
      label: 'Clay',
      colors: 'palette',
      hint: 'Matcap shading: a sculpted, lighting-independent look that reads shape well.',
      material: new THREE.MeshMatcapMaterial({
        vertexColors: true,
        matcap: makeMatcap([
          [0, '#ffffff'],
          [0.22, '#f6f6f8'],
          [0.58, '#aeaebb'],
          [0.88, '#5e5e6c'],
          [1, '#3c3c47'],
        ]),
      }),
      background: { light: ['#faf8f4', '#e2ddd4'], dark: ['#2a2926', '#121110'] },
    },
    {
      id: 'glossy',
      label: 'Glossy',
      colors: 'palette',
      hint: 'Clear-coated surface reflecting a soft room environment. Wet, alive.',
      material: new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.3,
        metalness: 0,
        clearcoat: 0.8,
        clearcoatRoughness: 0.15,
        envMapIntensity: 1.1,
      }),
      rig: rig(
        [new THREE.HemisphereLight(0xffffff, 0x606878, 0.3)],
        viewLight(0xffffff, 1.4, [-0.4, 0.7, 2])
      ),
      env: true,
      background: { light: ['#eef1f5', '#c4cad6'], dark: ['#1e2330', '#07080b'] },
    },
    {
      id: 'pearl',
      label: 'Pearl',
      colors: 'palette',
      hint: 'Velvet sheen with a bright rim under the room environment. Soft and organic.',
      material: new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.55,
        metalness: 0,
        sheen: 0.5,
        sheenRoughness: 0.6,
        sheenColor: new THREE.Color(0xffffff),
        envMapIntensity: 0.7,
      }),
      rig: rig(
        [new THREE.HemisphereLight(0xffffff, 0x606878, 0.3)],
        viewLight(0xfff4e6, 1.3, [-0.5, 0.8, 1.8])
      ),
      env: true,
      background: { light: ['#f6f4f8', '#d6d2dd'], dark: ['#242030', '#0b0a10'] },
    },
    {
      id: 'toon',
      label: 'Toon',
      colors: 'palette',
      hint: 'Four-step cel shading with a dark outline. Illustration style.',
      material: new THREE.MeshToonMaterial({
        vertexColors: true,
        gradientMap: makeToonGradient([80, 150, 215, 255]),
      }),
      rig: rig(
        [new THREE.HemisphereLight(0xffffff, 0x777788, 0.9)],
        viewLight(0xffffff, 3.2, [-0.5, 0.8, 2])
      ),
      outline: makeOutline(),
      background: { light: ['#ffffff', '#ffffff'], dark: ['#15161c', '#15161c'] },
    },
    {
      id: 'depth',
      label: 'Depth cue',
      colors: 'palette',
      hint: 'Fog towards the background: far branches fade, near ones stand out, as in molecular viewers.',
      material: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.65,
        metalness: 0,
      }),
      rig: rig(
        [new THREE.HemisphereLight(0xffffff, 0x8a8a99, 1.6)],
        viewLight(0xffffff, 2.4, [0.3, 0.6, 2])
      ),
      background: { light: ['#e8eaee', '#e8eaee'], dark: ['#0f1115', '#0f1115'] },
      fog: new THREE.Fog(0xe8eaee, 1, 2),
    },
    {
      id: 'sem',
      label: 'SEM',
      colors: 'own',
      hint: 'Scanning electron microscope: grayscale, edges brighter than faces, detector grain, black field.',
      material: withGrain(
        new THREE.MeshMatcapMaterial({
          color: 0xffffff,
          matcap: makeMatcap(
            [
              [0, '#2c2c2c'],
              [0.45, '#585858'],
              [0.8, '#a9a9a9'],
              [0.95, '#e8e8e8'],
              [1, '#ffffff'],
            ],
            [0.5, 0.64]
          ),
        }),
        0.12
      ),
      background: { light: ['#000000', '#000000'], dark: ['#000000', '#000000'] },
    },
    {
      id: 'em',
      label: 'EM segmentation',
      colors: 'tint',
      hint: 'Render of a segmented electron-microscopy volume: matte waxy grey, lumpy membrane, occlusion in the creases, dark field. Turns the bumps and the ambient occlusion on.',
      material: makeEm(),
      // A broad sky light keeps the shadows open, a soft key from the upper left models the form, and a rim light
      // from behind lifts the silhouettes off the dark field.
      rig: rig(
        [new THREE.HemisphereLight(0xe6e2dc, 0x241f1c, 0.9)],
        viewLight(0xfff3e6, 2.6, [-0.5, 0.7, 1.6]),
        viewLight(0xdfe7ff, 3, [0.4, 0.55, -2])
      ),
      background: { light: ['#3c3e42', '#2a2b2e'], dark: ['#131416', '#060607'] },
      bumps: { amplitude: 0.12, scale: 1.3, smoothness: 0.5 },
      ao: true,
    },
    {
      id: 'fluorescence',
      label: 'Fluorescence',
      colors: 'own',
      legend: {
        kind: 'swatches',
        items: [
          { label: 'Soma and dendrites', color: FLUORESCENCE_DENDRITE },
          { label: 'Axon', color: FLUORESCENCE_AXON },
        ],
      },
      hint: 'Confocal-style projection: GFP-green dendrites and soma, red axon, additive glow with bloom.',
      material: makeFluorescence(),
      background: { light: ['#000000', '#000000'], dark: ['#000000', '#000000'] },
      bloom: true,
    },
    {
      id: 'golgi',
      label: 'Golgi',
      colors: 'own',
      hint: 'Golgi-Cox impregnation: an opaque dark neuron on a sepia slide, with photographic grain.',
      material: withGrain(
        new THREE.MeshStandardMaterial({ color: 0x241810, roughness: 0.85, metalness: 0 }),
        0.05
      ),
      rig: rig(
        [new THREE.HemisphereLight(0xfff3dc, 0x8a7050, 1.6)],
        viewLight(0xfff6e8, 2.0, [-0.4, 0.7, 2])
      ),
      // A Golgi slide is a light object; the dark theme only dims it so the neuron stays legible.
      background: { light: ['#efe4c9', '#cdb995'], dark: ['#b5a482', '#857353'] },
    },
    {
      id: 'cajal',
      label: 'Cajal',
      colors: 'own',
      hint: 'Ink drawing: cross-hatching thickens with the shading, a contour line follows the edges. Chalk on slate in the dark theme.',
      material: cajal,
      background: { light: ['#f3ecd9', '#e6dcc3'], dark: ['#2f343a', '#22262b'] },
      onTheme: (dark) => {
        cajal.uniforms.uInk.value.set(dark ? 0xece7da : 0x2a1c10);
        cajal.uniforms.uPaper.value.set(dark ? 0x2b3036 : 0xf4edda);
      },
    },
    {
      id: 'cutaway',
      label: 'Cutaway',
      colors: 'palette',
      hint: 'Everything nearer than the orbit target is cut away, exposing hollow cross-sections. Pan to move the cut.',
      material: makeCutaway(cutPlane),
      rig: rig(
        [new THREE.HemisphereLight(0xffffff, 0x8a8a99, 1.2)],
        viewLight(0xfff4e8, 2.4, [-0.4, 0.7, 2])
      ),
      background: { light: ['#f0f2f5', '#d8dce4'], dark: ['#262b36', '#0f1115'] },
      clip: cutPlane,
    },
    {
      id: 'depth-coded',
      label: 'Depth-coded',
      colors: 'own',
      legend: { kind: 'ramp', stops: SPECTRUM, from: 'Near', to: 'Far' },
      hint: 'Depth-coded maximum-intensity projection, as confocal stacks are published: glowing fibres on black, red near through the spectrum to violet far.',
      material: makeDepthCoded(),
      background: { light: ['#000000', '#000000'], dark: ['#000000', '#000000'] },
    },
    {
      id: 'gold-leaf',
      label: 'Gold leaf',
      colors: 'own',
      hint: 'Gold leaf on black lacquer, after the reflective microetchings of neurons: flakes catch the light and go out as the cell turns.',
      material: makeGoldLeaf(),
      rig: rig(viewLight(0xfff0d8, 3, GOLD_KEY), viewLight(0xffffff, 1.5, [0.8, 0.3, -1])),
      env: true,
      background: { light: ['#1d1814', '#060504'], dark: ['#1d1814', '#060504'] },
    },
  ];
  for (const l of looks) {
    withDisplacement(l.material);
    if (l.outline) withDisplacement(l.outline);
  }
  return looks;
}
