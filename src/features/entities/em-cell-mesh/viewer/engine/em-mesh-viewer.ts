import * as THREE from 'three';

import { isDarkBackground } from '@/features/viewer-3d/engine/looks';
import { SceneViewer } from '@/features/viewer-3d/engine/scene-viewer';

import { GpuTimer, type TimerKind } from './gpu-timer';
import {
  type Choice,
  errorPixels,
  type ForcedMesh,
  FrameCost,
  MeshChooser,
  type MeshKind,
  MovingCost,
  type Reason,
} from './mesh-choice';
import { MotionQuality } from './motion-quality';

import type { Grid, PackedChunk, PackedMesh, StandIn } from './types';

/**
 * How long the uploads may take of a frame, ms, while the view moves, and while it is still, when no frame is dropped
 * that anyone would see; one chunk goes up every frame however long it takes.
 */
const UPLOAD_BUDGET_MS = { moving: 4, still: 12 };
/** At most this many of the stand-in's vertices frame the view and give the depth-coded look its range. */
const SAMPLE_POINTS = 16384;
const STAND_IN_BOXES = 0x2ec4ff;
const FULL_BOXES = 0xff8a00;

/** What the Debug menu shows of the view, as it changes. */
export interface ViewStatus {
  shown: MeshKind | null;
  reason: Reason | null;
  /** The stand-in's error on screen now, in device pixels. */
  errorPx: number | null;
  /** The full mesh's frame cost on the GPU, ms. */
  frameMs: number | null;
  slow: boolean;
  /** Moving frames of the full mesh turned too slow since the view set off, as zooming out does. */
  slowMoving: boolean;
  /** What frames drawn while the view moves cost the GPU at the scale they are drawn at, ms. */
  movingMs: number | null;
  /** The fraction of the resolution moving frames are drawn at, without the occlusion; null where in full. */
  movingScale: number | null;
  timer: TimerKind | null;
  /** The full mesh's chunks uploaded, and how long it took from the first to the last, ms. */
  upload: { done: number; total: number; ms: number } | null;
  /** The bytes on the GPU: the stand-in's and the full mesh's vertices and indices. */
  gpuBytes: number;
  /** The canvas's device pixels, which the frame buffers take bytes per. */
  pixels: number;
}

/** A mesh's chunks as made, before they go in the scene as a layer. */
interface Parts {
  meshes: THREE.Mesh[];
  outlines: THREE.Mesh[];
  boxes: THREE.Box3[];
}

/** One of the two meshes in the scene: a Mesh per chunk, and its outline for the looks that have one. */
interface Layer {
  surface: THREE.Group;
  outline: THREE.Group;
  boxes: THREE.LineSegments;
  bytes: number;
}

function chunkGeometry(chunk: PackedChunk, release: boolean): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(chunk.positions, 4);
  const normal = new THREE.BufferAttribute(chunk.normals, 4, true);
  const index = new THREE.BufferAttribute(chunk.indices, 1);
  // The full mesh is too large to keep a copy of; three draws from the GPU's.
  if (release) for (const a of [position, normal, index]) a.onUpload(releaseArray);
  geo.setAttribute('position', position);
  geo.setAttribute('normal', normal);
  geo.setIndex(index);
  const b = chunk.bounds;
  geo.boundingBox = new THREE.Box3(
    new THREE.Vector3(b[0], b[1], b[2]),
    new THREE.Vector3(b[3], b[4], b[5])
  );
  geo.boundingSphere = geo.boundingBox.getBoundingSphere(new THREE.Sphere());
  return geo;
}

function releaseArray(this: THREE.BufferAttribute): void {
  (this as unknown as { array: null }).array = null;
}

/**
 * The chunk's grid values to µm: one scale for all three axes, so that the normals need no other matrix. Set once:
 * three need not compose it again every frame, for each of hundreds of chunks.
 */
function place(mesh: THREE.Object3D, grid: Grid, chunk: PackedChunk): void {
  mesh.matrixAutoUpdate = false;
  mesh.position.set(
    grid.origin[0] + grid.step * chunk.origin[0],
    grid.origin[1] + grid.step * chunk.origin[1],
    grid.origin[2] + grid.step * chunk.origin[2]
  );
  mesh.scale.setScalar(grid.step);
  mesh.updateMatrix();
}

