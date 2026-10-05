// @vitest-environment jsdom
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Viewer } from '@/features/entities/cell-morphology/morpho-viewer/engine/viewer';
import { DepthNormalsPass } from '@/features/viewer-3d/engine/depth-normals-pass';
import { MORPHOLOGY_SURFACE, PLAIN } from '@/features/viewer-3d/engine/looks';
import {
  type MovingFrame,
  SceneViewer,
  type SceneViewerOptions,
} from '@/features/viewer-3d/engine/scene-viewer';

import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const { FakeRenderer } = vi.hoisted(() => {
  /** Draws nothing; it keeps what it was made with, the target bound, and the target each compile was for. */
  class FakeRenderer {
    domElement = document.createElement('canvas');
    loop: (() => void) | null = null;
    target: unknown = null;
    compiledFor: unknown[] = [];
    render = vi.fn();

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

    constructor(readonly parameters: { antialias?: boolean; depth?: boolean }) {}

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

interface Pipeline {
  composer: EffectComposer;
  render: { camera: THREE.Camera };
  gtao: GTAOPass & { _renderGBuffer: boolean };
  bloom: { enabled: boolean } | null;
  output: OutputPass;
}

interface Internals {
  renderer: InstanceType<typeof FakeRenderer>;
  main: Pipeline | null;
  movingPipeline: Pipeline | null;
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
  geo.setAttribute('position', new THREE.BufferAttribute(new Uint16Array(12), 4));
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
  // A test that failed before putting the clock back leaves it to the next.
  if (vi.isMockFunction(performance.now)) vi.mocked(performance.now).mockRestore();
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
    expect(morphology.main).toBeNull();
    morphology.renderer.loop?.();
    expect(morphology.renderer.render).toHaveBeenCalledTimes(1);
    expect(composerRender).not.toHaveBeenCalled();
  });

  it("draws a surface without vertex colours in the colour set, over either background, and in its looks' own for PLAIN", () => {
    const viewer = make(BARE) as unknown as SceneViewer;
    const studio = () =>
      `#${(viewer.looks.find((l) => l.id === 'studio')?.material as THREE.MeshStandardMaterial).color.getHexString()}`;
    viewer.setSurfaceColor({ light: '#3f77c9', dark: '#6ba5fb' });
    expect(studio()).toBe('#3f77c9');
    viewer.setDark(true);
    expect(studio()).toBe('#6ba5fb');
    viewer.setSurfaceColor(PLAIN);
    expect(studio()).toBe('#c4c7cc');

    // A morphology keeps its neurite colours, which its material's white lets through.
    const morphology = make({ surface: MORPHOLOGY_SURFACE }) as unknown as SceneViewer;
    morphology.setSurfaceColor({ light: '#3f77c9', dark: '#6ba5fb' });
    const material = morphology.looks.find((l) => l.id === 'studio')?.material;
    expect((material as THREE.MeshStandardMaterial).color.getHexString()).toBe('ffffff');
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
    const { composer, gtao } = viewer.main as Pipeline;
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
      const eight = make(BARE).main?.composer;
      expect(eight?.renderTarget2.texture.type).toBe(THREE.UnsignedByteType);
      expect(eight?.renderTarget1.texture.type).toBe(THREE.UnsignedByteType);
      expect(eight?.renderTarget2.samples).toBe(4);
      FakeRenderer.samples = { 34842: [2], 32856: [4] };
      const two = make(BARE).main?.composer;
      expect(two?.renderTarget2.texture.type).toBe(THREE.HalfFloatType);
      expect(two?.renderTarget2.samples).toBe(2);
    } finally {
      FakeRenderer.samples = formats;
    }
  });

  it('darkens the scene by the occlusion in the output pass, or in GTAO where bloom comes after it', () => {
    const viewer = make(BARE);
    (viewer as unknown as SceneViewer).setAO(true);
    const { gtao, composer } = viewer.main as Pipeline;
    const output = composer?.passes.at(-1) as OutputPass;
    expect(gtao?.output).toBe(GTAOPass.OUTPUT.Off);
    expect(gtao?.needsSwap).toBe(false);
    expect(output.uniforms.tAO.value).toBe(gtao?.gtaoMap);
    expect(output.uniforms.aoIntensity.value).toBe(1);
    expect((output.material as THREE.ShaderMaterial).fragmentShader).toContain(
      'gl_FragColor.rgb *= mix( vec3( 1.0 ), texture2D( tAO, vUv ).rgb, aoIntensity )'
    );

    (viewer.main?.bloom as { enabled: boolean }).enabled = true;
    (viewer as unknown as SceneViewer).setAO(true);
    expect(gtao?.output).toBe(GTAOPass.OUTPUT.Default);
    expect(gtao?.needsSwap).toBe(true);
    expect(output.uniforms.aoIntensity.value).toBe(0);
  });

  it('occludes towards the eye along the view axis in an orthographic view, which can have the cell behind the camera', () => {
    const viewer = make(BARE);
    const { gtao } = viewer.main as Pipeline;
    expect(gtao.gtaoMaterial.fragmentShader).toContain(
      'vec3 viewDir = PERSPECTIVE_CAMERA == 1 ? normalize(-viewPos.xyz) : vec3(0.0, 0.0, 1.0);'
    );
    expect(gtao.gtaoMaterial.defines.PERSPECTIVE_CAMERA).toBe(0);
    (viewer as unknown as SceneViewer).setProjection('perspective');
    expect(gtao.gtaoMaterial.defines.PERSPECTIVE_CAMERA).toBe(1);
  });

  it("keeps the morphology's own occlusion pass, displaced as the surface is drawn", () => {
    const host = document.body.appendChild(document.createElement('div'));
    const viewer = new Viewer(host);
    viewers.push(viewer);
    viewer.setAO(true);
    const { composer, gtao } = (viewer as unknown as Internals).main as Pipeline;
    expect(composer?.renderTarget2.depthTexture).toBeNull();
    expect(composer?.renderTarget2.resolveDepthBuffer).toBe(false);
    expect(gtao?._renderGBuffer).toBe(true);
    expect(gtao?.normalMaterial.customProgramCacheKey()).toContain('displace-per-vertex');
  });

  it("compiles the look for the composer's target, then draws the placeholder once and takes it away", async () => {
    const viewer = make(BARE);
    const { renderer, chunks } = viewer;
    const { composer } = viewer.main as Pipeline;
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
    const before = viewer.main?.composer;
    const dispose = vi.spyOn(before as EffectComposer, 'dispose');
    (viewer as unknown as SceneViewer).setAODepth('own-pass');
    expect(dispose).toHaveBeenCalled();
    expect(viewer.main?.composer).not.toBe(before);
    expect(viewer.main?.composer.renderTarget2.depthTexture).toBeNull();
    expect(viewer.main?.gtao._renderGBuffer).toBe(true);
    (viewer as unknown as SceneViewer).setAODepth('main-pass');
    expect(viewer.main?.gtao.depthTexture).toBe(viewer.main?.composer.renderTarget2.depthTexture);
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

  it("counts a zoom made in OrbitControls' own wheel handler as movement, and a view set in code as still", () => {
    const host = document.body.appendChild(document.createElement('div'));
    const heard: boolean[] = [];
    class Content extends SceneViewer {
      protected override beforeDraw(moving: boolean): void {
        heard.push(moving);
      }
    }
    const viewer = new Content(host, BARE);
    viewers.push(viewer);
    const { renderer } = viewer as unknown as Internals;
    const settle = () => {
      for (let i = 0; i < 5 && renderer.loop; i++) renderer.loop();
    };
    settle();
    const camera = (viewer as unknown as { controls: OrbitControls }).controls
      .object as THREE.OrthographicCamera;
    const zoom = camera.zoom;
    // A trackpad pinch: OrbitControls zooms at once, in its handler.
    renderer.domElement.dispatchEvent(
      new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true })
    );
    expect(camera.zoom).toBeGreaterThan(zoom);
    renderer.loop?.();
    expect(heard.at(-1)).toBe(true);

    const fresh = new Content(host, BARE);
    viewers.push(fresh);
    heard.length = 0;
    fresh.resetView();
    for (let i = 0; i < 5 && (fresh as unknown as Internals).renderer.loop; i++) {
      (fresh as unknown as Internals).renderer.loop?.();
    }
    expect(heard).not.toContain(true);
  });

  /**
   * A glide let go of, at `fps`: when it ended, how far short of it the view stopped, in CSS px at the cell's far side
   * as the viewer reckons them, and what each frame after it drew, at ms after it.
   */
  function glide({
    fps,
    kind = 'theta',
    perspectiveAt,
  }: {
    fps: number;
    kind?: 'theta' | 'phi' | 'pan';
    perspectiveAt?: number;
  }) {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const drawn: { at: number; moving: boolean }[] = [];
    class Content extends SceneViewer {
      protected override beforeDraw(moving: boolean): void {
        drawn.push({ at: now, moving });
      }
    }
    const host = document.body.appendChild(document.createElement('div'));
    Object.defineProperties(host, { clientWidth: { value: 400 }, clientHeight: { value: 300 } });
    const viewer = new Content(host, BARE) as Content & {
      invalidate(): void;
      cssPixelNear(box: THREE.Box3, nearest?: number): number;
      bounds: THREE.Box3;
    };
    viewers.push(viewer);
    const { renderer } = viewer as unknown as Internals;
    const { controls } = viewer as unknown as { controls: OrbitControls };
    const left = controls as unknown as {
      _sphericalDelta: THREE.Spherical;
      _panOffset: THREE.Vector3;
    };
    viewer.resetView();
    if (perspectiveAt !== undefined) {
      viewer.setProjection('perspective');
      controls.object.position.set(0, 0, perspectiveAt);
      controls.update();
    }
    for (let i = 0; i < 20 && renderer.loop; i++, now += 1000 / fps) renderer.loop();
    const d = controls.getDistance();
    const reach = Math.min(50 * Math.sqrt(3), perspectiveAt === undefined ? Infinity : 1.25 * d);
    const pixel =
      perspectiveAt === undefined
        ? viewer.cssPixelNear(viewer.bounds)
        : viewer.cssPixelNear(viewer.bounds, 0.25 * d);
    const offset = () => controls.object.position.clone().sub(controls.target);
    const fromOffset = offset();
    const fromTarget = controls.target.clone();
    // A drag let go of with 0.3 rad, or 30 µm of pan, still to go.
    if (kind === 'pan') left._panOffset.set(30, 0, 0);
    else left._sphericalDelta[kind] = 0.3;
    viewer.invalidate();
    const t0 = now;
    let ended = Number.NaN;
    for (let i = 0; i < 1000 && renderer.loop; i++) {
      now += 1000 / fps;
      renderer.loop();
      const rest = Math.abs(left._sphericalDelta.theta) + Math.abs(left._sphericalDelta.phi);
      if (Number.isNaN(ended) && rest + left._panOffset.length() === 0) ended = now - t0;
    }
    const shortPx =
      kind === 'pan'
        ? (30 - controls.target.distanceTo(fromTarget)) / pixel
        : ((0.3 - fromOffset.angleTo(offset())) * reach) / pixel;
    return {
      ended,
      shortPx,
      stopped: renderer.loop === null,
      drawn: drawn.filter((f) => f.at > t0).map((f) => ({ ...f, at: f.at - t0 })),
    };
  }

  it('eases a glide let go of by time, not by frame, and ends it once what is left would move under 2 px', () => {
    const slow = glide({ fps: 15 });
    const fast = glide({ fps: 120 });
    for (const [g, fps] of [
      [slow, 15],
      [fast, 120],
    ] as const) {
      expect(g.ended).toBeLessThan(1000);
      expect(g.shortPx).toBeGreaterThanOrEqual(0);
      expect(g.shortPx).toBeLessThan(2);
      // No wait for another wheel notch: the still frame is the next one.
      const still = g.drawn.find((f) => !f.moving);
      expect((still?.at ?? Number.NaN) - g.ended).toBeLessThanOrEqual(1000 / fps + 1e-6);
    }
    expect(Math.abs(slow.ended - fast.ended)).toBeLessThan(100);
  });

  it('ends a glide up and down, a pan, and one inside the cell in perspective, under 2 px short', () => {
    for (const g of [
      glide({ fps: 60, kind: 'phi' }),
      glide({ fps: 60, kind: 'pan' }),
      glide({ fps: 15, perspectiveAt: 10 }),
    ]) {
      expect(g.ended).toBeLessThan(1000);
      expect(g.shortPx).toBeGreaterThanOrEqual(0);
      expect(g.shortPx).toBeLessThan(2);
    }
  });

  it('draws a glide zoomed in close as moving to its end, though three reports its last frames only now and then', () => {
    const g = glide({ fps: 120, perspectiveAt: 5 });
    expect(Number.isFinite(g.ended)).toBe(true);
    expect(g.drawn.filter((f) => f.at < g.ended && !f.moving)).toEqual([]);
    expect(g.stopped).toBe(true);
  });

  it('draws the still frame on the frame after a turn to an axis, or a spin, ends', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const drawn: { at: number; moving: boolean }[] = [];
    class Content extends SceneViewer {
      protected override beforeDraw(moving: boolean): void {
        drawn.push({ at: now, moving });
      }
    }
    const host = document.body.appendChild(document.createElement('div'));
    Object.defineProperties(host, { clientWidth: { value: 400 }, clientHeight: { value: 300 } });
    const viewer = new Content(host, BARE);
    viewers.push(viewer);
    const { renderer } = viewer as unknown as Internals;
    const frames = () => {
      for (let i = 0; i < 100 && renderer.loop; i++) {
        now += 16;
        renderer.loop();
      }
    };
    viewer.resetView();
    frames();
    const turnAt = now;
    viewer.viewAlong(0, 1);
    frames();
    const turned = drawn.filter((f) => f.at > turnAt);
    const lastMoving = turned.filter((f) => f.moving).at(-1)?.at ?? Number.NaN;
    expect(turned.find((f) => !f.moving)?.at).toBe(lastMoving + 16);
    expect(lastMoving - turnAt).toBeLessThanOrEqual(300 + 16);

    viewer.setSpin(true);
    for (let i = 0; i < 10; i++) {
      now += 16;
      renderer.loop?.();
    }
    viewer.setSpin(false);
    const offAt = now;
    frames();
    const still = drawn.find((f) => f.at > offAt && !f.moving);
    expect((still?.at ?? Number.NaN) - offAt).toBeLessThan(150);
  });

  it('keeps what is left to glide while a gesture is under way, and while the view spins', () => {
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
    try {
      const v = make(BARE);
      const viewer = v as unknown as SceneViewer & { invalidate(): void };
      const { controls } = v as unknown as { controls: OrbitControls };
      const delta = (controls as unknown as { _sphericalDelta: THREE.Spherical })._sphericalDelta;
      viewer.resetView();
      const frame = () => {
        now += 16;
        v.renderer.loop?.();
      };
      // A slow drag adds a fraction of a pixel a move, which is all turned at once.
      controls.dispatchEvent({ type: 'start' });
      let start = controls.getAzimuthalAngle();
      delta.theta = 0.001;
      viewer.invalidate();
      frame();
      expect(controls.getAzimuthalAngle() - start).toBeCloseTo(0.001, 6);
      expect(delta.theta).toBe(0);
      // Only that update; the pointer's own, between frames, ease, here by the loop's first frame.
      expect(controls.dampingFactor).toBeCloseTo(1 - Math.exp(-1000 / 120 / 160), 9);
      // Let go of, so little is left where it is.
      controls.dispatchEvent({ type: 'end' });
      start = controls.getAzimuthalAngle();
      delta.theta = 0.001;
      viewer.invalidate();
      frame();
      expect(controls.getAzimuthalAngle()).toBe(start);
      expect(delta.theta).toBe(0);

      // Zoomed out, the spin's own easing is under 2 px.
      const camera = controls.object as THREE.OrthographicCamera;
      camera.zoom = 0.1;
      camera.updateProjectionMatrix();
      viewer.setSpin(true);
      start = controls.getAzimuthalAngle();
      for (let i = 0; i < 30; i++) frame();
      expect(delta.theta).not.toBe(0);
      expect(Math.abs(controls.getAzimuthalAngle() - start)).toBeGreaterThan(0.02);
    } finally {
      clock.mockRestore();
    }
  });

  it('draws moving frames as the content cuts them down: without the occlusion, fewer pixels, no antialiasing', () => {
    class Content extends SceneViewer {
      cut: MovingFrame | null = null;
      moved: (MovingFrame | null)[] = [];
      protected override beforeDraw(): void {
        this.motionFrame = this.cut;
      }
      protected override afterDraw(moved: MovingFrame | null): void {
        this.moved.push(moved);
      }
      drop(): void {
        this.dropMovingPipeline();
      }
    }
    const host = document.body.appendChild(document.createElement('div'));
    Object.defineProperties(host, { clientWidth: { value: 400 }, clientHeight: { value: 300 } });
    // A morphology's surface, which has a look that blooms.
    const viewer = new Content(host, { ...BARE, surface: MORPHOLOGY_SURFACE });
    viewers.push(viewer);
    viewer.setAO(true);
    const v = viewer as unknown as Internals;
    const main = v.main as Pipeline;
    const drawn: { composer: EffectComposer; ao: boolean }[] = [];
    composerRender.mockImplementation(function (this: EffectComposer) {
      const p = [v.main, v.movingPipeline].find((x) => x?.composer === this);
      drawn.push({ composer: this, ao: p?.gtao.enabled === true });
    });
    const radius = (p: Pipeline) => p.gtao.gtaoMaterial.uniforms.radius.value as number;
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
    const frame = () => {
      now += 16;
      v.renderer.loop?.();
    };

    // Still, a cut changes nothing.
    viewer.cut = { ao: false, scale: 0.5, antialias: false };
    frame();
    expect(drawn.at(-1)).toEqual({ composer: main.composer, ao: true });
    expect(viewer.moved.at(-1)).toBeNull();

    viewer.setSpin(true);
    viewer.cut = null;
    frame();
    expect(drawn.at(-1)).toEqual({ composer: main.composer, ao: true });
    expect(viewer.moved.at(-1)).toEqual({ ao: true, scale: 1, antialias: true });
    viewer.cut = { ao: false, scale: 1, antialias: true };
    frame();
    expect(drawn.at(-1)).toEqual({ composer: main.composer, ao: false });
    expect(viewer.moved.at(-1)).toEqual(viewer.cut);
    expect(main.gtao.enabled).toBe(true);
    expect(main.output.uniforms.aoIntensity.value).toBe(1);

    // Fewer pixels, with the occlusion: a pipeline of its own, whose occlusion reaches as far on screen.
    viewer.cut = { ao: true, scale: 0.5, antialias: true };
    frame();
    const moving = v.movingPipeline as Pipeline;
    expect(drawn.at(-1)).toEqual({ composer: moving.composer, ao: true });
    expect(moving.composer.renderTarget2.width).toBe(200);
    expect(moving.composer.renderTarget2.samples).toBe(4);
    expect(moving.composer.passes.map((p) => p.constructor.name)).toEqual([
      'RenderPass',
      'DepthNormalsPass',
      'GTAOPass',
      'OutputPass',
    ]);
    expect(radius(moving)).toBeCloseTo(radius(main) / 2, 9);
    viewer.cut = { ao: false, scale: 0.5, antialias: true };
    frame();
    expect(drawn.at(-1)).toEqual({ composer: moving.composer, ao: false });

    // Not antialiased: made again without samples, here at full resolution.
    viewer.cut = { ao: false, scale: 1, antialias: false };
    frame();
    expect(v.movingPipeline).not.toBe(moving);
    expect(drawn.at(-1)?.composer).toBe(v.movingPipeline?.composer);
    expect(v.movingPipeline?.composer.renderTarget2.samples).toBe(0);
    expect(v.movingPipeline?.composer.renderTarget2.width).toBe(400);
    expect(viewer.moved.at(-1)).toEqual(viewer.cut);

    // Where the look blooms, only the occlusion is left out.
    viewer.setLook('fluorescence');
    viewer.cut = { ao: false, scale: 0.5, antialias: false };
    frame();
    clock.mockRestore();
    expect(drawn.at(-1)).toEqual({ composer: main.composer, ao: false });
    expect(viewer.moved.at(-1)).toEqual({ ao: false, scale: 1, antialias: true });

    viewer.setProjection('perspective');
    expect(v.movingPipeline?.render.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    viewer.drop();
    expect(v.movingPipeline).toBeNull();
  });

  it('stops drawing off screen, and holds what waits to be seen until it is on screen in a page on show', async () => {
    const observers: ((entries: { isIntersecting: boolean }[]) => void)[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      }
    );
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    try {
      const viewer = make(BARE);
      const sceneViewer = viewer as unknown as SceneViewer;
      const seen = vi.fn();
      sceneViewer.seen().then(seen);
      const show = (on: boolean) => observers.at(-1)?.([{ isIntersecting: on }]);

      show(false);
      expect(viewer.renderer.loop).toBeNull();
      sceneViewer.setSpin(true);
      expect(viewer.renderer.loop).toBeNull();
      show(true);
      expect(viewer.renderer.loop).not.toBeNull();
      // On screen, but in a tab not on show.
      await Promise.resolve();
      expect(seen).not.toHaveBeenCalled();

      hidden.mockReturnValue(false);
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
      expect(seen).toHaveBeenCalledTimes(1);
      // Seen once is seen: off screen again, it holds nothing.
      show(false);
      await expect(sceneViewer.seen()).resolves.toBeUndefined();
    } finally {
      hidden.mockRestore();
      vi.stubGlobal('IntersectionObserver', undefined);
    }
  });
});
