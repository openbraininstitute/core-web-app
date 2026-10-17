import * as THREE from 'three/webgpu';

import { MAX_PIXEL_RATIO } from '@/features/viewer-3d/engine/scene-view';
import { logError } from '@/utils/logger';

import { type ArenaDrawing, type CircuitMaterials, CircuitView } from '../circuit-view';
import { pixelSpan, SEGMENT_BUDGET } from '../detail';
import { type ArenaStorage, arenaOnGpu, arenaStorage } from './arena-gpu';
import { Culling, DRAWS } from './culling';
import { dotMaterials } from './dots-gpu';
import { GpuUniforms } from './gpu-uniforms';
import { arenaMaterials, impostorMaterials } from './impostors-gpu';
import { AO_RADIUS_CSS, Occlusion } from './occlusion-gpu';
import { somaCloudMaterials } from './soma-cloud-gpu';
import { checkHooks, threeLoop } from './three-hooks';

/** What WebGPU asks of a row of a texture copied into a buffer: a multiple of this many bytes. */
const ROW_ALIGNMENT = 256;

/** A pack's arena on the GPU: its materials, what they bind, and the culling of its segments. */
interface GpuArena extends ReturnType<typeof arenaMaterials> {
  storage: ArenaStorage;
  culling: Culling;
}

/**
 * The circuit's morphologies on WebGPU (`CircuitView`), on a device of the page's own (`probeWebGPU`), which goes
 * with the view. Each material writes the colour shown, as the WebGL 2 tier's do: Studio's tone maps its own, and the
 * somas are drawn as they come out, so the renderer converts nothing and draws straight to the canvas; a still frame of
 * morphologies goes through the ambient occlusion first (`Occlusion`). A pack's segments are culled (`Culling`): the
 * segments kept the frame before are drawn to depth (`keptQuads`), the culling's tests run, and the frame draws the
 * segments seen.
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
  /** Made at the first pack and kept, its programs with it: each pack's arena only binds its buffers to `storage`. */
  private arena: GpuArena | null = null;
  /** The kept segments' quads, drawn to depth before the culling's tests. */
  private keptQuads = new THREE.Scene();
  private drawingSize = new THREE.Vector2();

  /**
   * A view in `host` on `device`; `onLost` is told if the device is lost, which the view does not draw past. Aborted
   * (`signal`) before the renderer is ready, none is made.
   */
  static async create(
    host: HTMLElement,
    device: GPUDevice,
    onLost: () => void,
    signal?: AbortSignal
  ): Promise<CircuitMorphologyGPU> {
    const renderer = new THREE.WebGPURenderer({ device, antialias: true, alpha: true });
    await renderer.init();
    try {
      if (signal?.aborted) throw signal.reason;
      checkHooks(renderer);
    } catch (e) {
      renderer.dispose();
      throw e;
    }
    return new CircuitMorphologyGPU(host, renderer, device, onLost);
  }

  private constructor(
    host: HTMLElement,
    renderer: THREE.WebGPURenderer,
    device: GPUDevice,
    onLost: () => void
  ) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    super(host, renderer.domElement, renderer.getPixelRatio(), SEGMENT_BUDGET.webgpu);
    this.renderer = renderer;
    this.device = device;
    device.lost.then((info) => {
      if (info.reason !== 'destroyed' && !this.disposed) onLost();
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
      const cloud = somaCloudMaterials(this.gpu);
      const impostors = impostorMaterials(this.gpu, this.look);
      this.materials = {
        segment: impostors.segment,
        soma: impostors.soma,
        cloud: cloud.cloud,
        ids: { ...impostors.ids, cloud: cloud.id },
        spots: impostors.spots,
        ...dotMaterials(this.gpu, this.pixelRatio),
      };
      this.start();
    } catch (e) {
      // Nothing of it stays in the host, where WebGL 2 takes its place.
      this.dispose();
      throw e;
    }
  }

  protected override disposeStage(): void {
    this.idTarget?.dispose();
    this.occlusion?.dispose();
    const { segment = [], ids = [], kept = [] } = this.arena ?? {};
    for (const material of [...segment, ...ids, ...kept]) material.dispose();
    this.arena?.culling.dispose();
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

  /**
   * Still, morphologies are drawn with ambient occlusion; moving, and the somas always, without: the cloud of somas
   * writes no surface for it. Its targets are the size of the canvas, so it is let go of with the morphologies.
   */
  protected override draw(moving: boolean): void {
    this.gpu.sync();
    this.cull(this.restOf(moving));
    if (!this.drawsMorphologies) this.dropOcclusion();
    const occlusion = moving || !this.drawsMorphologies ? null : this.occlusionNow();
    if (occlusion) {
      try {
        occlusion.render(this.occlusionReach());
        return;
      } catch (e) {
        // Its passes are put together at its first frame, where three's parts it reads may be missing.
        this.withoutOcclusion(e);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  /** The occlusion was made for the other camera. */
  protected override projectionChanged(): void {
    this.dropOcclusion();
  }

  /**
   * In buffers of the page's, which the segments' materials read as storage, as many as their ends, the largest at 8
   * floats a segment, take in a binding: the seen segments' quads drawn by the culling's draws, flat and tubes, and the
   * kept segments' quads in their place in `keptQuads`.
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
    const { storage, segment, ids, kept, culling } = this.arena;
    const { maxStorageBufferBindingSize, maxBufferSize } = this.device.limits;
    this.keep([
      new THREE.Mesh(culling.quads(DRAWS.keptFlat), kept[0]),
      new THREE.Mesh(culling.quads(DRAWS.keptTubes), kept[1]),
    ]);
    return {
      uploadsOf: (ends, words, blocks) =>
        arenaOnGpu(this.renderer, this.device, storage, { ends, words, blocks }, (buffers) =>
          culling.setArena(buffers)
        ),
      most: Math.floor(Math.min(maxStorageBufferBindingSize, maxBufferSize) / (8 * 4)),
      segment,
      ids,
      quads: [culling.quads(DRAWS.seenFlat), culling.quads(DRAWS.seenTubes)],
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

  private occlusionNow(): Occlusion | null {
    if (!this.occlusion && this.occluding) {
      try {
        this.occlusion = new Occlusion(this.renderer, this.scene, this.camera);
      } catch (e) {
        this.withoutOcclusion(e);
      }
    }
    return this.occlusion;
  }

  /** The occlusion off for good after `e`, and the renderer drawing to the canvas again. */
  private withoutOcclusion(e: unknown): void {
    this.dropOcclusion();
    this.occluding = false;
    this.renderer.setRenderTarget(null);
    this.renderer.setMRT(null);
    logError('Drawn without ambient occlusion', e);
  }

  private dropOcclusion(): void {
    this.occlusion?.dispose();
    this.occlusion = null;
  }

  /** How far the occlusion reaches, µm: `AO_RADIUS_CSS` on screen, at the orbit's target in perspective. */
  private occlusionReach(): number {
    const { camera } = this;
    const away = camera instanceof THREE.PerspectiveCamera ? this.controls.getDistance() : 1;
    return AO_RADIUS_CSS * pixelSpan(camera.projectionMatrix, this.height) * away;
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