function meshBytes(mesh: PackedMesh): number {
  return mesh.chunks.reduce(
    (n, c) => n + c.positions.byteLength + c.normals.byteLength + c.indices.byteLength,
    0
  );
}

/** The edges of boxes in µm, as line segments. */
function boxLines(boxes: THREE.Box3[], color: number): THREE.LineSegments {
  const positions = new Float32Array(boxes.length * 72);
  let at = 0;
  for (const { min, max } of boxes) {
    const corner = (i: number) => [
      i & 1 ? max.x : min.x,
      i & 2 ? max.y : min.y,
      i & 4 ? max.z : min.z,
    ];
    for (const [a, b] of [
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
      [0, 2],
      [1, 3],
      [4, 6],
      [5, 7],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ]) {
      positions.set(corner(a), at);
      positions.set(corner(b), at + 3);
      at += 6;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color }));
  lines.visible = false;
  return lines;
}

/** A degenerate triangle with a chunk's vertex attributes, to compile the shaders on. */
function placeholder(): THREE.BufferGeometry {
  return chunkGeometry(
    {
      positions: new Uint16Array(12),
      normals: new Int8Array(12),
      indices: new Uint16Array([0, 1, 2]),
      origin: [0, 0, 0],
      bounds: [0, 0, 0, 0, 0, 0],
    },
    false
  );
}

/**
 * An EM cell mesh on the shared scene: a coarse stand-in, drawn at once, and the full mesh, uploaded over several
 * frames. Each frame draws one of them (`MeshChooser`): the stand-in wherever its error is under about a device pixel,
 * and while the view moves where the full mesh is too slow for the GPU. Moving frames still too slow leave out the
 * occlusion, then pixels (`MotionQuality`).
 *
 * Both are in chunks of 16-bit positions on a grid, which each chunk's matrix scales to µm, and 8-bit normals. Once
 * uploaded, the full mesh's arrays are let go of; a lost context drops it, and the content is asked to rebuild it.
 */
