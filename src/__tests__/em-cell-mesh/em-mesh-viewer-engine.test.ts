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
    scissor: number[] | null;
    layers: number;
  }
  const uploaded = new WeakSet<object>();

  /** Draws nothing. A draw uploads what it draws, as three does, calling each attribute's `onUpload`. */
  class FakeRenderer {
    domElement = document.createElement('canvas');
    toneMapping = -1;
    toneMappingExposure = 1;
    autoClear = true;
    loop: (() => void) | null = null;
    target: (THREE.WebGLRenderTarget & { scissor: THREE.Vector4 }) | null = null;
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
      Object.defineProperties(this.domElement, {
        clientWidth: { value: 400 },
        clientHeight: { value: 300 },
      });
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
        scissor: this.target?.scissorTest ? this.target.scissor.toArray() : null,
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

    compileAsync(): Promise<void> {
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

vi.mock('@/features/viewer-3d/engine/looks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/viewer-3d/engine/looks')>()),
  // A room drawn on the GPU: a texture of nothing, here.
  makeEnvironment: () => new THREE.Texture(),
}));

interface Internals {
  renderer: InstanceType<typeof FakeRenderer>;
  composer: EffectComposer;
  scene: THREE.Scene;
  controls: { object: THREE.OrthographicCamera | THREE.PerspectiveCamera; update(): boolean };
  wire: THREE.Material;
  cost: { add(ms: number): void };
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

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createRadialGradient: () => ({ addColorStop() {} }),
    fillRect() {},
  } as unknown as CanvasRenderingContext2D);
});

beforeEach(() => {
  frames = [];
  vi.spyOn(EffectComposer.prototype, 'render').mockImplementation(function (this: EffectComposer) {
    const pass = this.passes[0] as RenderPass;
    frames.push(FakeRenderer.drawn(pass.scene, pass.camera));
  });
});

afterEach(() => {
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
    viewer.onFullReady(ready);
    viewer.setStandIn(STAND_IN);
    zoom(v, 8);
    frame(v);
    const standIn = new Set(drawn());
    expect(standIn.size).toBe(meshesOf(STAND_IN));
    viewer.setFull(FULL);

    const perFrame: number[] = [];
    while (v.renderer.unseen.length < meshesOf(FULL)) {
      const before = v.renderer.unseen.length;
      frame(v);
      perFrame.push(v.renderer.unseen.length - before);
      if (v.renderer.unseen.length < meshesOf(FULL)) {
        // Not one full chunk in the frame until all are up.
        expect(drawn().every((m) => standIn.has(m))).toBe(true);
        expect(ready).not.toHaveBeenCalled();
      }
    }
    clock.mockRestore();
    expect(perFrame.length).toBeGreaterThan(2);
    expect(Math.max(...perFrame)).toBeLessThan(meshesOf(FULL));
    // Each chunk once, alone, writing nothing, into the frame's own target, scissored to a pixel.
    const chunks = v.renderer.unseen.flatMap((u) => u.meshes);
    expect(new Set(chunks.map((m) => m.geometry)).size).toBe(meshesOf(FULL));
    for (const u of v.renderer.unseen) {
      expect(u.meshes).toHaveLength(1);
      expect(u.writes).toEqual({ color: false, depth: false, locked: true });
      expect(u.autoClear).toBe(false);
      expect(u.target).toBe(v.composer.renderTarget2);
      expect(u.scissor).toEqual([0, 0, 1, 1]);
      // A layer of their own, which nothing else is on.
      expect(u.layers).toBe(2 ** 31);
    }
    // And put back as it was.
    expect(v.renderer.autoClear).toBe(true);
    expect(v.renderer.color).toEqual({ mask: true, locked: false });
    expect(v.composer.renderTarget2.scissorTest).toBe(false);

    frame(v);
    expect(ready).toHaveBeenCalledTimes(1);
    expect(drawn()).toHaveLength(meshesOf(FULL));
    expect(drawn().some((m) => standIn.has(m))).toBe(false);
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

  it('places each chunk on the grid in µm, frames the view on the stand-in, and culls by its bounds', () => {
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
    const status: ViewStatus[] = [];
    viewer.onStatus((s) => status.push(s));
    viewer.resetView();
    frame(v);
    expect(status.at(-1)).toMatchObject({ shown: 'stand-in', reason: 'error' });
    const camera = v.controls.object as THREE.OrthographicCamera;
    const pixelUm = (camera.top - camera.bottom) / camera.zoom / 300;
    expect(status.at(-1)?.errorPx).toBeCloseTo(STAND_IN.errorUm / pixelUm, 2);
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

  it('draws only the stand-in in wireframe, in wires of its own, and the full mesh again after', () => {
    const { viewer, v } = loaded();
    zoom(v, 8);
    frame(v);
    const full = drawn();
    viewer.setWireframe(true);
    frame(v);
    expect(drawn()).toHaveLength(meshesOf(STAND_IN));
    expect(drawn().every((m) => m.material === v.wire)).toBe(true);
    expect(viewer.looks.some((l) => (l.material as { wireframe?: boolean }).wireframe)).toBe(false);

    viewer.setWireframe(false);
    frame(v);
    expect(same(drawn(), full)).toBe(true);
    expect(drawn().every((m) => m.material !== v.wire)).toBe(true);
  });

  it('takes a stand-in given as the full mesh for the whole mesh: nothing to upload', () => {
    const { viewer, v } = make();
    const ready = vi.fn();
    viewer.onFullReady(ready);
    const status: ViewStatus[] = [];
    viewer.onStatus((s) => status.push(s));
    viewer.setStandIn(STAND_IN);
    viewer.setFull(STAND_IN);
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
    for (let i = 0; i < 5; i++) v.cost.add(50);
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

  it('waits a moment after a move of one frame, as a wheel notch makes, before it draws in full on a slow GPU', () => {
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { v } = loaded();
    zoom(v, 8);
    frame(v);
    for (let i = 0; i < 5; i++) v.cost.add(50);
    const update = vi.spyOn(v.controls, 'update').mockReturnValueOnce(true);
    v.invalidate();
    frame(v);
    expect(drawn()).toHaveLength(meshesOf(STAND_IN));
    const drawnBefore = frames.length;
    // Nothing drawn for a while, in case another notch comes, then the full mesh.
    for (let i = 0; i < 10; i++, now += 16) frame(v);
    expect(frames.length).toBe(drawnBefore);
    now += 200;
    frame(v);
    update.mockRestore();
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
    } finally {
      FakeRenderer.prototype.getContext = function (this: { context: unknown }) {
        return this.context;
      };
      vi.unstubAllGlobals();
      vi.stubGlobal(
        'ResizeObserver',
        class {
          observe() {}
          disconnect() {}
        }
      );
    }
  });
});
