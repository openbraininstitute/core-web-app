import { attribute, instanceIndex } from 'three/tsl';
import * as THREE from 'three/webgpu';

import { MAX_PIXEL_RATIO } from '@/features/viewer-3d/engine/scene-view';
import { logError } from '@/utils/logger';

import {
  type ArenaDrawing,
  type CircuitMaterials,
  CircuitView,
  type PickWindow,
} from '../circuit-view';
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
import { checkHooks, FrameTimes, gpuTexture, threeLoop, trackTimestamps } from './three-hooks';

import type { GlowRowsWriter } from '../cell-table';
import type { Lost } from '../create-view';

/** WebGPU pads each row of a texture copied into a buffer to a multiple of this many bytes. */
const ROW_ALIGNMENT = 256;
/** How far past white a fully lit cell is drawn, on a screen that can show colours brighter than white. */
const OVER_WHITE = 0.6;

/** A pack's arena on the GPU: its materials, what they bind, and the culling of its segments. */
interface GpuArena extends ReturnType<typeof arenaMaterials> {
  storage: ArenaStorage;
  culling: Culling;
}

/**
 * Draws the circuit's morphologies with WebGPU (`CircuitView`), on a device the page made for itself (`probeWebGPU`);
 * the view destroys the device when it goes. As in the WebGL 2 tier, each material writes the final colour: Studio tone
 * maps its own, and the somas' colours are drawn as they come out, so the renderer converts nothing and draws straight
 * to the canvas. A still frame of morphologies or opaque somas goes through the ambient occlusion first (`Occlusion`).
 * The culling (`Culling`) culls a pack's segments: the segments kept from the frame before are drawn to depth
 * (`keptQuads`), the culling's tests run, and the frame draws only the segments seen. `SomaCulling` does the same for
 * the somas drawn alone and opaque.
 */
export class CircuitMorphologyGPU extends CircuitView {
  protected materials: CircuitMaterials;
  private renderer: THREE.WebGPURenderer;
  private device: GPUDevice;
  private gpu: GpuUniforms;
  private idTarget: THREE.RenderTarget | null = null;
  /** Made for the camera in use, at its first still frame. */
  private occlusion: Occlusion | null = null;
  /** False once the occlusion has failed; it is not tried again. */
  private occluding = true;
  /** False once the occlusion has failed with the glow; it is not tried again, and the occlusion is made without. */
  private glowWorks = true;
  /** Made for the first pack and kept, with its programs: a later pack's arena only binds its buffers to `storage`. */
  private arena: GpuArena | null = null;
  /** The kept segments' quads, drawn to depth before the culling's tests. */
  private keptQuads = new THREE.Scene();
  /** Made when the cloud's somas are placed, and let go of with them. */
  private somaCulling: SomaCulling | null = null;
  private drawingSize = new THREE.Vector2();
  /** Whether a frame's GPU cost is being read back. The frames drawn meanwhile do not wait for it. */
  private reading = false;
  private frameTimes: FrameTimes;
  private onLost: ((how: Lost) => void) | null;

  /**
   * Makes a view in `host` on `device`. `onLost` is called once if the device is lost, after which the view draws
   * nothing, or if the device cannot make a pack's arena even without its base. If `signal` aborts before the renderer
   * is ready, no view is made.
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
      // Lets the frames timed (`timeFrame`) measure their GPU cost, where the device supports it.
      trackTimestamp: true,
      // Colours past white, where the screen can show them.
      ...(overWhite && { outputType: THREE.HalfFloatType }),
    });
    try {
      await renderer.init();
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
    // As many segments as one binding holds the ends of, at 8 floats each.
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
      // When the cloud is drawn whole, the somas are in the page's order: soma i is cell i.
      const whole = somaCloudMaterials(this.gpu, {
        cell: instanceIndex,
        centre: attribute('aPosition', 'vec3'),
      });
      whole.id.dispose();
      whole.cloud.transparent = true;
      const impostors = impostorMaterials(this.gpu, this.look);
      this.materials = {
        segment: impostors.segment,
        soma: impostors.soma,
        cloud: cloud.cloud,
        wholeCloud: whole.cloud,
        ids: { ...impostors.ids, cloud: cloud.id },
        spots: impostors.spots,
        through: impostors.through,
        ...dotMaterials(this.gpu, this.pixelRatio),
      };
      this.start();
    } catch (e) {
      // Leave nothing in the host: WebGL 2 takes this view's place.
      this.dispose();
      throw e;
    }
  }

  /** Tells `onLost` how the view gave out, once, unless the view was disposed. */
  private giveOut(how: Lost): void {
    const told = this.onLost;
    this.onLost = null;
    if (told && !this.disposed) told(how);
  }

