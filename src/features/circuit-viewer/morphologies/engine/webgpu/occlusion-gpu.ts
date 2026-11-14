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

import { GTAO_PARTS } from './three-hooks';

import type { Node, TextureNode, UniformNode } from 'three/webgpu';

/** The EM viewer's occlusion (`scene-viewer.ts`): at half the resolution, over 32 CSS pixels, then smoothed. */
const AO_SCALE = 0.5;
export const AO_RADIUS_CSS = 32;
const AO_SAMPLES = 16;
/** The most the occlusion lightens a pixel past its colour, however dark the frame's mean. */
const AO_LIGHTEN = 1.25;
/**
 * The occlusion's mean over the frame is the last level of a target's mipmaps (`Occlusion.sums`), which three makes as
 * its pass ends. Each level is read at the middle of four pixels of the level before, which is their mean only while
 * the sides halve exactly. So the target's sides are powers of two, a pixel of it sums a block of the occlusion's this
 * many a side, and the pixels past the occlusion's are left at nothing.
 */
const MEAN_BLOCK = 4;
/** The mean cover of that target from which the occlusion's mean counts in full; it fades out under it. */
const MEAN_COVER = 1 / 1024;
/** How much of a pixel a surface covers for the occlusion to count it. */
export const AO_COVER = 0.5;
/**
 * The glow round a spiking cell: its colour as shown times how lit it is (`spike-light.ts`), blurred by three's bloom
 * with this strength and radius, and added over the frame and its background.
 */
const GLOW_STRENGTH = 1.4;
const GLOW_RADIUS = 0.5;

/**
 * What a surface writes for the occlusion, besides its colour: its normal's x and y in view space, and how far it lies
 * from the near plane towards the far (from `viewZ`, its depth in view space). That distance is split in two halves, a
 * step out of 256 and what is left, so that each stays exact in 16 bits when the samples of a pixel are summed. It is
 * linear, unlike the depth buffer's value: in perspective that steps by the square of the distance, about 2 µm at a
 * millimetre away, which banded a far sphere. For the glow, where it is drawn, the surface also writes how lit it is by
 * a spike.
 */
export function surfaceOf(normal: Node<'vec3'>, viewZ: Node<'float'>, lit: Node<'float'>) {
  const across = viewZ.negate().sub(cameraNear).div(cameraFar.sub(cameraNear));
  const steps = across.clamp(0, 0.99998).mul(256);
  return mrt({ surface: vec4(normal.xy, floor(steps).div(256), fract(steps)), lit: vec4(lit) });
}

/**
 * A pixel's surface as the resolve left it (`surfaceOf`), with `cover` of the pixel covered: the normal's xy, how far
 * the surface is from the near plane towards the far, and how far it is from the eye, µm.
 */
export function surfaceAt(resolved: Node<'vec4'>, cover: Node<'float'>) {
  // The resolve summed the covered samples: dividing by how much was covered gives one surface's values again.
  const s = resolved.div(max(cover, 0.25));
  const across = s.z.add(s.w.div(256));
  return { normal: s.xy, across, away: cameraNear.add(across.mul(cameraFar.sub(cameraNear))) };
}

