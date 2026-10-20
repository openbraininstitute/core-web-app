import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { denoise } from 'three/addons/tsl/display/DenoiseNode.js';
import GTAONode from 'three/addons/tsl/display/GTAONode.js';
import {
  abs,
  acos,
  cameraFar,
  cameraNear,
  cameraProjectionMatrix,
  clamp,
  context,
  cos,
  cross,
  dot,
  Fn,
  float,
  floor,
  fract,
  getScreenPositionFromClip,
  getViewPosition,
  If,
  int,
  interleavedGradientNoise,
  ivec2,
  Loop,
  mat3,
  max,
  min,
  mix,
  mrt,
  normalize,
  output,
  PI,
  pass,
  positionGeometry,
  pow,
  rand,
  rtt,
  screenCoordinate,
  sin,
  textureSize,
  uniform,
  unpackNormal,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import * as THREE from 'three/webgpu';

import type { Node, TextureNode, UniformNode } from 'three/webgpu';

/** The EM viewer's occlusion (`scene-viewer.ts`): at half the resolution, over 32 CSS pixels, then smoothed. */
const AO_SCALE = 0.5;
export const AO_RADIUS_CSS = 32;
const AO_SAMPLES = 16;
/** How much of a pixel a surface covers for the occlusion to count it. */
export const AO_COVER = 0.5;
/**
 * The glow round a spiking cell: its colour as shown times how lit it is (`spike-light.ts`), blurred by three's bloom
 * this strong and this wide, added over the frame and its background.
 */
const GLOW_STRENGTH = 1.4;
const GLOW_RADIUS = 0.5;

/**
 * What a surface writes for the occlusion, besides its colour: its normal's x and y in view space, and how far it is
 * from the near plane towards the far (`viewZ`, its depth in view space) in two halves, 256 steps and what is left,
 * each of which stays exact in 16 bits when the samples of a pixel are summed. Linear, not as the depth buffer takes
 * it: in perspective that steps by the square of the distance, about 2 µm a millimetre away, which banded a far sphere.
 * And for the glow, where it is drawn, how lit it is by a spike.
 */
export function surfaceOf(normal: Node<'vec3'>, viewZ: Node<'float'>, lit: Node<'float'>) {
  const across = viewZ.negate().sub(cameraNear).div(cameraFar.sub(cameraNear));
  const steps = across.clamp(0, 0.99998).mul(256);
  return mrt({ surface: vec4(normal.xy, floor(steps).div(256), fract(steps)), lit: vec4(lit) });
}

/**
 * A pixel's surface as the resolve left it (`surfaceOf`), `cover` of it covered: the normal's xy, and how far it is from
 * the near plane towards the far and from the eye, µm.
 */
export function surfaceAt(resolved: Node<'vec4'>, cover: Node<'float'>) {
  // The resolve summed the covered samples: divided by how much was covered, one surface's again.
  const s = resolved.div(max(cover, 0.25));
  const across = s.z.add(s.w.div(256));
  return { normal: s.xy, across, away: cameraNear.add(across.mul(cameraFar.sub(cameraNear))) };
}

/**
 * `under`, a picture as the canvas takes it, its colours times how much of each pixel is covered, over `background`,
 * as the canvas takes it, with `glow`: added round the cells, past white only on a screen that shows past white; over
 * them, by what room is left below white, so they keep their detail under it.
 */
function glowOver(
  under: Node<'vec4'>,
  glow: Node<'vec4'>,
  background: Node<'color'>
): Node<'vec4'> {
  const picture = under.rgb.add(background.mul(under.a.oneMinus()));
  const room = picture.oneMinus().clamp(0, 1).sub(1).mul(under.a).add(1);
  return vec4(picture.add(glow.rgb.mul(room)), 1);
}

/** `over`, drawn on transparent black, over `under`, both as the canvas takes them. */
function drawnOver(under: Node<'vec4'>, over: Node<'vec4'>): Node<'vec4'> {
  // `under` first: three draws the passes in the order it meets them, and what is drawn over reads what is under.
  return under.mul(over.a.oneMinus()).add(over);
}

/** The parts of three's `GTAONode` (r186) its setup reads, which are its own, not its interface. */
interface GTAOParts {
  _noiseNode: TextureNode;
  _resolution: UniformNode<'vec2', THREE.Vector2>;
  _temporalDirection: UniformNode<'float', number>;
  _temporalOffset: UniformNode<'float', number>;
  _cameraProjectionMatrix: UniformNode<'mat4', THREE.Matrix4>;
  _cameraProjectionMatrixInverse: UniformNode<'mat4', THREE.Matrix4>;
  _material: THREE.NodeMaterial;
  _textureNode: TextureNode;
}
const PARTS = [
  '_noiseNode',
  '_resolution',
  '_temporalDirection',
  '_temporalOffset',
  '_cameraProjectionMatrix',
  '_cameraProjectionMatrixInverse',
  '_material',
  '_textureNode',
] as const;

/**
 * three's GTAO on depth and normals drawn at its own size. Its setup is three's but for two things: in an orthographic
 * view the way to the eye is +z everywhere, where three takes it as towards the camera's position; and a pixel's depth
 * is its own texel's, where three takes the nearest of four, which beside a fibre gave the background the fibre's depth.
 */
class SurfaceGTAONode extends GTAONode {
  private readonly orthographic: boolean;

  constructor(depthNode: TextureNode, normalNode: TextureNode, camera: THREE.Camera) {
    super(depthNode, normalNode, camera);
    this.orthographic = (camera as THREE.OrthographicCamera).isOrthographicCamera === true;
    const missing = PARTS.filter((part) => !(part in this));
    if (missing.length > 0) throw new Error(`three's GTAONode has no ${missing.join(', ')}`);
  }

  /** What went wrong in `setup`, which three logs and draws past, in black. */
  failed: unknown = null;

  override setup(builder: THREE.NodeBuilder) {
    try {
      return this.occlusionSetup(builder);
    } catch (e) {
      this.failed = e;
      throw e;
    }
  }

  private occlusionSetup(builder: THREE.NodeBuilder) {
    const own = this as unknown as GTAOParts & Record<string, unknown>;
    const depthNode = this.depthNode as TextureNode;
    const normalNode = this.normalNode as TextureNode;
    const uvNode = uv();
    const sampleDepth = (at: Node<'vec2'>) => depthNode.sample(at).r;
    const project = own._cameraProjectionMatrix;
    const unproject = own._cameraProjectionMatrixInverse;
    const orthographic = this.orthographic;

    const occlusion = Fn(() => {
      const depth = sampleDepth(uvNode).toConst();
      depth.greaterThanEqual(1.0).discard();

      const viewPosition = getViewPosition(uvNode, depth, unproject).toConst();
      const viewNormal = normalNode.sample(uvNode).rgb.normalize().toConst();
      const radius = this.radius;
      const invRadius = radius.reciprocal().toConst();
      const viewDir = (orthographic ? vec3(0, 0, 1) : normalize(viewPosition.negate())).toConst();
      const clipPosition = project.mul(vec4(viewPosition, 1.0)).toConst();

      const noiseResolution = vec2(textureSize(own._noiseNode, int(0)) as unknown as Node<'ivec2'>);
      const noiseUv = vec2(uvNode.x, uvNode.y.oneMinus()).mul(own._resolution.div(noiseResolution));
      const randomVec = own._noiseNode.sample(noiseUv).xyz.mul(2.0).sub(1.0);
      const tangent = vec3(randomVec.xy, 0.0).normalize();
      const bitangent = vec3(tangent.y.mul(-1.0), tangent.x, 0.0);
      const kernelMatrix = mat3(tangent, bitangent, vec3(0.0, 0.0, 1.0));

      const SAMPLES = this.samples.value;
      const DIRECTIONS = SAMPLES < 30 ? 3 : 5;
      const STEPS = Math.ceil(SAMPLES / DIRECTIONS);
      const invSteps = 1 / STEPS;
      const ao = float(0).toVar();
      const noiseJitterIdx = own._temporalDirection.mul(0.02);
      const stepJitter = interleavedGradientNoise(screenCoordinate.add(own._temporalOffset)).add(
        rand(uvNode.add(noiseJitterIdx).mul(2).sub(1))
      );

      Loop({ start: int(0), end: int(DIRECTIONS), type: 'int', condition: '<' }, ({ i }) => {
        const angle = float(i).div(DIRECTIONS).mul(PI).add(own._temporalDirection).toConst();
        const sampleDir = kernelMatrix.mul(vec3(cos(angle), sin(angle), 0)).toConst();
        const clipDirRadius = project.mul(vec4(sampleDir, 0.0)).mul(radius).toConst();
        const sliceBitangent = normalize(cross(sampleDir, viewDir)).toConst();
        const sliceTangent = cross(sliceBitangent, viewDir).toConst();
        const projNRaw = viewNormal
          .sub(sliceBitangent.mul(dot(viewNormal, sliceBitangent)))
          .toConst();
        const projNLen = projNRaw.length().toConst();
        const projN = projNRaw.div(max(projNLen, float(0.0001))).toConst();
        const nSin = dot(projN, sliceTangent).toConst();
        const nCos = clamp(dot(projN, viewDir), 0, 1).toConst();
        const signNSin = nSin.greaterThanEqual(0).select(float(1), float(-1));
        const angleN = signNSin.mul(acos(nCos)).toConst();
        const tangentToNormalInSlice = cross(projN, sliceBitangent).toConst();
        const cosHorizon = dot(viewDir, tangentToNormalInSlice).toConst();
        const cosHorizons = vec2(cosHorizon, cosHorizon.negate()).toVar();

        // Its counter named j, which three's types do not know of.
        const steps = {
          start: int(0),
          end: int(STEPS),
          type: 'int',
          name: 'j',
          condition: '<',
        } as const;
        Loop(steps, (counters) => {
          const { j } = counters as unknown as { j: Node<'int'> };
          const t = float(j).add(1.0).add(stepJitter).mul(invSteps).toConst();
          const clipOffset = clipDirRadius.mul(t.mul(t)).toConst();
          const sides = [
            [cosHorizons.x, clipPosition.add(clipOffset)],
            [cosHorizons.y, clipPosition.sub(clipOffset)],
          ] as const;
          for (const [horizon, at] of sides) {
            const screen = getScreenPositionFromClip(at).toConst();
            const delta = getViewPosition(screen, sampleDepth(screen).toConst(), unproject)
              .sub(viewPosition)
              .toConst();
            const len = delta.length().toConst();
            const rise = dot(viewDir, delta).div(max(len, float(0.0001)));
            const far = min(len.mul(invRadius), 1);
            If(abs(delta.z).lessThan(this.thickness), () => {
              horizon.assign(mix(max(horizon, rise), horizon, far.mul(far)));
            });
          }
        });

        const hPos = acos(cosHorizons.y).toConst();
        const hNeg = acos(cosHorizons.x).negate().toConst();
        const termPos = cos(hPos.mul(2).sub(angleN)).negate().add(nCos).add(hPos.mul(2).mul(nSin));
        const termNeg = cos(hNeg.mul(2).sub(angleN)).negate().add(nCos).add(hNeg.mul(2).mul(nSin));
        ao.addAssign(projNLen.mul(termPos.add(termNeg).mul(0.25)));
      });

      ao.assign(clamp(ao.div(DIRECTIONS), 0, 1));
      ao.assign(pow(ao, this.scale));
      return ao;
    });

    // Not in three's types either, as of r186.
    const shared = (
      builder as unknown as { getSharedContext(): Record<string, unknown> }
    ).getSharedContext();
    own._ao = occlusion;
    own._sharedContext = shared;
    own._currentSamples = this.samples.value;
    own._material.contextNode = context(shared);
    own._material.fragmentNode = occlusion();
    own._material.needsUpdate = true;
    return own._textureNode;
  }
}

/**
 * The circuit drawn with ambient occlusion, as the bench measured it from the main draw: the scene into a target of its
 * own, its surfaces' normals and depth beside the colour (`surfaceOf`); of the four pixels under each of the
 * occlusion's, the one most covered; three's GTAO on those (`SurfaceGTAONode`), smoothed; and the colour darkened by it
 * onto the canvas. The colours the materials write are in sRGB, so the occlusion is taken to a gamma of 2.2, as if it
 * darkened the light. Made for one camera, and to be disposed of.
 *
 * Made to `glow`, the surfaces also write how lit each pixel is by a spike, a byte, and the spiking cells glow
 * (`glowOver`), and `throughs` are drawn over the frame, on a still frame and on a moving one (`renderMoving`), which
 * draws the scene into the same target and leaves the occlusion out.
 */
export class Occlusion {
  /** The background as the canvas takes it, which the glow is added over. */
  readonly background = uniform(new THREE.Color());
  private pipeline: THREE.RenderPipeline;
  private moving: THREE.RenderPipeline | null = null;
  private occlusion: SurfaceGTAONode;
  private smooth: ReturnType<typeof denoise>;
  private passes: { dispose(): void }[];
  /** The frame's picture, its alpha how much of each pixel is covered, and its surfaces (`surfaceOf`), resolved. */
  readonly front: { picture: THREE.Texture; surface: THREE.Texture };

  constructor(
    renderer: THREE.WebGPURenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    readonly glows: boolean,
    throughs: THREE.Scene
  ) {
    // Only the resolved pictures are read.
    const scenePass = pass(scene, camera, {
      samples: 4,
      storeMultisampledColorBuffer: false,
      storeMultisampledDepthBuffer: false,
    });
    // What writes no surface of its own (`surfaceOf`), the dots over the cells, stands all the way to the far plane,
    // where the occlusion counts nothing.
    const outputs = mrt({ output, surface: vec4(0, 0, 1, 0), ...(glows && { lit: vec4(0) }) });
    // Cleared as its own, whatever the renderer's: three's bloom draws this pass from inside its own, opaque black.
    scenePass.setMRT(
      outputs.setClearColor('output', 0x000000, 0).setClearColor('surface', 0x000000, 0)
    );
    const surface = scenePass.getTextureNode('surface');
    const picture = scenePass.getTextureNode('output');
    this.front = {
      picture: scenePass.getTexture('output'),
      surface: scenePass.getTexture('surface'),
    };
    // xy the normal's, z the depth as the depth buffer takes it (1 all the way to the far plane), w how much of the
    // pixel is covered: what the resolve summed is divided by that again.
    const picked = Fn(() => {
      const first = ivec2(screenCoordinate.xy).mul(2).toConst();
      const sum = vec4(0).toVar();
      const cover = float(0).toVar();
      for (const [x, y] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]) {
        const p = first.add(ivec2(x, y)).toConst();
        const c = picture.load(p).a.toConst();
        If(c.greaterThan(cover), () => {
          cover.assign(c);
          sum.assign(surface.load(p));
        });
      }
      const { normal, across, away } = surfaceAt(sum, cover);
      const clip = cameraProjectionMatrix.mul(vec4(0, 0, away.negate(), 1)).toConst();
      const depth = across.greaterThanEqual(1).select(float(1), clip.z.div(clip.w));
      return vec4(normal, depth, cover);
    })();
    const quad = new THREE.MeshBasicNodeMaterial();
    quad.vertexNode = vec4(positionGeometry.xy, 0, 1);
    quad.maskNode = picked.w.greaterThanEqual(AO_COVER);
    quad.depthNode = picked.z;
    quad.depthFunc = THREE.AlwaysDepth;
    const corners = new THREE.BufferGeometry();
    corners.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)
    );
    const whole = new THREE.Mesh(corners, quad);
    whole.frustumCulled = false;
    const surfaces = new THREE.Scene();
    surfaces.add(whole);
    const surfacePass = pass(surfaces, camera, { samples: 0 });
    surfacePass.setResolutionScale(AO_SCALE);
    // The surfaces' normals, written as they are: three's basic material gives `normalView` the quad's own.
    surfacePass.setMRT(mrt({ output: vec4(unpackNormal(picked.xy), 1) }));
    const depth = surfacePass.getTextureNode('depth');
    const normals = surfacePass.getTextureNode('output');

    this.occlusion = new SurfaceGTAONode(depth, normals, camera);
    this.occlusion.resolutionScale = AO_SCALE;
    this.occlusion.samples.value = AO_SAMPLES;
    this.occlusion.scale.value = 1.5;
    this.smooth = denoise(this.occlusion.getTextureNode(), depth, normals, camera);
    this.smooth.lumaPhi.value = 10;
    this.smooth.normalPhi.value = 3;
    this.smooth.radius.value = 4;
    const smoothed = rtt(this.smooth, null, null, {
      resolutionScale: AO_SCALE,
      depthBuffer: false,
    });
    const under = vec4(picture.rgb.mul(pow(smoothed.r, 1 / 2.2)), picture.a);
    this.pipeline = new THREE.RenderPipeline(renderer);
    this.passes = [scenePass, surfacePass, this.occlusion, this.smooth, smoothed, quad, corners];
    if (!glows) {
      this.pipeline.outputNode = under;
      return;
    }
    const litTexture = scenePass.getTexture('lit');
    litTexture.format = THREE.RedFormat;
    litTexture.type = THREE.UnsignedByteType;
    const lit = scenePass.getTextureNode('lit').r;
    const glow = bloom(vec4(picture.rgb.min(1).mul(lit), 1), GLOW_STRENGTH, GLOW_RADIUS);
    // After the frame, whose surfaces it reads (`Occlusion.front`), and tested against them, not a depth buffer.
    const throughPass = pass(throughs, camera, { samples: 0, depthBuffer: false });
    throughPass.setMRT(mrt({ output }).setClearColor('output', 0x000000, 0));
    const over = throughPass.getTextureNode('output');
    this.passes.push(glow, throughPass);
    this.pipeline.outputNode = drawnOver(glowOver(under, glow, this.background), over);
    this.moving = new THREE.RenderPipeline(renderer);
    this.moving.outputNode = drawnOver(glowOver(picture, glow, this.background), over);
  }

  /** Whether three's occlusion failed, rather than what glows. */
  get occlusionFailed(): boolean {
    return this.occlusion.failed !== null;
  }

  /** A frame, the occlusion reaching `reach` µm, which in an orthographic view is the same on screen at any zoom. */
  render(reach: number): void {
    this.occlusion.radius.value = reach;
    this.occlusion.thickness.value = reach;
    this.smooth.depthPhi.value = reach / 4;
    this.pipeline.render();
    if (this.occlusion.failed) throw this.occlusion.failed;
  }

  /** A frame while the view moves, glowing and without the occlusion; made to glow only. */
  renderMoving(): void {
    this.moving?.render();
  }

  dispose(): void {
    this.pipeline.dispose();
    this.moving?.dispose();
    for (const part of this.passes) part.dispose();
  }
}