  /**
   * From now on no arena keeps a base, and this one is made again without it. If it kept no base, or cannot be made
   * again, the view gives out.
   */
  private outOfMemory(): void {
    this.baseUpTo = 0;
    let refitted = false;
    try {
      refitted = this.refitArena();
    } catch (e) {
      // Making its arrays, say, can fail under the same memory pressure. Thrown in the device's callback, the error
      // would go unreported.
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
   * three runs a loop of its own on every display refresh from `init` to `dispose`, whether a loop is set or not. Here
   * it runs only while the view's loop does. Starting it runs a turn at once, so the view's loop is set after that.
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
   * Morphologies and opaque somas get ambient occlusion in still frames, and in moving frames while the motion keeps it
   * (`aoMoving`). Other moving frames and translucent somas get none. The occlusion's targets are the size of the
   * canvas, so it is let go of once nothing it shades is drawn. Where spiking cells glow, morphologies are drawn
   * through its target while any cell is lit, moving or not, and it is made again when whether they glow changes.
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
   * Reports to `timing`, where set, what the frame drawn since `from` cost the GPU. Where its passes were `tracked`,
   * the cost comes from three's timestamps, read at once for the last frame that wrote them (`FrameTimes`). Where the
   * device has no timestamps, it is the time from the frame's start until the GPU is done with it, which errs on the
   * slow side. Frames not timed write no timestamps.
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
        // The occlusion builds its passes at its first frame, which throws if parts of three it reads are missing.
        this.withoutOcclusion(e, glowing && !occlusion.occlusionFailed);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  /** The occlusion was made for the other camera, and the somas kept for that camera hide little in this one. */
  protected override projectionChanged(): void {
    this.dropOcclusion();
    this.somaCulling?.reseed();
  }

  /** The somas kept for the previous view may hide little in this one. */
  protected override viewSet(): void {
    this.somaCulling?.reseed();
  }

  /**
   * The arena lives in buffers the page makes, which the segments' materials read as storage. The culling's draws, flat
   * and tubes, draw the seen segments' quads, and the kept segments' quads replace the old ones in `keptQuads`.
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

  /** Puts `meshes` in place of the kept segments' quads, and lets the old quads go. */
  private keep(meshes: THREE.Mesh<THREE.InstancedBufferGeometry>[]): void {
    const was = [...this.keptQuads.children] as THREE.Mesh<THREE.InstancedBufferGeometry>[];
    for (const mesh of was) mesh.geometry.dispose();
    this.letGo(...was);
    for (const mesh of meshes) mesh.frustumCulled = false;
    this.keptQuads.add(...meshes);
  }

  /**
   * Sets up the pack's segments, if there is a pack, for the frame drawn in `rest` (`restOf`). With culling, the kept
   * segments are drawn to depth and the culling's tests run before the frame is drawn. Where culling is off or failed,
   * every segment is drawn.
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
      const { uShift, uHidden } = this.uniforms;
      if (culling.run(this.camera, uShift.value, this.gpu.tubeFrom.value, uHidden.value, end, rest))
        return;
    } else if (this.culls) {
      // The culling reported its failure once, when it failed. A pack's stream made since then, or one that was there
      // while culling was off, did not hear it, so report it again.
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
   * Culls the somas drawn alone and opaque: the culling's test runs before the frame, and the frame draws the somas
   * seen in place of the pieces. The test takes each soma at the largest size it swells to while spikes are replayed.
   * When the somas are not culled, the culling's targets are let go of. Where the test could not run, the pieces are
   * drawn from this frame on.
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
   * After `e`, turns the glow off for good if the occlusion glowed, else the occlusion itself, and points the renderer
   * back at the canvas. If the occlusion fails again without the glow, the next frame turns it off.
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

  protected override readPick(scene: THREE.Scene, at: PickWindow): Promise<Uint8Array> {
    const { renderer } = this;
    const target = this.pickTarget();
    const side = target.width;
    this.gpu.sync();
    // The seen segments were culled for the last frame drawn, and the view may have moved since: cull for the whole
    // view again.
    if (this.framePending) this.cull(this.restOf(this.drawnMoving));
    this.drawPick(renderer, target, scene, at);
    return renderer
      .readRenderTargetPixelsAsync(target, 0, 0, side, side)
      .then((read) => packed(read as Uint8Array, side));
  }

  /** Compiled for the pick's target, because the pipelines are made for its format. */
  protected override compile(scene: THREE.Scene): void {
    const { renderer } = this;
    renderer.setRenderTarget(this.pickTarget());
    void renderer.compileAsync(scene, this.camera);
    renderer.setRenderTarget(null);
  }

  /** Writes rows of the glow into three's own texture once three has made it: three's WebGPU uploads textures whole. */
  protected override glowRowsWriter(): GlowRowsWriter {
    return (texture, texels, rows) => {
      const gpu = gpuTexture(this.renderer, texture);
      if (!gpu) return false;
      for (const row of rows) {
        this.device.queue.writeTexture(
          { texture: gpu, origin: { x: 0, y: row } },
          texels,
          { offset: row * texture.image.width, bytesPerRow: texture.image.width },
          { width: texture.image.width, height: 1 }
        );
      }
      return true;
    };
  }

  /** The target a pick is drawn into, `pickSide` square. */
  private pickTarget(): THREE.RenderTarget {
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
