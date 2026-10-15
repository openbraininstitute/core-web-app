import * as THREE from 'three/webgpu';

import { MAX_PIXEL_RATIO } from '@/features/viewer-3d/engine/scene-view';

import { type CircuitMaterials, CircuitView } from '../circuit-view';
import { dotMaterials } from './dots-gpu';
import { GpuUniforms } from './gpu-uniforms';
import { impostorMaterials } from './impostors-gpu';
import { somaCloudMaterials } from './soma-cloud-gpu';

/** What WebGPU asks of a row of a texture copied into a buffer: a multiple of this many bytes. */
const ROW_ALIGNMENT = 256;

/**
 * The circuit's morphologies on WebGPU (`CircuitView`), on a device of the page's own (`probeWebGPU`), which goes
 * with the view. Each material writes the colour shown, as the WebGL 2 tier's do: Studio's tone maps its own, and the
 * somas are drawn as they come out, so the renderer converts nothing and draws straight to the canvas.
 */
export class CircuitMorphologyGPU extends CircuitView {
  protected materials: CircuitMaterials;
  protected readonly rowsUp = false;
  private renderer: THREE.WebGPURenderer;
  private device: GPUDevice;
  private gpu: GpuUniforms;
  private idTarget: THREE.RenderTarget | null = null;

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
    if (signal?.aborted) {
      renderer.dispose();
      throw signal.reason;
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
    super(host, renderer.domElement, renderer.getPixelRatio());
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

  protected override draw(): void {
    this.gpu.sync();
    this.renderer.render(this.scene, this.camera);
  }

  protected override readPick(scene: THREE.Scene): Promise<Uint8Array> {
    const { renderer } = this;
    const target = this.pickTarget();
    const side = target.width;
    this.gpu.sync();
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

interface Turns {
  start(): void;
  stop(): void;
}

/** three's own loop, a private part of the renderer: null where a release of three changed it, which leaves it turning. */
function threeLoop(renderer: THREE.WebGPURenderer): Turns | null {
  const turns = (renderer as unknown as { _animation?: Partial<Turns> | null })._animation;
  return typeof turns?.start === 'function' && typeof turns.stop === 'function'
    ? (turns as Turns)
    : null;
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
