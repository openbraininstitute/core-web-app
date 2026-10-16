import * as THREE from 'three';

import { EXPOSURE } from '@/features/viewer-3d/engine/looks';
import { MAX_PIXEL_RATIO } from '@/features/viewer-3d/engine/scene-view';

import { type CircuitMaterials, CircuitView } from './circuit-view';
import { SEGMENT_BUDGET } from './detail';
import { electrodeMaterial } from './electrodes';
import { idMaterial, impostor } from './impostors';
import { somaCloudIdMaterial, somaCloudMaterial } from './soma-cloud';

/**
 * The circuit's morphologies on WebGL 2 (`CircuitView`), the fallback where WebGPU is missing. Frames go straight to
 * the antialiased canvas, with no ambient occlusion: a flat quad has a flat depth. After a lost context three uploads
 * the arrays again.
 */
export class CircuitMorphologyViewer extends CircuitView {
  protected materials: CircuitMaterials;
  protected readonly rowsUp = true;
  private renderer: THREE.WebGLRenderer;
  private idTarget: THREE.WebGLRenderTarget | null = null;

  constructor(container: HTMLElement) {
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
    renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
    const { uniforms, cloudUniforms, spotUniforms, pixelRatio } = this;
    // The look's own material draws the segments; the somas have a copy of it.
    const look = this.look.material;
    this.materials = {
      segment: [impostor(look, 'segment', uniforms)],
      soma: impostor(look.clone(), 'soma', uniforms),
      cloud: somaCloudMaterial(uniforms, cloudUniforms),
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
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.idTarget?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  protected override animate(loop: (() => void) | null): void {
    this.renderer.setAnimationLoop(loop);
  }

  protected override sizeStage(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  protected override draw(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private onContextRestored = (): void => this.invalidate();

  protected override readPick(scene: THREE.Scene): Promise<Uint8Array> {
    const { renderer } = this;
    const target = this.pickTarget();
    const side = target.width;
    renderer.setRenderTarget(target);
    renderer.render(scene, this.camera);
    renderer.setRenderTarget(null);
    const pixels = new Uint8Array(4 * side * side);
    return renderer
      .readRenderTargetPixelsAsync(target, 0, 0, side, side, pixels)
      .then(() => pixels);
  }

  /** Built for the pick's target: three builds a program for the colour space and tone mapping of where it draws. */
  protected override compile(scene: THREE.Scene): void {
    const { renderer } = this;
    renderer.setRenderTarget(this.pickTarget());
    renderer.compile(scene, this.camera);
    renderer.setRenderTarget(null);
  }

  protected override pickTarget(): THREE.WebGLRenderTarget {
    this.idTarget ??= new THREE.WebGLRenderTarget(this.pickSide, this.pickSide);
    return this.idTarget;
  }
}
