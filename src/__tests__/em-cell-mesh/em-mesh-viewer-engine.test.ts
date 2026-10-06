// @vitest-environment jsdom
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { packMesh } from '@/features/entities/em-cell-mesh/viewer/engine/chunks';
import {
  EmMeshViewer,
  type ViewStatus,
} from '@/features/entities/em-cell-mesh/viewer/engine/em-mesh-viewer';
import { SKIP_FRAMES } from '@/features/entities/em-cell-mesh/viewer/engine/mesh-choice';
import { DEFAULT_MOTION } from '@/features/entities/em-cell-mesh/viewer/engine/motion-quality';

import { torus } from './mesh-fixtures';

import type { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import type { PackedMesh, StandIn } from '@/features/entities/em-cell-mesh/viewer/engine/types';

const { FakeRenderer } = vi.hoisted(() => {
  /** What a draw outside the frames wrote with, and what it drew. */
  interface Unseen {
    meshes: THREE.Mesh[];
    writes: { color: boolean; depth: boolean; locked: boolean };
    autoClear: boolean;
    target: unknown;
    layers: number;
  }
  const uploaded = new WeakSet<object>();

  /** Draws nothing. A draw uploads what it draws, as three does, calling each attribute's `onUpload`. */
  class FakeRenderer {
    domElement = document.createElement('canvas');
    autoClear = true;
    loop: (() => void) | null = null;
    target: THREE.WebGLRenderTarget | null = null;
    unseen: Unseen[] = [];
    context: unknown = {
      RENDERBUFFER: 1,
      SAMPLES: 2,
      RGBA16F: 3,
      RGBA8: 4,
      getInternalformatParameter: () => Int32Array.from([8, 4, 2]),
    };
    color = { mask: true, locked: false };
    depth = { mask: true, locked: false };
    state = {
      buffers: {
        color: this.mask(this.color),
        depth: this.mask(this.depth),
      },
    };

    constructor() {
      this.domElement.width = 400;
      this.domElement.height = 300;
    }

    private mask(m: { mask: boolean; locked: boolean }) {
      return {
        setMask: (v: boolean) => {
          if (!m.locked) m.mask = v;
        },
        setLocked: (v: boolean) => {
          m.locked = v;
        },
      };
    }

    render = (scene: THREE.Scene, camera: THREE.Camera) => {
      const meshes = FakeRenderer.drawn(scene, camera);
      this.unseen.push({
        meshes,
        writes: {
          color: this.color.mask,
          depth: this.depth.mask,
          locked: this.color.locked && this.depth.locked,
        },
        autoClear: this.autoClear,
        target: this.target,
        layers: camera.layers.mask,
      });
    };

    /** The meshes a camera sees in a scene, uploaded. */
    static drawn(scene: THREE.Object3D, camera: THREE.Camera): THREE.Mesh[] {
      const meshes: THREE.Mesh[] = [];
      scene.traverseVisible((o) => {
        if (o instanceof THREE.Mesh && o.layers.test(camera.layers)) meshes.push(o);
      });
      for (const m of meshes) {
        const geo = m.geometry as THREE.BufferGeometry;
        for (const a of [...Object.values(geo.attributes), geo.index]) {
          if (!a || uploaded.has(a)) continue;
          uploaded.add(a);
          (a as THREE.BufferAttribute).onUploadCallback();
        }
      }
      return meshes;
    }

    setAnimationLoop(loop: (() => void) | null): void {
      this.loop = loop;
    }

    getContext(): unknown {
      return this.context;
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

    setRenderTarget(target: typeof this.target): void {
      this.target = target;
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

vi.mock('@/features/viewer-3d/engine/looks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/viewer-3d/engine/looks')>()),
  // A room drawn on the GPU: a texture of nothing, here.
  makeEnvironment: () => new THREE.Texture(),
}));

interface Internals {
  renderer: InstanceType<typeof FakeRenderer>;
  main: { composer: EffectComposer };
  scene: THREE.Scene;
  controls: { object: THREE.OrthographicCamera | THREE.PerspectiveCamera };
  cost: { add(ms: number, cold?: boolean): void; measure(): boolean };
  motion: { add(ms: number): void };
  timer: unknown;
  measured(ms: number): void;
  movingPipeline: { composer: EffectComposer; gtao: { enabled: boolean } } | null;
  invalidate(): void;
}

/** A torus about the origin in µm, packed into chunks of about `triangles`. */
function packed(rings: number, sides: number, triangles: number): PackedMesh {
  const { positions, indices } = torus(rings, sides, { centre: [0, 0, 0] });
  for (let i = 0; i < positions.length; i++) positions[i] /= 1000;
  return packMesh(positions, null, indices, { triangles, vertices: 65535 }).mesh;
}

const STAND_IN: StandIn = { ...packed(12, 6, 50), errorUm: 0.2 };
const FULL = packed(48, 16, 100);

let viewers: EmMeshViewer[] = [];
/** The meshes each frame drew, through the composer. */
let frames: THREE.Mesh[][] = [];
/** The composer each frame was drawn with. */
let composers: EffectComposer[] = [];

function make(): { viewer: EmMeshViewer; v: Internals } {
  const host = document.body.appendChild(document.createElement('div'));
  Object.defineProperties(host, { clientWidth: { value: 400 }, clientHeight: { value: 300 } });
  const viewer = new EmMeshViewer(host);
  viewers.push(viewer);
  return { viewer, v: viewer as unknown as Internals };
}

/** Run the animation loop for up to `n` frames, while it runs. */
function frame(v: Internals, n = 1): void {
  for (let i = 0; i < n && v.renderer.loop; i++) v.renderer.loop();
}

const drawn = () => frames.at(-1) ?? [];
const same = (a: THREE.Mesh[], b: THREE.Mesh[]) =>
  a.length === b.length && a.every((m, i) => m === b[i]);
const meshesOf = (mesh: PackedMesh) => mesh.chunks.length;

function zoom(v: Internals, factor: number): void {
  const camera = v.controls.object as THREE.OrthographicCamera;
  camera.zoom = factor;
  camera.updateProjectionMatrix();
  v.invalidate();
}

/** The full mesh, all of it uploaded. */
function loaded(): { viewer: EmMeshViewer; v: Internals } {
  const made = make();
  made.viewer.setStandIn(STAND_IN);
  made.viewer.setFull(FULL);
  frame(made.v, 100);
  return made;
}

function frameCost(v: Internals, ms: number): void {
  for (let i = 0; i < 3; i++) v.cost.add(ms);
}

/** A timer answered by hand: the frame after `tick`, and whether it was timed, which then came back at `ms`. */
function timedFrames(v: Internals, tick: () => void): (ms: number) => boolean {
  const timer = {
    kind: 'fence',
    busy: false,
    begin() {
      this.busy = true;
    },
    end() {},
    dispose() {},
  };
  v.timer = timer;
  return (ms) => {
    tick();
    frame(v);
    if (!timer.busy) return false;
    timer.busy = false;
    v.measured(ms);
    return true;
  };
}

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createRadialGradient: () => ({ addColorStop() {} }),
    fillRect() {},
  } as unknown as CanvasRenderingContext2D);
});

