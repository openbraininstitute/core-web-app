import { vec4 } from 'three/tsl';
import * as THREE from 'three/webgpu';

import { MAX_PIXEL_RATIO } from '@/features/viewer-3d/engine/scene-view';

import { type CircuitMaterials, CircuitView, PICK_REACH } from '../circuit-view';
import { cellNearMiddle } from '../impostors';
import { GpuUniforms } from './gpu-uniforms';
import { somaCloudMaterials } from './soma-cloud-gpu';

/** What WebGPU asks of a row of a texture copied into a buffer: a multiple of this many bytes. */
const ROW_ALIGNMENT = 256;

/** A material that draws nothing, for what the WebGPU tier does not draw yet. */
function nothing(): THREE.MeshBasicNodeMaterial {
  const material = new THREE.MeshBasicNodeMaterial();
  material.vertexNode = vec4(2, 2, 2, 1);
  material.fragmentNode = vec4(0);
  return material;
}

/**
 * The circuit's morphologies on WebGPU (`CircuitView`), on a device of the page's own (`probeWebGPU`), which goes
 * with the view. Each material writes the colour shown, as the WebGL 2 tier's do: Studio's tone maps its own, and the
 * somas are drawn as they come out, so the renderer converts nothing and draws straight to the canvas.
 */
export class CircuitMorphologyGPU extends CircuitView {
  protected materials: CircuitMaterials;
  private renderer: THREE.WebGPURenderer;
  private device: GPUDevice;
  private gpu: GpuUniforms;
  private idTarget: THREE.RenderTarget | null = null;

  /** A view in `host` on `device`; `onLost` is told if the device is lost, which the view does not draw past. */
  static async create(
    host: HTMLElement,
    device: GPUDevice,
    onLost: () => void
  ): Promise<CircuitMorphologyGPU> {
    const renderer = new THREE.WebGPURenderer({ device, antialias: true, alpha: true });
    await renderer.init();
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
    renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    super(host, renderer.domElement, renderer.getPixelRatio());
    this.renderer = renderer;
    this.device = device;
    device.lost.then((info) => {
      if (info.reason !== 'destroyed' && !this.disposed) onLost();
    });
    this.gpu = new GpuUniforms(this.uniforms, this.cloudUniforms);
    const cloud = somaCloudMaterials(this.gpu);
    this.materials = {
      segment: nothing(),
      soma: nothing(),
      cloud: cloud.cloud,
      ids: { segment: nothing(), soma: nothing(), cloud: cloud.id },
      spots: { segment: nothing(), soma: nothing() },
      electrode: nothing(),
      synapse: nothing(),
      marker: nothing(),
    };
    this.start();
  }

  protected override disposeStage(): void {
    this.idTarget?.dispose();
    this.renderer.dispose();
    this.device.destroy();
  }

  protected override animate(loop: (() => void) | null): void {
    void this.renderer.setAnimationLoop(loop);
  }

  protected override sizeStage(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  protected override draw(): null {
    this.gpu.sync();
    this.renderer.render(this.scene, this.camera);
    return null;
  }

  protected override numberAround(
    scene: THREE.Scene,
    x: number,
    y: number
  ): Promise<number | null> {
    const { renderer } = this;
    const ratio = this.pixelRatio;
    const target = this.pickTarget();
    const side = target.width;
    const middle = (side - 1) / 2;
    // The whole view, placed so that the pixel asked for is the target's middle one. WebGPU counts rows down.
    const { width, height } = this.canvas;
    target.viewport.set(
      middle - Math.floor(x * ratio),
      middle - Math.floor(y * ratio),
      width,
      height
    );
    // No frame may have been drawn since the camera last moved.
    this.camera.updateMatrixWorld();
    this.gpu.sync();
    renderer.setRenderTarget(target);
    renderer.render(scene, this.camera);
    renderer.setRenderTarget(null);
    return renderer.readRenderTargetPixelsAsync(target, 0, 0, side, side).then(
      (read) => cellNearMiddle(packed(read as Uint8Array, side), side),
      () => null
    );
  }

  /** Built for the pick's target, whose format the pipelines are made for. */
  protected override compile(scene: THREE.Scene): void {
    const { renderer } = this;
    renderer.setRenderTarget(this.pickTarget());
    void renderer.compileAsync(scene, this.camera);
    renderer.setRenderTarget(null);
  }

  private pickTarget(): THREE.RenderTarget {
    const side = 2 * Math.ceil(PICK_REACH * this.pixelRatio) + 1;
    this.idTarget ??= new THREE.RenderTarget(side, side);
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
