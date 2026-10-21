import * as THREE from 'three/webgpu';

import { MAX_PIXEL_RATIO } from '@/features/viewer-3d/engine/scene-view';
import { logError } from '@/utils/logger';

import { type ArenaDrawing, type CircuitMaterials, CircuitView } from '../circuit-view';
import { pixelSpan, SEGMENT_BUDGET } from '../detail';
import { GLOW_SWELL } from '../soma-cloud';
import { type ArenaStorage, arenaOnGpu, arenaStorage } from './arena-gpu';
import { Culling, DRAWS } from './culling';
import { KEEP_UM } from './culling-wgsl';
import { dotMaterials } from './dots-gpu';
import { GpuUniforms } from './gpu-uniforms';
import {
  arenaMaterials,
  impostorMaterials,
  THROUGH_CSS_PX,
  THROUGH_LINE_CSS_PX,
} from './impostors-gpu';
import { AO_RADIUS_CSS, Occlusion } from './occlusion-gpu';
import { somaCloudMaterials } from './soma-cloud-gpu';
import { SomaCulling } from './soma-culling';
import { checkHooks, FrameTimes, threeLoop, trackTimestamps } from './three-hooks';

import type { Lost } from '../create-view';

/** What WebGPU asks of a row of a texture copied into a buffer: a multiple of this many bytes. */
const ROW_ALIGNMENT = 256;
/** How much brighter than white a fully lit cell is drawn besides, on a screen that shows past it. */
const OVER_WHITE = 0.6;

/** A pack's arena on the GPU: its materials, what they bind, and the culling of its segments. */
interface GpuArena extends ReturnType<typeof arenaMaterials> {
  storage: ArenaStorage;
  culling: Culling;
}

/**
 * The circuit's morphologies on WebGPU (`CircuitView`), on a device of the page's own (`probeWebGPU`), which goes
 * with the view. Each material writes the colour shown, as the WebGL 2 tier's do: Studio's tone maps its own, and the
 * somas are drawn as they come out, so the renderer converts nothing and draws straight to the canvas; a still frame of
 * morphologies or opaque somas goes through the ambient occlusion first (`Occlusion`). A pack's segments are culled
 * (`Culling`): the segments kept the frame before are drawn to depth (`keptQuads`), the culling's tests run, and the
 * frame draws the segments seen. So are the somas drawn alone and opaque (`SomaCulling`).
 */
export class CircuitMorphologyGPU extends CircuitView {
  protected materials: CircuitMaterials;
  protected readonly rowsUp = false;
  private renderer: THREE.WebGPURenderer;
  private device: GPUDevice;
  private gpu: GpuUniforms;
  private idTarget: THREE.RenderTarget | null = null;
  /** For the camera in use, made at its first still frame. */
  private occlusion: Occlusion | null = null;
  /** False where the occlusion could not be made, which is not tried again. */
  private occluding = true;
  /** False where the occlusion could not be made to glow, which is not tried again: it is made without. */
  private glowWorks = true;
  /** Made at the first pack and kept, its programs with it: each pack's arena only binds its buffers to `storage`. */
  private arena: GpuArena | null = null;
  /** The kept segments' quads, drawn to depth before the culling's tests. */
  private keptQuads = new THREE.Scene();
  /** Made for the cloud's somas, and let go of with them. */
  private somaCulling: SomaCulling | null = null;
  private drawingSize = new THREE.Vector2();
  /** Whether what a frame cost is being read back, which the next frames do not wait for. */
  private reading = false;
  private frameTimes: FrameTimes;
  private onLost: ((how: Lost) => void) | null;