beforeEach(() => {
  frames = [];
  composers = [];
  vi.spyOn(EffectComposer.prototype, 'render').mockImplementation(function (this: EffectComposer) {
    const pass = this.passes[0] as RenderPass;
    frames.push(FakeRenderer.drawn(pass.scene, pass.camera));
    composers.push(this);
  });
});

afterEach(() => {
  // A test that failed before putting the clock back leaves it to the next.
  if (vi.isMockFunction(performance.now)) vi.mocked(performance.now).mockRestore();
  for (const v of viewers) v.dispose();
  viewers = [];
  vi.mocked(EffectComposer.prototype.render).mockRestore();
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('EmMeshViewer', () => {
  it('uploads the full mesh a few chunks a frame, drawn once unseen, and draws it once all are up', () => {
    const { viewer, v } = make();
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => (now += 1.5));
    const ready = vi.fn();
    viewer.setStandIn(STAND_IN);
    zoom(v, 8);
    frame(v);
    const standIn = new Set(drawn());
    expect(standIn.size).toBe(meshesOf(STAND_IN));
    viewer.setFull(FULL, { ready });

    const perFrame: number[] = [];
    let drawnFrames = 0;
    while (v.renderer.unseen.length < meshesOf(FULL)) {
      const before = v.renderer.unseen.length;
      const framesBefore = frames.length;
      frame(v);
      perFrame.push(v.renderer.unseen.length - before);
      drawnFrames += frames.length - framesBefore;
      if (v.renderer.unseen.length < meshesOf(FULL)) {
        // Not one full chunk in the frame until all are up.
        expect(drawn().every((m) => standIn.has(m))).toBe(true);
        expect(ready).not.toHaveBeenCalled();
      }
    }
    clock.mockRestore();
    expect(perFrame.length).toBeGreaterThan(1);
    expect(Math.max(...perFrame)).toBeLessThan(meshesOf(FULL));
    // While the view is still, the picture is not drawn again while the chunks go up: only the frame setFull asked
    // for, and the one in which the last chunk goes up and the full mesh comes in.
    expect(drawnFrames).toBe(2);
    expect(ready).toHaveBeenCalledTimes(1);
    expect(drawn()).toHaveLength(meshesOf(FULL));
    // Each chunk once, alone, writing nothing, into a target of a pixel of the scene's formats.
    const scene = v.main.composer.renderTarget2;
    const chunks = v.renderer.unseen.flatMap((u) => u.meshes);
    expect(new Set(chunks.map((m) => m.geometry)).size).toBe(meshesOf(FULL));
    for (const u of v.renderer.unseen) {
      expect(u.meshes).toHaveLength(1);
      expect(u.writes).toEqual({ color: false, depth: false, locked: true });
      expect(u.autoClear).toBe(false);
      const target = u.target as THREE.WebGLRenderTarget;
      expect([target.width, target.height]).toEqual([1, 1]);
      expect(target.samples).toBe(scene.samples);
      expect(target.texture.type).toBe(scene.texture.type);
      expect(target.depthTexture).toBeInstanceOf(THREE.DepthTexture);
      // A layer of their own, which nothing else is on.
      expect(u.layers).toBe(2 ** 31);
    }
    // And put back as it was.
    expect(v.renderer.autoClear).toBe(true);
    expect(v.renderer.color).toEqual({ mask: true, locked: false });
    expect(drawn().some((m) => standIn.has(m))).toBe(false);
  });

  it('uploads fewer chunks a frame while the view moves, drawing each frame', () => {
    const { viewer, v } = make();
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => (now += 1.5));
    viewer.setStandIn(STAND_IN);
    zoom(v, 8);
    frame(v);
    viewer.setFull(FULL);
    viewer.setSpin(true);
    const before = frames.length;
    frame(v);
    const moving = v.renderer.unseen.length;
    viewer.setSpin(false);
    clock.mockRestore();
    expect(frames.length).toBe(before + 1);
    expect(moving).toBeGreaterThan(0);
    expect(moving).toBeLessThan(5);
  });

  it('hands each chunk of the full mesh, once it is up, to what keeps it, in order', () => {
    const { viewer, v } = make();
    viewer.setStandIn(STAND_IN);
    const kept: [number, number][] = [];
    viewer.setFull(FULL, {
      keep: (_, index) => {
        kept.push([index, v.renderer.unseen.length]);
      },
    });
    frame(v, 100);
    expect(kept.map(([i]) => i)).toEqual(FULL.chunks.map((_, i) => i));
    // Each after its own unseen draw, which uploaded it.
    for (const [i, drawn] of kept) expect(drawn).toBe(i + 1);
  });

  it("lets go of the full mesh's arrays once they are up, and keeps the stand-in's", () => {
    const { v } = loaded();
    const full = v.renderer.unseen.flatMap((u) => u.meshes);
    expect(full.every((m) => m.geometry.index?.array === null)).toBe(true);
    expect(full.every((m) => m.geometry.attributes.position.array === null)).toBe(true);
    zoom(v, 0.1);
    frame(v);
    const standIn = drawn();
    expect(standIn).toHaveLength(meshesOf(STAND_IN));
    expect(standIn.every((m) => m.geometry.index?.array instanceof Uint16Array)).toBe(true);
  });

  it('places each chunk on the grid in µm, and culls by its bounds', () => {
    const { v } = loaded();
    zoom(v, 8);
    frame(v);
    const box = new THREE.Box3();
    for (const m of drawn()) {
      expect(m.frustumCulled).toBe(true);
      box.union((m.geometry.boundingBox as THREE.Box3).clone().applyMatrix4(m.matrix));
    }
    // The torus: 49 µm out from its axis, 9 µm either side of its plane.
    expect(box.max.x).toBeCloseTo(49, 0);
    expect(box.min.y).toBeCloseTo(-49, 0);
    expect(box.max.z).toBeCloseTo(9, 0);
  });

  it('chooses by the error in device pixels: the stand-in from afar, the full mesh close up', () => {
    const { viewer, v } = loaded();
    vi.spyOn(v.renderer, 'getPixelRatio').mockReturnValue(2);
    const status: ViewStatus[] = [];
    viewer.onStatus((s) => status.push(s));
    viewer.resetView();
    zoom(v, 0.05);
    frame(v);
    expect(status.at(-1)).toMatchObject({ shown: 'stand-in', reason: 'error' });
    const camera = v.controls.object as THREE.OrthographicCamera;
    const pixelUm = (camera.top - camera.bottom) / camera.zoom / 300;
    expect(status.at(-1)?.errorPx).toBeCloseTo((2 * STAND_IN.errorUm) / pixelUm, 2);
    zoom(v, 8);
    frame(v);
    expect(status.at(-1)).toMatchObject({ shown: 'full', reason: 'error' });
  });

  it('measures the error in perspective at the point of the bounds nearest the camera', () => {
    const { viewer, v } = loaded();
    viewer.setProjection('perspective');
    const camera = v.controls.object as THREE.PerspectiveCamera;
    // 20 µm from the torus's top face, 29 µm from its centre.
    camera.position.set(0, 0, 29);
    v.invalidate();
    let shown: ViewStatus | null = null;
    viewer.onStatus((s) => {
      shown = s;
    });
    frame(v);
    const atFace = (2 * 20 * Math.tan(Math.PI / 8)) / 300;
    expect((shown as ViewStatus | null)?.errorPx).toBeCloseTo(STAND_IN.errorUm / atFace, 1);
  });

  it('tells only the last full mesh given that it is up: one replaced on its way up is dropped with what it was to tell', () => {
    const { viewer, v } = make();
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => (now += 1.5));
    viewer.setStandIn(STAND_IN);
    const first = { ready: vi.fn(), keep: vi.fn() };
    viewer.setFull(FULL, first);
    frame(v);
    const keptBefore = first.keep.mock.calls.length;
    expect(keptBefore).toBeGreaterThan(0);
    expect(keptBefore).toBeLessThan(FULL.chunks.length);
    const second = { ready: vi.fn() };
    viewer.setFull(FULL, second);
    frame(v, 100);
    clock.mockRestore();
    expect(first.ready).not.toHaveBeenCalled();
    expect(first.keep).toHaveBeenCalledTimes(keptBefore);
    expect(second.ready).toHaveBeenCalledTimes(1);
  });

  it('takes a stand-in given as the full mesh for the whole mesh: nothing to upload', () => {
    const { viewer, v } = make();
    const ready = vi.fn();
    const status: ViewStatus[] = [];
    viewer.onStatus((s) => status.push(s));
    viewer.setStandIn(STAND_IN);
    viewer.setFull(STAND_IN, { ready });
    expect(ready).toHaveBeenCalledTimes(1);
    zoom(v, 8);
    frame(v, 5);
    expect(v.renderer.unseen).toHaveLength(0);
    expect(status.at(-1)).toMatchObject({ shown: 'stand-in', reason: 'whole' });
  });

  it('draws the stand-in while the view moves on a slow GPU, then a frame of the full mesh once it stops', () => {
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { viewer, v } = loaded();
    zoom(v, 8);
    frame(v);
    const full = drawn();
    frameCost(v, 50);
    viewer.setSpin(true);
    for (let i = 0; i < 3; i++, now += 16) frame(v);
    expect(drawn()).toHaveLength(meshesOf(STAND_IN));
    viewer.setSpin(false);
    // The damping runs out, and the loop draws once more before it stops.
    for (let i = 0; i < 500 && v.renderer.loop; i++, now += 16) frame(v);
    clock.mockRestore();
    expect(v.renderer.loop).toBeNull();
    expect(same(drawn(), full)).toBe(true);
  });

  it('draws a wheel notch as a move, which OrbitControls zooms in its own handler, and waits a moment before it draws in full on a slow GPU', () => {
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { v } = loaded();
    zoom(v, 8);
    frame(v);
    frameCost(v, 50);
    v.renderer.domElement.dispatchEvent(
      new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true })
    );
    frame(v);
    expect(drawn()).toHaveLength(meshesOf(STAND_IN));
    const drawnBefore = frames.length;
    // Nothing drawn for a while, in case another notch comes, then the full mesh.
    for (let i = 0; i < 10; i++, now += 16) frame(v);
    expect(frames.length).toBe(drawnBefore);
    now += 200;
    frame(v);
    clock.mockRestore();
    expect(drawn()).toHaveLength(meshesOf(FULL));
  });

  it('drops the full mesh with a lost context, and asks for it again once restored, keeping the stand-in', () => {
    const { viewer, v } = loaded();
    const rebuild = vi.fn();
    viewer.onRebuildNeeded(rebuild);
    zoom(v, 8);
    const canvas = v.renderer.domElement;
    canvas.dispatchEvent(new Event('webglcontextlost'));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(rebuild).toHaveBeenCalledTimes(1);
    frame(v);
    expect(drawn()).toHaveLength(meshesOf(STAND_IN));

    // Nothing to ask for when only the stand-in was there.
    canvas.dispatchEvent(new Event('webglcontextlost'));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(rebuild).toHaveBeenCalledTimes(1);
  });

  it('makes the environment again on a restored context, as it was drawn on the GPU', () => {
    const { viewer, v } = loaded();
    viewer.setLook('glossy');
    const before = v.scene.environment as THREE.Texture;
    const dispose = vi.spyOn(before, 'dispose');
    v.renderer.domElement.dispatchEvent(new Event('webglcontextrestored'));
    expect(dispose).toHaveBeenCalled();
    expect(v.scene.environment).toBeInstanceOf(THREE.Texture);
    expect(v.scene.environment).not.toBe(before);
  });

  it('measures a full frame once the mesh is up, without waiting for the view to move', async () => {
    await withFence(async () => {
      const { viewer, v } = make();
      viewer.setStandIn(STAND_IN);
      zoom(v, 8);
      viewer.setFull(FULL);
      let status: ViewStatus | null = null;
      viewer.onStatus((s) => {
        status = s;
      });
      let fullFrames = 0;
      for (let i = 0; i < 200 && v.renderer.loop; i++) {
        const before = frames.length;
        v.renderer.loop();
        if (frames.length > before && drawn().length === meshesOf(FULL)) fullFrames++;
      }
      // The frames skipped after the upload, and the one measured.
      expect(fullFrames).toBe(SKIP_FRAMES + 1);
      await new Promise((r) => setTimeout(r, 20));
      expect((status as ViewStatus | null)?.frameMs).toEqual(expect.any(Number));
      expect((status as ViewStatus | null)?.timer).toBe('fence');
    });
  });

  it('cuts frames down while the view moves and they are slow, and draws the still frame in full', () => {
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { viewer, v } = loaded();
    const status: ViewStatus[] = [];
    viewer.onStatus((s) => status.push(s));
    zoom(v, 8);
    frame(v);
    const main = composers.at(-1);
    frameCost(v, 50);
    // Three steps: the occlusion, then two halvings of the pixels.
    for (let i = 0; i < 9; i++) v.motion.add(40);
    viewer.setSpin(true);
    for (let i = 0; i < 3; i++, now += 16) frame(v);
    expect(composers.at(-1)).toBe(v.movingPipeline?.composer);
    expect(v.movingPipeline?.composer.renderTarget2.width).toBe(200);
    expect(drawn()).toHaveLength(meshesOf(STAND_IN));
    expect(status.at(-1)).toMatchObject({
      moving: { mesh: 'stand-in', ao: false, scale: 0.5, antialias: true },
      slow: true,
    });

    viewer.setSpin(false);
    for (let i = 0; i < 500 && v.renderer.loop; i++, now += 16) frame(v);
    clock.mockRestore();
    expect(composers.at(-1)).toBe(main);
    expect(drawn()).toHaveLength(meshesOf(FULL));
  });

  it('draws the stand-in once two moving frames of the full mesh in a row are dear, as zooming out does, until the view stops', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { viewer, v } = loaded();
    const status: ViewStatus[] = [];
    viewer.onStatus((s) => status.push(s));
    zoom(v, 8);
    frame(v);
    // No timer measured the frames after the upload, which pay for it.
    while (!v.cost.measure());
    // Zoomed in, full frames are cheap, and moving frames are cut down.
    frameCost(v, 5);
    for (let i = 0; i < 6; i++) v.motion.add(40);
    const moving = timedFrames(v, () => {
      now += 16;
    });
    viewer.setSpin(true);
    while (!moving(40));
    expect(drawn()).toHaveLength(meshesOf(FULL));
    expect(composers.at(-1)).toBe(v.movingPipeline?.composer);
    // The first dear frame may be the GPU waking up: the full mesh still.
    while (!moving(40));
    expect(drawn()).toHaveLength(meshesOf(FULL));
    now += 16;
    frame(v);
    expect(drawn()).toHaveLength(meshesOf(STAND_IN));
    // Measured while cut down, they leave the full frame's cost alone.
    expect(status.at(-1)).toMatchObject({ frameMs: 5, slow: false, slowMoving: true });

    viewer.setSpin(false);
    for (let i = 0; i < 100 && v.renderer.loop; i++) {
      now += 16;
      frame(v);
    }
    expect(drawn()).toHaveLength(meshesOf(FULL));
    viewer.setSpin(true);
    moving(5);
    expect(drawn()).toHaveLength(meshesOf(FULL));
  });

  it("measures moving frames of the stand-in for the moving frames' cost, not the full mesh's", async () => {
    await withFence(async () => {
      const { viewer, v } = loaded();
      zoom(v, 8);
      frame(v);
      frameCost(v, 50);
      let status: ViewStatus | null = null;
      viewer.onStatus((s) => {
        status = s;
      });
      viewer.setSpin(true);
      for (let i = 0; i < 12; i++) {
        frame(v);
        await new Promise((r) => setTimeout(r, 5));
      }
      expect(drawn()).toHaveLength(meshesOf(STAND_IN));
      expect((status as ViewStatus | null)?.movingMs).toEqual(expect.any(Number));
      expect((status as ViewStatus | null)?.frameMs).toBe(50);
    });
  });
  it('draws moving frames as set, whatever they cost: the mesh, the occlusion, the resolution, the antialiasing', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { viewer, v } = loaded();
    const status: ViewStatus[] = [];
    viewer.onStatus((s) => status.push(s));
    viewer.setAO(true);
    zoom(v, 8);
    frame(v);
    // Fast: by their cost, moving frames would be drawn as still ones.
    frameCost(v, 5);
    viewer.setMotion({
      ...DEFAULT_MOTION,
      mesh: 'stand-in',
      ao: 'on',
      scale: 0.5,
      antialias: false,
    });
    viewer.setSpin(true);
    for (let i = 0; i < 3; i++, now += 16) frame(v);
    expect(drawn()).toHaveLength(meshesOf(STAND_IN));
    expect(composers.at(-1)).toBe(v.movingPipeline?.composer);
    expect(v.movingPipeline?.composer.renderTarget2).toMatchObject({ width: 200, samples: 0 });
    expect(v.movingPipeline?.gtao.enabled).toBe(true);
    expect(status.at(-1)?.moving).toEqual({
      mesh: 'stand-in',
      ao: true,
      scale: 0.5,
      antialias: false,
    });

    // Slow: by their cost, they would draw the stand-in.
    frameCost(v, 50);
    viewer.setMotion({ ...DEFAULT_MOTION, mesh: 'full', ao: 'on', scale: 1 });
    // Nothing draws through the moving frames' own pipeline any more: it goes.
    expect(v.movingPipeline).toBeNull();
    for (let i = 0; i < 2; i++, now += 16) frame(v);
    expect(drawn()).toHaveLength(meshesOf(FULL));
    expect(composers.at(-1)).toBe(v.main.composer);
    expect(status.at(-1)?.moving).toEqual({ mesh: 'full', ao: true, scale: 1, antialias: true });
  });

  it('brings the occlusion back to moving frames once a still frame shows there is time for it', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { viewer, v } = loaded();
    const status: ViewStatus[] = [];
    viewer.onStatus((s) => status.push(s));
    viewer.setAO(true);
    zoom(v, 8);
    frame(v);
    // A slow median of moving frames, as a hitch makes.
    for (let i = 0; i < 3; i++) v.motion.add(2 * DEFAULT_MOTION.budgetMs);
    viewer.setSpin(true);
    for (let i = 0; i < 3; i++, now += 16) frame(v);
    expect(status.at(-1)?.moving).toMatchObject({ mesh: 'full', ao: false });

    frameCost(v, 8);
    viewer.setSpin(false);
    for (let i = 0; i < 500 && v.renderer.loop; i++, now += 16) frame(v);
    viewer.setSpin(true);
    for (let i = 0; i < 3; i++, now += 16) frame(v);
    expect(status.at(-1)?.moving).toMatchObject({ mesh: 'full', ao: true });
  });

  it('draws the stand-in while the view moves where full frames cost more than the time set for it', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { viewer, v } = loaded();
    zoom(v, 8);
    frame(v);
    frameCost(v, 20);
    viewer.setSpin(true);
    for (let i = 0; i < 2; i++, now += 16) frame(v);
    expect(drawn()).toHaveLength(meshesOf(FULL));
    viewer.setMotion({ ...DEFAULT_MOTION, standInMs: 15 });
    for (let i = 0; i < 2; i++, now += 16) frame(v);
    expect(drawn()).toHaveLength(meshesOf(STAND_IN));
  });

  it('times moving frames from the third after the loop starts, and a full frame after the stand-in as cold', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { viewer, v } = loaded();
    zoom(v, 8);
    frame(v, 10);
    expect(v.renderer.loop).toBeNull();
    // No timer measured the frames after the upload, which pay for it.
    while (!v.cost.measure());
    frameCost(v, 40);
    const added = vi.spyOn(v.cost, 'add');
    const next = timedFrames(v, () => {
      now += 16;
    });
    viewer.setSpin(true);
    expect([next(3), next(3), next(3), next(3)]).toEqual([false, false, true, true]);
    expect(drawn()).toHaveLength(meshesOf(STAND_IN));

    viewer.setSpin(false);
    for (let i = 0; i < 200 && drawn().length !== meshesOf(FULL); i++) next(30);
    expect(drawn()).toHaveLength(meshesOf(FULL));
    expect(added).toHaveBeenLastCalledWith(30, true);
    // Drawn again, it is warm.
    v.invalidate();
    next(9);
    expect(added).toHaveBeenLastCalledWith(9, false);
  });

  it('times moving frames again from the third after the page was hidden, and not the first cut down otherwise', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { viewer, v } = loaded();
    zoom(v, 8);
    frame(v, 10);
    const next = timedFrames(v, () => {
      now += 16;
    });
    viewer.setSpin(true);
    expect([next(3), next(3), next(3)]).toEqual([false, false, true]);

    // The loop stays on in a hidden page, which draws nothing meanwhile.
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    hidden.mockRestore();
    document.dispatchEvent(new Event('visibilitychange'));
    expect([next(3), next(3), next(3)]).toEqual([false, false, true]);

    viewer.setMotion({ ...DEFAULT_MOTION, ao: 'off' });
    expect([next(3), next(3)]).toEqual([false, true]);
  });

  it('tells the frames a second while the view moves, from the time between them, a few times a second', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { viewer, v } = loaded();
    const status: ViewStatus[] = [];
    viewer.onStatus((s) => status.push(s));
    zoom(v, 8);
    frame(v, 10);
    viewer.setSpin(true);
    for (let i = 0; i < 10; i++, now += 20) frame(v);
    expect(status.at(-1)?.movingFps).toBeNull();
    for (let i = 0; i < 10; i++, now += 20) frame(v);
    expect(status.at(-1)?.movingFps).toBe(50);
  });
});

/** Run `body` on a WebGL 2 context whose frames are timed with a fence, signalled at once. */
async function withFence(body: () => Promise<void>): Promise<void> {
  class WebGL2 {
    getInternalformatParameter = () => Int32Array.from([4]);
    SYNC_STATUS = 1;
    SIGNALED = 2;
    SYNC_GPU_COMMANDS_COMPLETE = 3;
    getExtension = () => null;
    fenceSync = () => ({});
    flush = () => {};
    getSyncParameter = () => 2;
    deleteSync = () => {};
  }
  vi.stubGlobal('WebGL2RenderingContext', WebGL2);
  FakeRenderer.prototype.getContext = () => new WebGL2();
  try {
    await body();
  } finally {
    FakeRenderer.prototype.getContext = function (this: { context: unknown }) {
      return this.context;
    };
    vi.unstubAllGlobals();
  }
}