/**
 * `under` drawn over `background`, both as the canvas takes them, with `glow` added. `under`'s colours are already
 * multiplied by how much of each pixel is covered. Round the cells the glow is added in full, past white only on a
 * screen that shows past white; over the cells it is added only up to the room left below white, so that they keep
 * their detail under it.
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

/** The side of the target the occlusion's mean is taken in (`MEAN_BLOCK`), for a canvas of `pixels` a side. */
export function meanSide(pixels: number): number {
  const blocks = Math.ceil(Math.floor(pixels * AO_SCALE) / MEAN_BLOCK);
  return 2 ** Math.ceil(Math.log2(Math.max(blocks, 1)));
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

/**
 * three's GTAO on depth and normals drawn at its own size. Its setup is three's but for two things: in an orthographic
 * view the way to the eye is +z everywhere, where three takes it as towards the camera's position; and a pixel's depth
 * is its own texel's, where three takes the nearest of four, which beside a fibre gave the background the fibre's
 * depth.
 */
class SurfaceGTAONode extends GTAONode {
  private readonly orthographic: boolean;

  constructor(depthNode: TextureNode, normalNode: TextureNode, camera: THREE.Camera) {
    super(depthNode, normalNode, camera);
    this.orthographic = (camera as THREE.OrthographicCamera).isOrthographicCamera === true;
    const missing = GTAO_PARTS.filter((part) => !(part in this));
    if (missing.length > 0) throw new Error(`three's GTAONode has no ${missing.join(', ')}`);
  }

  /** What went wrong in `setup`; three logs it and draws on past it, in black. */
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

        // Names its counter j, which three's types do not know about.
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
 * The circuit drawn with ambient occlusion, apart from the main draw. The scene is drawn into a target of its own, with
 * its surfaces' normals and depth beside the colour (`surfaceOf`). For each of the occlusion's pixels, the most covered
 * of the four pixels under it is picked; three's GTAO runs on those (`SurfaceGTAONode`) and is smoothed; and the
 * colour, multiplied by it, goes onto the canvas. The materials write their colours in sRGB, so the occlusion is raised
 * to the power 1 / 2.2, as if it darkened the light. It is then taken relative to its mean over the frame's covered
 * pixels: the crevices are darker and the open surfaces lighter (by `AO_LIGHTEN` at the most), and a frame with the
 * occlusion is as light as one without. Made for one camera, and to be disposed of.
 *
 * Made with `glows`, the surfaces also write a byte of how lit each pixel is by a spike, the spiking cells glow
 * (`glowOver`), and `throughs` are drawn over the frame. This holds on a still frame and on a moving one
 * (`renderMoving`), which draws the scene into the same target and leaves the occlusion out.
 */
export class Occlusion {
  /** The background as the canvas takes it, which the glow is added over. */
  readonly background = uniform(new THREE.Color());
  private pipeline: THREE.RenderPipeline;
  private moving: THREE.RenderPipeline | null = null;
  private occlusion: SurfaceGTAONode;
  private smooth: ReturnType<typeof denoise>;
  private sums: ReturnType<typeof rtt>;
  /** The last level of the mipmaps of `sums`. */
  private sumsLevel = uniform(0);
  private drawing = new THREE.Vector2();
  private passes: { dispose(): void }[];
  /** The frame's picture, its alpha how much of each pixel is covered, and its surfaces (`surfaceOf`), resolved. */
  readonly front: { picture: THREE.Texture; surface: THREE.Texture };

  constructor(
    private readonly renderer: THREE.WebGPURenderer,
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
    // Whatever writes no surface of its own (`surfaceOf`), such as the dots over the cells, sits at the far plane,
    // where the occlusion counts nothing.
    const outputs = mrt({ output, surface: vec4(0, 0, 1, 0), ...(glows && { lit: vec4(0) }) });
    // Set this pass's own clear colours, whatever the renderer's are: three's bloom draws this pass from inside its own
    // pass, which clears to opaque black.
    scenePass.setMRT(
      outputs.setClearColor('output', 0x000000, 0).setClearColor('surface', 0x000000, 0)
    );
    const surface = scenePass.getTextureNode('surface');
    const picture = scenePass.getTextureNode('output');
    this.front = {
      picture: scenePass.getTexture('output'),
      surface: scenePass.getTexture('surface'),
    };
    // xy: the normal's; z: the depth as the depth buffer stores it (1 at the far plane); w: how much of the pixel is
    // covered, which `surfaceAt` divides the resolve's sum by.
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
    // Write the surfaces' normals directly: three's basic material would give `normalView` the quad's own normal.
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
    const multiplier = (at: Node<'vec2'>) => pow(smoothed.sample(at).r, 1 / 2.2);
    // A pixel sums a block of the occlusion's. r: what the occlusion multiplies the picture by, times how much of the
    // picture under it is covered; g: that cover.
    const covered = Fn(() => {
      const size = vec2(textureSize(smoothed, int(0)) as unknown as Node<'ivec2'>).toConst();
      const first = floor(screenCoordinate.xy).mul(MEAN_BLOCK).toConst();
      const sum = vec2(0).toVar();
      for (let i = 0; i < MEAN_BLOCK * MEAN_BLOCK; i++) {
        const within = vec2((i % MEAN_BLOCK) + 0.5, Math.floor(i / MEAN_BLOCK) + 0.5);
        const at = first.add(within).div(size).toConst();
        const cover = picture.sample(at).a.mul(float(at.x.lessThan(1).and(at.y.lessThan(1))));
        sum.addAssign(vec2(multiplier(at), 1).mul(cover));
      }
      return vec4(sum.div(MEAN_BLOCK * MEAN_BLOCK), 0, 1);
    })();
    this.sums = rtt(covered, 1, 1, {
      depthBuffer: false,
      format: THREE.RGFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    const frame = this.sums.sample(vec2(0.5)).level(this.sumsLevel);
    const mean = mix(1, frame.r.div(max(frame.g, 1e-6)), min(frame.g.div(MEAN_COVER), 1));
    const relative = min(multiplier(uv()).div(mean), AO_LIGHTEN);
    // Lightened, a colour stops where it fills what is covered of its pixel.
    const most = max(picture.rgb, picture.a);
    const under = vec4(min(picture.rgb.mul(relative), most), picture.a);
    this.pipeline = new THREE.RenderPipeline(renderer);
    this.passes = [
      scenePass,
      surfacePass,
      this.occlusion,
      this.smooth,
      smoothed,
      this.sums,
      quad,
      corners,
    ];
    if (!glows) {
      this.pipeline.outputNode = under;
      return;
    }
    const litTexture = scenePass.getTexture('lit');
    litTexture.format = THREE.RedFormat;
    litTexture.type = THREE.UnsignedByteType;
    const lit = scenePass.getTextureNode('lit').r;
    const glow = bloom(vec4(picture.rgb.min(1).mul(lit), 1), GLOW_STRENGTH, GLOW_RADIUS);
    // Drawn after the frame, whose surfaces it reads (`Occlusion.front`) and tests against, instead of a depth buffer.
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

  /** Draws a frame with the occlusion reaching `reach` µm: in an orthographic view, the same on screen at any zoom. */
  render(reach: number): void {
    this.occlusion.radius.value = reach;
    this.occlusion.thickness.value = reach;
    this.smooth.depthPhi.value = reach / 4;
    const { x, y } = this.renderer.getDrawingBufferSize(this.drawing);
    const [width, height] = [meanSide(x), meanSide(y)];
    this.sums.setSize(width, height);
    this.sumsLevel.value = Math.log2(Math.max(width, height));
    this.pipeline.render();
    if (this.occlusion.failed) throw this.occlusion.failed;
  }

  /** Draws a frame while the view moves, with the glow and without the occlusion; only when made to glow. */
  renderMoving(): void {
    this.moving?.render();
  }

  dispose(): void {
    this.pipeline.dispose();
    this.moving?.dispose();
    for (const part of this.passes) part.dispose();
  }
}