  /**
   * A view in `host` on `device`; `onLost` is told once if the device is lost, which the view does not draw past, or
   * cannot make a pack's arena, even without its base. Aborted (`signal`) before the renderer is ready, none is made.
   */
  static async create(
    host: HTMLElement,
    device: GPUDevice,
    onLost: (how: Lost) => void,
    signal?: AbortSignal
  ): Promise<CircuitMorphologyGPU> {
    const overWhite = window.matchMedia('(dynamic-range: high)').matches;
    const renderer = new THREE.WebGPURenderer({
      device,
      antialias: true,
      alpha: true,
      // What frames cost the GPU, where the device can tell, for the frames timed (`timeFrame`).
      trackTimestamp: true,
      // Past white, where the screen shows it.
      ...(overWhite && { outputType: THREE.HalfFloatType }),
    });
    await renderer.init();
    try {
      if (signal?.aborted) throw signal.reason;
      checkHooks(renderer);
    } catch (e) {
      renderer.dispose();
      throw e;
    }
    return new CircuitMorphologyGPU(host, renderer, device, onLost, overWhite);
  }

  private constructor(
    host: HTMLElement,
    renderer: THREE.WebGPURenderer,
    device: GPUDevice,
    onLost: (how: Lost) => void,
    overWhite: boolean
  ) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    super(host, renderer.domElement, renderer.getPixelRatio(), SEGMENT_BUDGET.webgpu);
    this.renderer = renderer;
    this.device = device;
    this.frameTimes = new FrameTimes(device);
    this.onLost = onLost;
    // As many as a binding takes of their ends, 8 floats each.
    const { maxStorageBufferBindingSize, maxBufferSize } = device.limits;
    this.baseUpTo = Math.floor(Math.min(maxStorageBufferBindingSize, maxBufferSize) / (8 * 4));
    device.lost.then((info) => {
      if (info.reason !== 'destroyed') this.giveOut('reset');
    });
    try {
      this.gpu = new GpuUniforms({
        impostors: this.uniforms,
        cloud: this.cloudUniforms,
        segments: this.spotUniforms,
        electrodes: this.electrodeUniforms,
        synapses: this.synapseUniforms,
        markers: this.markerUniforms,
      });
      if (overWhite) this.gpu.overWhite = OVER_WHITE;
      this.gpu.throughHalfPx.value = (THROUGH_LINE_CSS_PX / 2) * this.pixelRatio;
      const cloud = somaCloudMaterials(this.gpu);
      const impostors = impostorMaterials(this.gpu, this.look);
      this.materials = {
        segment: impostors.segment,
        soma: impostors.soma,
        cloud: cloud.cloud,
        ids: { ...impostors.ids, cloud: cloud.id },
        spots: impostors.spots,
        through: impostors.through,
        ...dotMaterials(this.gpu, this.pixelRatio),
      };
      this.start();
    } catch (e) {
      // Nothing of it stays in the host, where WebGL 2 takes its place.
      this.dispose();
      throw e;
    }
  }

  /** `onLost` told how the view gave out, once, unless it was let go of. */
  private giveOut(how: Lost): void {
    const told = this.onLost;
    this.onLost = null;
    if (told && !this.disposed) told(how);
  }

  /**
   * No arena keeps a base from then on, and this one is made again without it; where it kept none, or could not be made
   * again, the view given out.
   */
  private outOfMemory(): void {
    this.baseUpTo = 0;
    let refitted = false;
    try {
      refitted = this.refitArena();
    } catch (e) {
      // Its arrays, say, under the same pressure: thrown in the device's callback, it would go untold.
      logError('Could not make the arena again without its base', e);
    }
    if (refitted)
      logError('The device ran out of memory for the arena: made again without its base');
    else this.giveOut('memory');
  }

  protected override disposeStage(): void {
    this.idTarget?.dispose();
    this.occlusion?.dispose();
    const { segment = [], ids = [], kept = [], through = [] } = this.arena ?? {};
    for (const material of [...segment, ...ids, ...kept, ...through]) material.dispose();
    this.arena?.culling.dispose();
    this.somaCulling?.dispose();
    this.frameTimes.dispose();
    this.renderer.dispose();
    this.device.destroy();
  }

  /**
   * three turns a loop of its own on every refresh of the display from `init` to `dispose`, with a loop set or not;
   * here it turns only while the view's does. Its first turn is at once, so the view's loop is set after it.
   */
  protected override animate(loop: (() => void) | null): void {
    const turns = threeLoop(this.renderer);
    void this.renderer.setAnimationLoop(null);
    turns?.stop();
    if (!loop) return;
    turns?.start();
    void this.renderer.setAnimationLoop(loop);
  }

  protected override sizeStage(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  protected override scaleDrawing(scale: number): void {
    this.renderer.setPixelRatio(this.pixelRatio * scale);
  }

  /**
   * Still, morphologies and opaque somas are drawn with ambient occlusion, and moving, the somas alone while the motion
   * keeps it (`aoMoving`); other moving frames and translucent somas without. Its targets are the size of the canvas, so
   * it is let go of with what it shades. Where spiking cells glow, morphologies are drawn through its target moving too
   * while any is lit, and it is made again as whether they glow changes.
   */
  protected override draw(moving: boolean): void {
    const from = performance.now();
    const tracked = trackTimestamps(this.renderer, this.timing !== null && !this.reading);
    try {
      this.drawFrame(moving);
    } finally {
      this.timeFrame(from, tracked);
    }
  }

  /**
   * What the frame drawn since `from` cost the GPU, told where `timing` asks: by three's timestamps of its passes where
   * they were `tracked`, the last frame's of those read at once (`FrameTimes`); where the device has none, from the
   * frame's start until the GPU is done with it, which errs on the slow side. Frames not timed write no timestamps.
   */
  private timeFrame(from: number, tracked: boolean): void {
    const { timing, renderer } = this;
    if (!timing || this.reading) return;
    this.reading = true;
    const read = tracked
      ? this.frameTimes.last(renderer)
      : this.device.queue.onSubmittedWorkDone().then(() => performance.now() - from);
    read.then(
      (ms) => {
        this.reading = false;
        if (typeof ms === 'number' && ms > 0 && !this.disposed) this.measured(timing, ms);
      },
      () => {
        this.reading = false;
      }
    );
  }

  private drawFrame(moving: boolean): void {
    this.gpu.sync();
    this.cull(this.restOf(moving));
    this.cullSomas();
    const glowing = this.glowing && this.glowWorks;
    const shaded = this.drawsMorphologies || this.drawsOpaqueSomas;
    if (!shaded || this.occlusion?.glows !== glowing) this.dropOcclusion();
    const occluded = !moving || this.aoMoving;
    const through = shaded && (occluded || (glowing && this.spiking.lit.length > 0));
    const occlusion = through ? this.occlusionNow(glowing) : null;
    if (occlusion) {
      try {
        occlusion.background.value.set(this.background).convertLinearToSRGB();
        this.throughs.visible = this.spiking.lit.length > 0;
        const umPerPx = this.umPerCssPx();
        this.gpu.throughUm.value = Math.min(THROUGH_CSS_PX * umPerPx, KEEP_UM);
        if (!occluded) occlusion.renderMoving();
        else occlusion.render(AO_RADIUS_CSS * umPerPx);
        return;
      } catch (e) {
        // Its passes are put together at its first frame, where three's parts it reads may be missing.
        this.withoutOcclusion(e, glowing && !occlusion.occlusionFailed);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  /** The occlusion was made for the other camera, and the somas kept for it hide little in this one. */
  protected override projectionChanged(): void {
    this.dropOcclusion();
    this.somaCulling?.reseed();
  }

  /** The somas kept for the view before may hide little in this one. */
  protected override viewSet(): void {
    this.somaCulling?.reseed();
  }

  /**
   * In buffers of the page's, which the segments' materials read as storage: the seen segments' quads drawn by the
   * culling's draws, flat and tubes, and the kept segments' quads in their place in `keptQuads`.
   */
  protected override arenaDrawing(): ArenaDrawing {
    if (!this.arena) {
      const storage = arenaStorage();
      this.arena = {
        storage,
        ...arenaMaterials(this.gpu, this.look, storage),
        culling: new Culling(this.renderer, this.device, storage, (counts) =>
          this.tellCulled(counts)
        ),
      };
    }
    const { storage, segment, ids, kept, through, culling } = this.arena;
    this.keep([
      new THREE.Mesh(culling.quads(DRAWS.keptFlat), kept[0]),
      new THREE.Mesh(culling.quads(DRAWS.keptTubes), kept[1]),
    ]);
    return {
      uploadsOf: (ends, words, blocks) =>
        arenaOnGpu(
          this.renderer,
          this.device,
          storage,
          { ends, words, blocks },
          (buffers) => culling.setArena(buffers),
          () => this.outOfMemory()
        ),
      segment,
      ids,
      quads: [culling.quads(DRAWS.seenFlat), culling.quads(DRAWS.seenTubes)],
      through: {
        materials: through,
        quads: [culling.quads(DRAWS.keptFlat), culling.quads(DRAWS.keptTubes)],
      },
    };
  }

  /** `meshes` in place of the kept segments' quads, which are let go of. */
  private keep(meshes: THREE.Mesh<THREE.InstancedBufferGeometry>[]): void {
    const was = [...this.keptQuads.children] as THREE.Mesh<THREE.InstancedBufferGeometry>[];
    for (const mesh of was) mesh.geometry.dispose();
    this.letGo(...was);
    for (const mesh of meshes) mesh.frustumCulled = false;
    this.keptQuads.add(...meshes);
  }

  /**
   * A pack's segments, where there is one: culled, the kept segments drawn to depth and the culling's tests run before
   * the frame, drawn in `rest` (`restOf`), is drawn; not, where the culling is off or failed, every one of them drawn.
   */
  private cull(rest: number): void {
    const arena = this.arena;
    if (!arena?.culling.placed) return;
    const { storage, culling } = arena;
    const end = this.arenaEnd;
    storage.end.value = end;
    storage.listed.value = 1;
    if (end === 0) {
      culling.drawNone();
      return;
    }
    if (this.culls && !culling.failed) {
      const { renderer } = this;
      const size = renderer.getDrawingBufferSize(this.drawingSize);
      renderer.setRenderTarget(culling.targetOf(size.x, size.y));
      renderer.render(this.keptQuads, this.camera);
      renderer.setRenderTarget(null);
      const { uShift } = this.uniforms;
      if (culling.run(this.camera, uShift.value, this.gpu.tubeFrom.value, end, rest)) return;
    } else if (this.culls) {
      // Told once as it failed, which neither a pack's stream made since nor one while the culling was off heard.
      this.tellCulled(null);
    }
    storage.listed.value = 0;
    culling.drawAll(end);
  }

  protected override get occludes(): boolean {
    return true;
  }

  protected override get cullsSomas(): boolean {
    return this.culls && this.somaCulling?.failed === false && this.uniforms.uCells.value !== null;
  }

  protected override placeSomas(
    positions: Float32Array | null,
    pieces: readonly THREE.InstancedBufferGeometry[]
  ): void {
    this.somaCulling?.dispose();
    this.somaCulling = null;
    if (!positions) return;
    try {
      this.somaCulling = new SomaCulling(
        this.renderer,
        this.device,
        this.gpu,
        positions,
        pieces,
        () => this.invalidate()
      );
      this.scene.add(this.somaCulling.seen);
    } catch (e) {
      logError('Somas drawn without culling', e);
    }
  }

  /**
   * The somas drawn alone and opaque, culled: the culling's test run before the frame, which draws the somas seen in
   * place of the pieces, at the most a soma swells to while spikes are replayed. Not culled, its targets are let go of;
   * where the test could not run, the pieces are drawn from this frame on.
   */
  private cullSomas(): void {
    const culling = this.somaCulling;
    if (!culling) return;
    const on = this.drawsOpaqueSomas && this.cullsSomas;
    culling.seen.visible = on;
    if (!on) {
      culling.release();
      return;
    }
    const { uOffset, uRadius } = this.cloudUniforms;
    const radius = uRadius.value * (this.spiking.replaying ? 1 + GLOW_SWELL : 1);
    const cells = this.uniforms.uCells.value;
    const size = this.renderer.getDrawingBufferSize(this.drawingSize);
    if (cells && culling.run(this.camera, uOffset.value, radius, cells, size.x, size.y)) return;
    culling.seen.visible = false;
    this.showPieces();
  }

  private occlusionNow(glows: boolean): Occlusion | null {
    if (!this.occlusion && this.occluding) {
      try {
        this.occlusion = new Occlusion(
          this.renderer,
          this.scene,
          this.camera,
          glows,
          this.throughs
        );
        this.gpu.showFront(this.occlusion.front);
      } catch (e) {
        this.withoutOcclusion(e, glows);
      }
    }
    return this.occlusion;
  }

  /**
   * After `e`, the glow off for good where the occlusion glowed, else the occlusion, and the renderer drawing to the
   * canvas again. An occlusion that fails again without the glow goes the next frame.
   */
  private withoutOcclusion(e: unknown, glows: boolean): void {
    this.dropOcclusion();
    if (glows) this.glowWorks = false;
    else {
      this.occluding = false;
      this.occlusionGone();
    }
    this.renderer.setRenderTarget(null);
    this.renderer.setMRT(null);
    logError(glows ? 'Drawn without the spike glow' : 'Drawn without ambient occlusion', e);
  }

  private dropOcclusion(): void {
    this.occlusion?.dispose();
    this.occlusion = null;
    this.gpu.showFront(null);
  }

  /** How many µm a CSS pixel spans, at the orbit's target in perspective. */
  private umPerCssPx(): number {
    const { camera } = this;
    const away = camera instanceof THREE.PerspectiveCamera ? this.controls.getDistance() : 1;
    return pixelSpan(camera.projectionMatrix, this.height) * away;
  }

  protected override readPick(scene: THREE.Scene): Promise<Uint8Array> {
    const { renderer } = this;
    const target = this.pickTarget();
    const side = target.width;
    this.gpu.sync();
    // The segments seen were culled for the frame last drawn, which the view may have moved from.
    if (this.framePending) this.cull(this.restOf(this.drawnMoving));
    renderer.setRenderTarget(target);
    renderer.render(scene, this.camera);
    renderer.setRenderTarget(null);
    return renderer
      .readRenderTargetPixelsAsync(target, 0, 0, side, side)
      .then((read) => packed(read as Uint8Array, side));
  }

  /** Built for the pick's target, whose format the pipelines are made for. */
  protected override compile(scene: THREE.Scene): void {
    const { renderer } = this;
    renderer.setRenderTarget(this.pickTarget());
    void renderer.compileAsync(scene, this.camera);
    renderer.setRenderTarget(null);
  }

  protected override pickTarget(): THREE.RenderTarget {
    this.idTarget ??= new THREE.RenderTarget(this.pickSide, this.pickSide);
    return this.idTarget;
  }
}

/** A square of RGBA bytes `side` wide, from WebGPU's copy with each row padded to `ROW_ALIGNMENT` bytes. */
function packed(rows: Uint8Array, side: number): Uint8Array {
  const stride = Math.ceil((4 * side) / ROW_ALIGNMENT) * ROW_ALIGNMENT;
  if (stride === 4 * side) return rows;
  const pixels = new Uint8Array(4 * side * side);
  for (let row = 0; row < side; row++) {
    pixels.set(rows.subarray(row * stride, row * stride + 4 * side), 4 * side * row);
  }
  return pixels;
}
