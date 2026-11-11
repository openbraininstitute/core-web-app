import * as THREE from 'three';

import { GpuTimer } from '@/features/viewer-3d/engine/gpu-timer';
import { EXPOSURE } from '@/features/viewer-3d/engine/looks';
import { MAX_PIXEL_RATIO } from '@/features/viewer-3d/engine/scene-view';

import {
  type CircuitMaterials,
  CircuitView,
  type FrameTiming,
  type PickWindow,
} from './circuit-view';
import { SEGMENT_BUDGET } from './detail';
import { electrodeMaterial } from './electrodes';
import { idMaterial, impostor } from './impostors';
import { somaCloudIdMaterial, somaCloudMaterial } from './soma-cloud';

/** Reorders `pixels`, a square `side` wide that WebGL reads bottom row first, to top row first. */
function topDown(pixels: Uint8Array, side: number): Uint8Array {
  const rows = new Uint8Array(pixels.length);
  const stride = 4 * side;
  for (let row = 0; row < side; row++) {
    rows.set(pixels.subarray(row * stride, (row + 1) * stride), (side - 1 - row) * stride);
  }
  return rows;
}

/**
 * The circuit's morphologies on WebGL 2 (`CircuitView`), the fallback where WebGPU is missing. Frames go straight to
 * the antialiased canvas, with no ambient occlusion: a flat quad has a flat depth. They are timed on the GPU
 * (`GpuTimer`) where the view asks. When its context is lost, it stops drawing and calls `onLost`, so that the view can
 * be made anew.
 */
export class CircuitMorphologyViewer extends CircuitView {
  protected materials: CircuitMaterials;
  private renderer: THREE.WebGLRenderer;
  private idTarget: THREE.WebGLRenderTarget | null = null;
  /**
   * The timer that measures what frames cost the GPU, made the first time a frame is timed, or null without WebGL 2;
   * and what the frame it is measuring was timed for.
   */
  private timer: GpuTimer | null | undefined;
  private timed: FrameTiming | null = null;

  constructor(
    container: HTMLElement,
    private onLost: (() => void) | null = null
  ) {
    // Transparent canvas over the container's background.
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      depth: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = EXPOSURE;
    super(container, renderer.domElement, renderer.getPixelRatio(), SEGMENT_BUDGET.webgl);
    this.renderer = renderer;
    renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    const { uniforms, cloudUniforms, spotUniforms, pixelRatio } = this;
    // The look's own material draws the segments; the somas have a copy of it.
    const look = this.look.material;
    this.materials = {
      segment: [impostor(look, 'segment', uniforms)],
      soma: impostor(look.clone(), 'soma', uniforms),
      cloud: somaCloudMaterial(uniforms, cloudUniforms),
      wholeCloud: somaCloudMaterial(uniforms, cloudUniforms, { whole: true }),
      ids: {
        segment: [idMaterial('segment', uniforms)],
        soma: idMaterial('soma', uniforms),
        cloud: somaCloudIdMaterial(uniforms, cloudUniforms),
      },
      spots: {
        segment: [idMaterial('segment', uniforms, spotUniforms)],
        soma: idMaterial('soma', uniforms, spotUniforms),
      },
      electrode: electrodeMaterial(this.electrodeUniforms, pixelRatio),
      synapse: electrodeMaterial(this.synapseUniforms, pixelRatio, { among: true }),
      marker: electrodeMaterial(this.markerUniforms, pixelRatio),
    };
    this.start();
  }

  protected override disposeStage(): void {
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.idTarget?.dispose();
    this.timer?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  protected override animate(loop: (() => void) | null): void {
    this.renderer.setAnimationLoop(loop);
  }

  protected override sizeStage(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  protected override scaleDrawing(scale: number): void {
    this.renderer.setPixelRatio(this.pixelRatio * scale);
  }

  /** Draws a frame, timed on the GPU where `timing` asks for it and no other frame is being timed. */
  protected override draw(): void {
    const { timing } = this;
    const timer = timing ? this.timerNow() : null;
    const timed = timer !== null && !timer.busy;
    if (timed) {
      this.timed = timing;
      timer.begin();
    }
    this.renderer.render(this.scene, this.camera);
    if (timed) timer.end();
  }

  private timerNow(): GpuTimer | null {
    if (this.timer === undefined) {
      const gl = this.renderer.getContext();
      this.timer =
        typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
          ? new GpuTimer(gl, (ms) => {
              if (this.timed) this.measured(this.timed, ms);
            })
          : null;
    }
    return this.timer;
  }

  /**
   * Calls `onLost` once. The browser took the context back, most often because the page asked for more contexts than
   * it allows and this one was the oldest.
   */
  private onContextLost = (): void => {
    const told = this.onLost;
    this.onLost = null;
    told?.();
  };

  protected override readPick(scene: THREE.Scene, at: PickWindow): Promise<Uint8Array> {
    const { renderer } = this;
    const target = this.pickTarget();
    const side = target.width;
    this.drawPick(renderer, target, scene, at);
    const pixels = new Uint8Array(4 * side * side);
    return renderer
      .readRenderTargetPixelsAsync(target, 0, 0, side, side, pixels)
      .then(() => topDown(pixels, side));
  }

  /** Compiles for the pick's target: three builds a program for the colour space and tone mapping of its target. */
  protected override compile(scene: THREE.Scene): void {
    const { renderer } = this;
    renderer.setRenderTarget(this.pickTarget());
    renderer.compile(scene, this.camera);
    renderer.setRenderTarget(null);
  }

  /** The target a pick is drawn into, `pickSide` square. */
  private pickTarget(): THREE.WebGLRenderTarget {
    this.idTarget ??= new THREE.WebGLRenderTarget(this.pickSide, this.pickSide);
    return this.idTarget;
  }
}