export class EmMeshViewer extends SceneViewer {
  private standIn: (Layer & { data: StandIn }) | null = null;
  private full: Layer | null = null;
  /**
   * The full mesh's chunks going up, a few a frame, before it can be drawn. Each chunk is let go of as it goes up, so
   * that its arrays go with three's copy of them.
   */
  private pending:
    | (Parts & {
        grid: Grid;
        chunks: (PackedChunk | null)[];
        bytes: number;
        next: number;
        started: number | null;
        keep?: (chunk: PackedChunk, index: number) => void;
      })
    | null = null;
  /** The stand-in is the whole mesh. */
  private whole = false;
  /** A lost context took the full mesh with it. */
  private lostFull = false;
  private framed = false;
  private chooser = new MeshChooser();
  private choice: Choice | null = null;
  private errorPx: number | null = null;
  private forced: ForcedMesh = 'auto';
  private boxesShown = false;
  private cost = new FrameCost();
  private motion = new MotionQuality();
  private movingCost = new MovingCost();
  private timer: GpuTimer | null = null;
  /** Whether the frame being drawn is timed. */
  private timing = false;
  /** What the frame last timed is measured for: the full mesh's cost drawn in full, and the moving frames'. */
  private timed = { full: false, moving: false, fullMoving: false };
  private upload: ViewStatus['upload'] = null;
  private wire = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.6 });
  private statusListeners = new Set<(status: ViewStatus) => void>();
  private readyListeners = new Set<() => void>();
  private rebuildListeners = new Set<() => void>();
  private contextListeners = new Set<(lost: boolean) => void>();
  private heard: ViewStatus | null = null;

  constructor(container: HTMLElement) {
    super(container, {
      surface: [],
      aoDepth: 'main-pass',
      composeAlways: true,
      powerPreference: 'high-performance',
    });
    this.chunks.name = 'em mesh';
    this.makeTimer();
    this.paintWire();
  }

  protected override disposeContent(): void {
    this.timer?.dispose();
    this.clear();
    this.wire.dispose();
    this.statusListeners.clear();
    this.readyListeners.clear();
    this.rebuildListeners.clear();
    this.contextListeners.clear();
  }

  /** Compile the look's shaders for a chunk, before the mesh arrives. */
  prepare(): Promise<void> {
    const geo = placeholder();
    return this.warmUp(geo).finally(() => geo.dispose());
  }

  // ---------------------------------------------------------------------------
  // Content

  /** Show the stand-in, framing the view on the first. */
  setStandIn(standIn: StandIn): void {
    this.dropLayer(this.standIn);
    const parts: Parts = { meshes: [], outlines: [], boxes: [] };
    for (const chunk of standIn.chunks) this.chunkMesh(standIn.grid, chunk, false, parts);
    this.standIn = { ...this.makeLayer(parts, STAND_IN_BOXES, meshBytes(standIn)), data: standIn };
    this.bounds.makeEmpty();
    for (const b of parts.boxes) this.bounds.union(b);
    this.bounds.expandByScalar(standIn.errorUm);
    this.fitPoints = this.depthSample = samplePoints(standIn);
    if (!this.framed) {
      this.framed = true;
      this.resetView();
    }
    this.applyLook();
    this.invalidate();
  }

  /**
   * Upload the full mesh over the next frames, and draw it once all of it is up. The stand-in itself, it is whole. Each
   * chunk, once up, goes to `keep`, which may take its arrays: three is done with them.
   */
  setFull(mesh: PackedMesh, keep?: (chunk: PackedChunk, index: number) => void): void {
    this.dropFull();
    this.whole = mesh === this.standIn?.data;
    if (this.whole) this.tellReady();
    else {
      this.pending = {
        grid: mesh.grid,
        chunks: [...mesh.chunks],
        bytes: meshBytes(mesh),
        next: 0,
        meshes: [],
        outlines: [],
        boxes: [],
        started: null,
        keep,
      };
    }
    this.invalidate();
  }

  /** Drop both meshes, as for another cell. */
  clear(): void {
    this.dropFull();
    this.whole = false;
    this.lostFull = false;
    this.dropLayer(this.standIn);
    this.standIn = null;
    this.framed = false;
    this.chooser.reset();
    this.choice = null;
    this.errorPx = null;
    this.fitPoints = this.depthSample = null;
    this.invalidate();
    this.tellStatus();
  }

  /** Whether there was a full mesh, or one on its way up. */
  private dropFull(): boolean {
    const had = this.full !== null || this.pending !== null;
    for (const m of this.pending?.meshes ?? []) m.geometry.dispose();
    this.pending = null;
    this.dropLayer(this.full);
    this.full = null;
    this.upload = null;
    this.invalidate();
    return had;
  }

  // three uploads the stand-in again from the arrays it keeps; the full mesh's are gone.
  protected override contextLost(): void {
    if (this.dropFull()) this.lostFull = true;
    for (const listener of this.contextListeners) listener(true);
  }

  protected override contextRestored(): void {
    this.makeTimer();
    for (const listener of this.contextListeners) listener(false);
    if (!this.lostFull) return;
    this.lostFull = false;
    for (const listener of this.rebuildListeners) listener();
  }

  /** A mesh's chunks in the scene, hidden until a frame chooses it. */
  private makeLayer({ meshes, outlines, boxes }: Parts, color: number, bytes: number): Layer {
    const surface = new THREE.Group();
    const outline = new THREE.Group();
    surface.visible = outline.visible = false;
    surface.matrixAutoUpdate = outline.matrixAutoUpdate = false;
    if (meshes.length > 0) surface.add(...meshes);
    if (outlines.length > 0) outline.add(...outlines);
    this.chunks.add(surface);
    this.outlines.add(outline);
    const lines = boxLines(boxes, color);
    this.scene.add(lines);
    return { surface, outline, boxes: lines, bytes };
  }

  /** A chunk placed in µm, its outline, and its bounds in µm, added to `parts`. */
  private chunkMesh(grid: Grid, chunk: PackedChunk, release: boolean, parts: Parts) {
    const geo = chunkGeometry(chunk, release);
    const mesh = new THREE.Mesh(geo, this.look.material);
    place(mesh, grid, chunk);
    const outlineMaterial = this.looks.find((l) => l.outline)?.outline;
    const outline = outlineMaterial ? new THREE.Mesh(geo, outlineMaterial) : null;
    if (outline) place(outline, grid, chunk);
    parts.meshes.push(mesh);
    if (outline) parts.outlines.push(outline);
    parts.boxes.push((geo.boundingBox as THREE.Box3).clone().applyMatrix4(mesh.matrix));
    return { mesh, outline };
  }

  private dropLayer(layer: Layer | null): void {
    if (!layer) return;
    // The outlines share their chunk's geometry.
    for (const m of layer.surface.children) (m as THREE.Mesh).geometry.dispose();
    layer.surface.removeFromParent();
    layer.outline.removeFromParent();
    layer.boxes.geometry.dispose();
    (layer.boxes.material as THREE.Material).dispose();
    layer.boxes.removeFromParent();
  }

  /** Upload chunks for up to `budgetMs`; once the last is up, the full mesh can be drawn. */
  private uploadSome(budgetMs: number): void {
    const p = this.pending;
    if (!p) return;
    const t0 = performance.now();
    p.started ??= t0;
    const { chunks, grid } = p;
    do {
      const index = p.next++;
      const chunk = chunks[index] as PackedChunk;
      chunks[index] = null;
      const { mesh: m, outline: o } = this.chunkMesh(grid, chunk, true, p);
      this.chunks.add(m);
      if (o) this.outlines.add(o);
      this.drawUnseen(o ? [m, o] : [m]);
      m.removeFromParent();
      o?.removeFromParent();
      p.keep?.(chunk, index);
    } while (p.next < chunks.length && performance.now() - t0 < budgetMs);
    const ms = performance.now() - p.started;
    this.upload = { done: p.next, total: chunks.length, ms };
    this.tellStatus();
    if (p.next < chunks.length) return;

    this.pending = null;
    this.full = this.makeLayer(p, FULL_BOXES, p.bytes);
    // The stand-in's bounds fall short of the mesh's by up to its error.
    for (const b of p.boxes) this.bounds.union(b);
    this.applyLook();
    this.cost.reset();
    this.tellReady();
  }

  // ---------------------------------------------------------------------------
  // Frames

  // Chunks go up whether or not a frame is drawn: while the view is still, nothing on show changes until the last.
  protected override work(moving: boolean): boolean {
    this.uploadSome(UPLOAD_BUDGET_MS[moving ? 'moving' : 'still']);
    return this.pending !== null;
  }

  protected override beforeDraw(moving: boolean): void {
    this.motionScale = this.motion.scale;
    if (!moving) this.movingCost.stop();
    const standIn = this.standIn;
    if (!standIn) {
      this.choice = null;
      this.errorPx = null;
      return;
    }
    const cssPixel = this.cssPixelNear(this.bounds);
    this.errorPx = errorPixels(standIn.data.errorUm, cssPixel, this.renderer.getPixelRatio());
    const choice = this.chooser.choose({
      fullReady: this.full !== null,
      whole: this.whole,
      forced: this.forced,
      wireframe: this.wireframe,
      errorPx: this.errorPx,
      moving,
      slow: this.cost.slow || this.movingCost.slow,
    });
    this.choice = choice;
    const full = choice.mesh === 'full';
    this.show(standIn, !full);
    if (this.full) this.show(this.full, full);
    if (full && this.cost.wantsFrame()) this.invalidate();
    this.startTiming(full, moving);
  }

  private startTiming(fullDrawn: boolean, moving: boolean): void {
    if (!this.timer || this.timer.busy) return;
    const full = fullDrawn && (!moving || this.motionScale === null) && this.cost.measure();
    const motion = moving && this.motion.measure();
    if (!full && !motion) return;
    this.timed = { full, moving: motion, fullMoving: motion && fullDrawn };
    this.timer.begin();
    this.timing = true;
  }

  private measured = (ms: number): void => {
    if (this.timed.full) this.cost.add(ms);
    if (this.timed.moving) this.motion.add(ms);
    if (this.timed.fullMoving) this.movingCost.add(ms);
    this.tellStatus();
  };

  protected override afterDraw(): void {
    if (this.timing) {
      this.timing = false;
      this.timer?.end();
    }
    this.tellStatus();
  }

  private show(layer: Layer, on: boolean): void {
    layer.surface.visible = on;
    layer.outline.visible = on;
    layer.boxes.visible = on && this.boxesShown;
  }

  private makeTimer(): void {
    this.timer?.dispose();
    const gl = this.renderer.getContext();
    this.timer =
      typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
        ? new GpuTimer(gl, this.measured)
        : null;
  }

  // ---------------------------------------------------------------------------
  // View options

  protected override applyLook(): void {
    super.applyLook();
    this.paintWire();
    if (this.wireframe && this.standIn) {
      for (const m of this.standIn.surface.children) (m as THREE.Mesh).material = this.wire;
    }
  }

  /** The stand-in in wires of its own, at any zoom: the full mesh's index, which three would build them from, is let go of. */
  override setWireframe(v: boolean): void {
    this.wireframe = v;
    this.applyLook();
  }

  override setDark(dark: boolean): void {
    super.setDark(dark);
    this.paintWire();
  }

  protected override frameChanged(): void {
    this.cost.reset();
    this.motion.reset();
    this.tellStatus();
  }

  /** Draw this mesh whatever its error, or choose by it again with 'auto'. */
  setForcedMesh(mesh: ForcedMesh): void {
    this.forced = mesh;
    this.invalidate();
  }

  showChunkBoxes(on: boolean): void {
    this.boxesShown = on;
    this.invalidate();
  }

  /** Light wires on a dark background, dark ones on a light. */
  private paintWire(): void {
    this.wire.color.set(isDarkBackground(this.look, this.dark) ? 0xd8dce3 : 0x30343b);
    this.invalidate();
  }

  // ---------------------------------------------------------------------------
  // Listeners

  /** The full mesh can be drawn, or the stand-in is the whole mesh. */
  onFullReady(listener: () => void): () => void {
    this.readyListeners.add(listener);
    return () => this.readyListeners.delete(listener);
  }

  /** The context was restored without the full mesh, which must be built again. */
  onRebuildNeeded(listener: () => void): () => void {
    this.rebuildListeners.add(listener);
    return () => this.rebuildListeners.delete(listener);
  }

  /** The GPU took the context, with all that was drawn (true), or gave it back (false). */
  onContextChange(listener: (lost: boolean) => void): () => void {
    this.contextListeners.add(listener);
    return () => this.contextListeners.delete(listener);
  }

  /** What is on show and why, now and whenever it changes. */
  onStatus(listener: (status: ViewStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status());
    return () => this.statusListeners.delete(listener);
  }

  private tellReady(): void {
    for (const listener of this.readyListeners) listener();
  }

  private status(): ViewStatus {
    return {
      shown: this.choice?.mesh ?? null,
      reason: this.choice?.reason ?? null,
      errorPx: this.errorPx === null ? null : Math.round(this.errorPx * 100) / 100,
      frameMs: this.cost.ms,
      slow: this.cost.slow,
      slowMoving: this.movingCost.slow,
      movingMs: this.motion.ms,
      movingScale: this.motion.scale,
      timer: this.timer?.kind ?? null,
      upload: this.upload,
      gpuBytes: (this.standIn?.bytes ?? 0) + (this.full?.bytes ?? 0),
      pixels: this.renderer.domElement.width * this.renderer.domElement.height,
    };
  }

  private tellStatus(): void {
    if (this.statusListeners.size === 0) return;
    const status = this.status();
    const heard = this.heard;
    if (heard && (Object.keys(status) as (keyof ViewStatus)[]).every((k) => heard[k] === status[k]))
      return;
    this.heard = status;
    for (const listener of this.statusListeners) listener(status);
  }
}

/** Every so many of the stand-in's vertices, in µm. */
function samplePoints(standIn: StandIn): Float32Array {
  const stride = Math.max(1, Math.ceil(standIn.vertices / SAMPLE_POINTS));
  const out = new Float32Array(3 * Math.ceil(standIn.vertices / stride));
  const { origin, step } = standIn.grid;
  let n = 0;
  let at = 0;
  for (const chunk of standIn.chunks) {
    const p = chunk.positions;
    for (let v = 0; v < p.length; v += 4) {
      if (n++ % stride !== 0) continue;
      for (let k = 0; k < 3; k++) out[at + k] = origin[k] + step * (chunk.origin[k] + p[v + k]);
      at += 3;
    }
  }
  return out;
}
