// @vitest-environment jsdom
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Viewer } from '@/features/entities/cell-morphology/morpho-viewer/engine/viewer';
import { MORPHOLOGY_SURFACE } from '@/features/viewer-3d/engine/looks';
import { SceneViewer, type SceneViewerOptions } from '@/features/viewer-3d/engine/scene-viewer';

import type { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

const { FakeRenderer } = vi.hoisted(() => {
  /** Draws nothing; it keeps what it was made with, the target bound, and the target each compile was for. */
  class FakeRenderer {
    domElement = document.createElement('canvas');
    toneMapping = -1;
    toneMappingExposure = 1;
    loop: (() => void) | null = null;
    target: unknown = null;
    compiledFor: unknown[] = [];
    render = vi.fn();

    constructor(readonly parameters: { antialias?: boolean }) {
      Object.defineProperties(this.domElement, {
        clientWidth: { value: 400 },
        clientHeight: { value: 300 },
      });
    }

    setAnimationLoop(loop: (() => void) | null): void {
      this.loop = loop;
    }

    getPixelRatio(): number {
      return 1;
    }

    getSize(size: { set(w: number, h: number): unknown }) {
      return size.set(400, 300);
    }

    getRenderTarget(): unknown {
      return this.target;
    }

    setRenderTarget(target: unknown): void {
      this.target = target;
    }

    compileAsync(): Promise<void> {
      this.compiledFor.push(this.target);
      return Promise.resolve();
    }

    setPixelRatio(): void {}
    setClearColor(): void {}
    setSize(): void {}
    dispose(): void {}
    forceContextLoss(): void {}
  }
  return { FakeRenderer };
});

vi.mock('three', async (importOriginal) => ({
  ...(await importOriginal<typeof import('three')>()),
  WebGLRenderer: FakeRenderer,
}));

interface Internals {
  renderer: InstanceType<typeof FakeRenderer>;
  composer: EffectComposer | null;
  gtao: (GTAOPass & { _renderGBuffer: boolean }) | null;
  chunks: THREE.Group;
}

const BARE: SceneViewerOptions = { surface: [], aoDepth: 'main-pass', composeAlways: true };

let viewers: SceneViewer[] = [];

function make(options: SceneViewerOptions): Internals {
  const host = document.body.appendChild(document.createElement('div'));
  Object.defineProperties(host, { clientWidth: { value: 400 }, clientHeight: { value: 300 } });
  const viewer = new SceneViewer(host, options);
  viewers.push(viewer);
  return viewer as unknown as Internals;
}

/** A degenerate triangle with an EM chunk's attributes. */
function placeholder(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Uint16Array(12), 4, true));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(12), 4, true));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2]), 1));
  return geo;
}

let composerRender: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  // The matcaps are drawn on a 2D canvas, which jsdom lacks; a stub is enough to build them.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createRadialGradient: () => ({ addColorStop() {} }),
    fillRect() {},
  } as unknown as CanvasRenderingContext2D);
});

beforeEach(() => {
  composerRender = vi.spyOn(EffectComposer.prototype, 'render').mockImplementation(() => {});
});

afterEach(() => {
  for (const v of viewers) v.dispose();
  viewers = [];
  composerRender.mockRestore();
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('scene viewer', () => {
  it('draws every frame through the composer onto a canvas without antialiasing, where asked to', () => {
    const bare = make(BARE);
    expect(bare.renderer.parameters.antialias).toBe(false);
    bare.renderer.loop?.();
    expect(composerRender).toHaveBeenCalledTimes(1);
    expect(bare.renderer.render).not.toHaveBeenCalled();

    composerRender.mockClear();
    const morphology = make({ surface: MORPHOLOGY_SURFACE });
    expect(morphology.renderer.parameters.antialias).toBe(true);
    expect(morphology.composer).toBeNull();
    morphology.renderer.loop?.();
    expect(morphology.renderer.render).toHaveBeenCalledTimes(1);
    expect(composerRender).not.toHaveBeenCalled();
  });

  it("takes the ambient occlusion's depth from the main pass, resolved from its multisampled target", () => {
    const { composer, gtao } = make(BARE);
    const target = composer?.renderTarget2;
    expect(target?.samples).toBe(4);
    expect(target?.resolveDepthBuffer).toBe(true);
    expect(target?.depthTexture).toBeInstanceOf(THREE.DepthTexture);
    expect(gtao?.depthTexture).toBe(target?.depthTexture);
    expect(gtao?._renderGBuffer).toBe(false);
    // No normals of its own: they are rebuilt from the depth.
    expect(gtao?.gtaoMaterial.defines.NORMAL_VECTOR_TYPE).toBe(0);
  });

  it("keeps the morphology's own occlusion pass, displaced as the surface is drawn", () => {
    const host = document.body.appendChild(document.createElement('div'));
    const viewer = new Viewer(host);
    viewers.push(viewer);
    viewer.setAO(true);
    const { composer, gtao } = viewer as unknown as Internals;
    expect(composer?.renderTarget2.depthTexture).toBeNull();
    expect(composer?.renderTarget2.resolveDepthBuffer).toBe(false);
    expect(gtao?._renderGBuffer).toBe(true);
    expect(gtao?.normalMaterial.customProgramCacheKey()).toContain('displace-per-vertex');
  });

  it("compiles the look for the composer's target, then draws the placeholder once and takes it away", async () => {
    const viewer = make(BARE);
    const { renderer, composer, chunks } = viewer;
    const geo = placeholder();
    const warm = (viewer as unknown as SceneViewer).warmUp(geo);
    expect(renderer.compiledFor).toEqual([composer?.renderTarget2]);
    expect(renderer.target).toBeNull();
    expect(chunks.children.map((m) => (m as THREE.Mesh).geometry)).toEqual([geo]);
    await warm;
    expect(composerRender).toHaveBeenCalledTimes(1);
    expect(chunks.children).toHaveLength(0);
  });

  it('compiles for the canvas when frames go straight to it', async () => {
    const viewer = make({ surface: MORPHOLOGY_SURFACE });
    await (viewer as unknown as SceneViewer).warmUp(placeholder());
    expect(viewer.renderer.compiledFor).toEqual([null]);
    expect(viewer.renderer.render).toHaveBeenCalledTimes(1);
  });
});
