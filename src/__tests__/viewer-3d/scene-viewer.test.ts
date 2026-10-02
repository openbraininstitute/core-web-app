// @vitest-environment jsdom
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Viewer } from '@/features/entities/cell-morphology/morpho-viewer/engine/viewer';
import { DepthNormalsPass } from '@/features/viewer-3d/engine/depth-normals-pass';
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
    autoClear = true;
    scissor = [0, 0, 400, 300];
    scissorTest = false;
    writes = { color: true, depth: true };
    state = {
      buffers: {
        color: { setMask: (v: boolean) => this.setWrite('color', v), setLocked() {} },
        depth: { setMask: (v: boolean) => this.setWrite('depth', v), setLocked() {} },
      },
    };
    /** What each draw wrote to, with what scissor. */
    drawn: {
      writes: { color: boolean; depth: boolean };
      scissor: number[] | null;
      autoClear: boolean;
    }[] = [];
    render = vi.fn(() => {
      this.drawn.push({
        writes: { ...this.writes },
        scissor: this.scissorTest ? [...this.scissor] : null,
        autoClear: this.autoClear,
      });
    });

    /** Each colour format's sample counts, as WebGL 2 gives them, in descending order; none where it can't be drawn into. */
    static samples: Record<number, number[]> = { 34842: [8, 4, 2], 32856: [8, 4, 2] };
    gl = {
      RENDERBUFFER: 0x8d41,
      SAMPLES: 0x80a9,
      RGBA16F: 0x881a,
      RGBA8: 0x8058,
      getInternalformatParameter: (_target: number, format: number) => {
        const counts = FakeRenderer.samples[format];
        return counts ? Int32Array.from(counts) : null;
      },
    };

    constructor(readonly parameters: { antialias?: boolean; depth?: boolean }) {
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

    private setWrite(buffer: 'color' | 'depth', v: boolean): void {
      this.writes[buffer] = v;
    }

    getScissor(v: { set(...xywh: number[]): unknown }) {
      return v.set(...this.scissor);
    }

    getScissorTest(): boolean {
      return this.scissorTest;
    }

    setScissor(x: number | { toArray(): number[] }, y?: number, w?: number, h?: number): void {
      this.scissor = typeof x === 'number' ? [x, y ?? 0, w ?? 0, h ?? 0] : x.toArray();
    }

    setScissorTest(on: boolean): void {
      this.scissorTest = on;
    }

    getContext(): unknown {
      return this.gl;
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
  it('draws every frame through the composer onto a canvas without antialiasing or depth, where asked to', () => {
    const bare = make(BARE);
    expect(bare.renderer.parameters).toMatchObject({ antialias: false, depth: false });
    bare.renderer.loop?.();
    expect(composerRender).toHaveBeenCalledTimes(1);
    expect(bare.renderer.render).not.toHaveBeenCalled();

    composerRender.mockClear();
    const morphology = make({ surface: MORPHOLOGY_SURFACE });
    expect(morphology.renderer.parameters).toMatchObject({ antialias: true, depth: true });
    expect(morphology.composer).toBeNull();
    morphology.renderer.loop?.();
    expect(morphology.renderer.render).toHaveBeenCalledTimes(1);
    expect(composerRender).not.toHaveBeenCalled();
  });

  it("calls none of a subclass's overrides while it is built, and tells it when what a frame costs changes", () => {
    const heard: string[] = [];
    class Content extends SceneViewer {
      // Set only once the base class's constructor has returned.
      private log = heard;
      protected override applyLook(): void {
        super.applyLook();
        this.log.push('look');
      }
      protected override frameChanged(): void {
        this.log.push('frame');
      }
    }
    const host = document.body.appendChild(document.createElement('div'));
    Object.defineProperties(host, { clientWidth: { value: 400 }, clientHeight: { value: 300 } });
    const viewer = new Content(host, BARE);
    viewers.push(viewer);
    expect(heard).toEqual([]);
    viewer.setLook('studio');
    viewer.setAO(true);
    viewer.setAODepth('own-pass');
    expect(heard).toEqual(['look', 'frame', 'frame', 'frame']);
  });

  it("takes the ambient occlusion's depth from the main pass, resolved from its multisampled target while it is on", () => {
    const viewer = make(BARE);
    const { composer, gtao } = viewer;
    const target = composer?.renderTarget2;
    expect(target?.samples).toBe(4);
    // Off, the depth is neither resolved nor kept past the frame.
    expect(target?.resolveDepthBuffer).toBe(false);
    expect(target?.storeMultisampledDepthBuffer).toBe(false);
    (viewer as unknown as SceneViewer).setAO(true);
    expect(target?.resolveDepthBuffer).toBe(true);
    expect(target?.storeMultisampledDepthBuffer).toBe(true);
    expect(target?.depthTexture).toBeInstanceOf(THREE.DepthTexture);
    expect(gtao?.depthTexture).toBe(target?.depthTexture);
    expect(gtao?._renderGBuffer).toBe(false);
    // No normals drawn: they are rebuilt from the depth once, by a pass of their own before the occlusion.
    const passes = composer?.passes ?? [];
    const normals = passes[passes.indexOf(gtao as GTAOPass) - 1] as DepthNormalsPass;
    expect(normals).toBeInstanceOf(DepthNormalsPass);
    expect(normals.enabled).toBe(true);
    expect(gtao?.normalTexture).toBe(normals.texture);
    expect(gtao?.gtaoMaterial.defines.NORMAL_VECTOR_TYPE).toBe(1);
    expect(gtao?.pdMaterial.defines.NORMAL_VECTOR_TYPE).toBe(1);
    (viewer as unknown as SceneViewer).setAO(false);
    expect(normals.enabled).toBe(false);
  });

  it("draws into 8-bit colour where the GPU can't draw into half floats, with what samples it allows", () => {
    const formats = FakeRenderer.samples;
    try {
      FakeRenderer.samples = { 32856: [4, 2] };
      const eight = make(BARE).composer;
      expect(eight?.renderTarget2.texture.type).toBe(THREE.UnsignedByteType);
      expect(eight?.renderTarget1.texture.type).toBe(THREE.UnsignedByteType);
      expect(eight?.renderTarget2.samples).toBe(4);
      FakeRenderer.samples = { 34842: [2], 32856: [4] };
      const two = make(BARE).composer;
      expect(two?.renderTarget2.texture.type).toBe(THREE.HalfFloatType);
      expect(two?.renderTarget2.samples).toBe(2);
    } finally {
      FakeRenderer.samples = formats;
    }
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

  it('switches where the ambient occlusion reads its depth, building the passes again', () => {
    const viewer = make(BARE);
    const before = viewer.composer;
    const dispose = vi.spyOn(before as EffectComposer, 'dispose');
    (viewer as unknown as SceneViewer).setAODepth('own-pass');
    expect(dispose).toHaveBeenCalled();
    expect(viewer.composer).not.toBe(before);
    expect(viewer.composer?.renderTarget2.depthTexture).toBeNull();
    expect(viewer.gtao?._renderGBuffer).toBe(true);
    (viewer as unknown as SceneViewer).setAODepth('main-pass');
    expect(viewer.gtao?.depthTexture).toBe(viewer.composer?.renderTarget2.depthTexture);
  });

  it('tells the content before each frame whether the camera moves, and draws again when it asks to', () => {
    const host = document.body.appendChild(document.createElement('div'));
    const heard: boolean[] = [];
    class Content extends SceneViewer {
      protected override beforeDraw(moving: boolean): void {
        heard.push(moving);
        if (heard.length === 1) this.invalidate();
      }
    }
    const viewer = new Content(host, BARE);
    viewers.push(viewer);
    const { renderer } = viewer as unknown as Internals;
    for (let i = 0; i < 5 && renderer.loop; i++) renderer.loop();
    expect(heard).toEqual([false, false]);
    expect(renderer.loop).toBeNull();
    viewer.setSpin(true);
    renderer.loop?.();
    expect(heard.at(-1)).toBe(true);
  });

  it('draws unseen onto the canvas, writing nothing, scissored to a pixel, and puts it all back', () => {
    const viewer = make({ surface: MORPHOLOGY_SURFACE });
    const { renderer, chunks } = viewer;
    const mesh = new THREE.Mesh(placeholder());
    chunks.add(mesh);
    (viewer as unknown as { drawUnseen(o: THREE.Object3D[]): void }).drawUnseen([mesh]);
    expect(renderer.drawn).toEqual([
      { writes: { color: false, depth: false }, scissor: [0, 0, 1, 1], autoClear: false },
    ]);
    expect(renderer.writes).toEqual({ color: true, depth: true });
    expect(renderer.scissorTest).toBe(false);
    expect(renderer.autoClear).toBe(true);
    expect(mesh.layers.mask).toBe(1);
    expect(mesh.frustumCulled).toBe(true);
  });

  it('compiles for the canvas when frames go straight to it', async () => {
    const viewer = make({ surface: MORPHOLOGY_SURFACE });
    await (viewer as unknown as SceneViewer).warmUp(placeholder());
    expect(viewer.renderer.compiledFor).toEqual([null]);
    expect(viewer.renderer.render).toHaveBeenCalledTimes(1);
  });
});
