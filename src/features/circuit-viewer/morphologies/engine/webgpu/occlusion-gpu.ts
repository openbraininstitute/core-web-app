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
const AO_COVER = 0.5;

/**
 * What a surface writes for the occlusion, besides its colour: its normal's x and y in view space, and how far it is
 * from the near plane towards the far (`viewZ`, its depth in view space) in two halves, 256 steps and what is left,
 * each of which stays exact in 16 bits when the samples of a pixel are summed. Linear, not as the depth buffer takes
 * it: in perspective that steps by the square of the distance, about 2 µm a millimetre away, which banded a far sphere.
 */
export function surfaceOf(normal: Node<'vec3'>, viewZ: Node<'float'>) {
  const across = viewZ.negate().sub(cameraNear).div(cameraFar.sub(cameraNear));
  const steps = across.clamp(0, 0.99998).mul(256);
  return mrt({ surface: vec4(normal.xy, floor(steps).div(256), fract(steps)) });
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
 */
export class Occlusion {
  private pipeline: THREE.RenderPipeline;
  private occlusion: SurfaceGTAONode;
  private smooth: ReturnType<typeof denoise>;
  private passes: { dispose(): void }[];

  constructor(renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.Camera) {
    // Only the resolved pictures are read.
    const scenePass = pass(scene, camera, {
      samples: 4,
      storeMultisampledColorBuffer: false,
      storeMultisampledDepthBuffer: false,
    });
    // What writes no surface of its own (`surfaceOf`), the dots over the cells, stands all the way to the far plane,
    // where the occlusion counts nothing.
    scenePass.setMRT(
      mrt({ output, surface: vec4(0, 0, 1, 0) }).setClearColor('surface', 0x000000, 0)
    );
    const surface = scenePass.getTextureNode('surface');
    const picture = scenePass.getTextureNode('output');
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
      const s = sum.div(max(cover, 0.25)).toConst();
      const across = s.z.add(s.w.div(256)).toConst();
      const viewZ = cameraNear.add(across.mul(cameraFar.sub(cameraNear))).negate();
      const clip = cameraProjectionMatrix.mul(vec4(0, 0, viewZ, 1)).toConst();
      const depth = across.greaterThanEqual(1).select(float(1), clip.z.div(clip.w));
      return vec4(s.xy, depth, cover);
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
    this.pipeline = new THREE.RenderPipeline(renderer);
    this.pipeline.outputNode = vec4(picture.rgb.mul(pow(smoothed.r, 1 / 2.2)), picture.a);
    this.passes = [scenePass, surfacePass, this.occlusion, this.smooth, smoothed, quad, corners];
  }

  /** A frame, the occlusion reaching `reach` µm, which in an orthographic view is the same on screen at any zoom. */
  render(reach: number): void {
    this.occlusion.radius.value = reach;
    this.occlusion.thickness.value = reach;
    this.smooth.depthPhi.value = reach / 4;
    this.pipeline.render();
    if (this.occlusion.failed) throw this.occlusion.failed;
  }

  dispose(): void {
    this.pipeline.dispose();
    for (const part of this.passes) part.dispose();
  }
}
