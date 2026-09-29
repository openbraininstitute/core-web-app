import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import {
  distanceFor,
  fitHalfHeight,
  fogRange,
  halfHeightAt,
  orthoClip,
  orthoPixelScale,
} from './camera';
import { type DistanceData, type Palette, paintColors, typeBytes } from './colors';
import { clipRange, depthSpan, fitDistance, orbitRadius } from './framing';
import {
  type BumpParams,
  backgroundCss,
  createLooks,
  DEFAULT_LOOK,
  type Look,
  makeEnvironment,
  setBumpParams,
  setDepthRange,
  setWidthFloor,
  showTypeTint,
  withDisplacement,
} from './looks';
import { overlayMaterial, skeletonStyle, standInMaterial } from './skeleton-lines';

import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { MeshResult } from './mesher';
import type { SkeletonData } from './protocol';

/**
 * Ambient occlusion is computed at this fraction of the device resolution.
 * It is a low-frequency effect, and the pass costs several taps per pixel.
 */
const AO_SCALE = 0.5;
/** Screen-space AO radius in CSS pixels; it follows the zoom, not the geometry. */
const AO_RADIUS_CSS = 32;
/** At most this many of the mesh's vertices are kept to find, every frame, the depths the depth-coded look spans. */
const DEPTH_SAMPLE = 16384;
/** Fraction of the way from the centre to the edge of the view that the farthest-reaching side of a cell comes to on reset. */
const FIT_FILL = 0.92;
/** Width of the skeleton overlay in CSS pixels. A GL line is one device pixel, half a CSS pixel on a retina screen. */
const SKELETON_WIDTH = 2;
/** Width in CSS pixels of the dark casing on either side, which keeps the skeleton apart from a mesh of its colour. */
const SKELETON_CASING = 1;
/** Vertical field of view of the perspective camera, degrees. */
const FOV = 45;

/** A skeleton overlay's segments on show and their colour buffer. */
interface Overlay {
  /** The indices of the segments drawn, where some are hidden; null for all of them. */
  kept: Int32Array | null;
  /** The types of the segments drawn. */
  types: Uint8Array;
  colors: THREE.InstancedInterleavedBuffer;
}

/** The skeleton as traced, or as prepared for meshing (smoothed, resampled, untangled, simplified). */
export type SkeletonKind = 'original' | 'processed';
export type Projection = 'orthographic' | 'perspective';

function disposeMaterial(material: THREE.Material): void {
  for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
  material.dispose();
}

export class Viewer {
  readonly looks: Look[];
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private perspective = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100000);
  private orthographic = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  private projection: Projection = 'orthographic';
  private controls: OrbitControls;
  /**
   * The mesh is drawn as one Mesh per slab, all sharing the same vertex
   * buffers, each with its own slice of the index, so slabs outside the view
   * are culled and nothing is duplicated on the GPU.
   */
  private chunks = new THREE.Group();
  private outlines = new THREE.Group();
  /** The chunks and outlines, without the overlays: what ambient occlusion is computed from. A scene, for the pass. */
  private surfaces = new THREE.Scene();
  private result: MeshResult | null = null;
  /** The mesh's 8-bit colour attribute, which the palette and the distances are written into. */
  private meshColors: THREE.BufferAttribute | null = null;
  private typeColors = typeBytes({
    soma: '#444',
    axon: '#03a',
    basalDendrite: '#f00',
    apicalDendrite: '#f0f',
  });
  private distances: DistanceData | null = null;
  /**
   * The skeleton overlays, one of which is shown at a time: lines in the type colours over a dark casing, which is only
   * drawn over the mesh. They are depth-tested: inside a solid mesh they show where they leave the surface, and inside a
   * wireframe the wires in front of them cross over them.
   */
  private skeletons: Record<SkeletonKind, THREE.Group> = {
    original: new THREE.Group(),
    processed: new THREE.Group(),
  };
  private skeletonData: Record<SkeletonKind, SkeletonData | null> = {
    original: null,
    processed: null,
  };
  /** What an overlay draws, so that its colours can be painted again without building it again. */
  private overlays: Record<SkeletonKind, Overlay | null> = { original: null, processed: null };
  private hiddenTypes = new Set<number>();
  // Both are drawn with the transparent objects, after them: the see-through looks would otherwise glow over them.
  private skeletonLine = overlayMaterial({
    vertexColors: true,
    linewidth: SKELETON_WIDTH,
    transparent: true,
  });
  // Without depth writes: the line over it has the same depths, and would z-fight with it.
  private skeletonCasing = overlayMaterial({
    color: 0x111111,
    linewidth: SKELETON_WIDTH + 2 * SKELETON_CASING,
    transparent: true,
    depthWrite: false,
  });
  private skeletonBody = standInMaterial({ vertexColors: true, linewidth: 0 });
  /** The skeleton to show over the mesh (`skeletonStyle`). */
  private chosenSkeleton: SkeletonKind | null = null;
  private bounds = new THREE.Box3(new THREE.Vector3(-50, -50, -50), new THREE.Vector3(50, 50, 50));
  /** The original skeleton's points (x, y, z after one another), which `resetView` fits into the view; null before a load. */
  private fitPoints: Float32Array | null = null;
  /** Every so many of the mesh's vertices (x, y, z after one another), for the depth-coded look; null without a mesh. */
  private depthSample: Float32Array | null = null;
  /** Made the first time a look reflects it. */
  private environment: THREE.Texture | null = null;
  private look: Look;
  private meshVisible = true;
  private dark = false;
  private ao = false;
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private gtao: GTAOPass | null = null;
  private bloom: UnrealBloomPass | null = null;
  /** The canvas's size in CSS pixels, as `resize` left it. */
  private width = 1;
  private height = 1;
  private viewDir = new THREE.Vector3();
  /** Set whenever something other than the camera changed; the loop only renders when needed. */
  private dirty = true;
  /** The animation loop stops once nothing moves and nothing has changed; `invalidate` starts it again. */
  private looping = false;
  private disposed = false;
  private resizeObserver: ResizeObserver;
  private pixelScale: number | null = null;
  private pixelScaleListeners = new Set<(scale: number | null) => void>();
  private wheelListeners = new Set<() => void>();

  constructor(private container: HTMLElement) {
    // The shaders' shared uniforms outlive a viewer: start from their defaults.
    setBumpParams({ amplitude: 0, scale: 1.5, smoothness: 0.5 });
    setWidthFloor(0);
    showTypeTint(false);

    // Transparent canvas over CSS backgrounds: gradients stay untouched by tone mapping and post-processing.
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    this.perspective.position.set(0, 0, 500);
    this.orthographic.position.set(0, 0, 500);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.autoRotateSpeed = 0.7;
    // Wheel and pointer handlers apply their change inside OrbitControls itself, so the per-frame
    // update() alone would miss them; the change event catches every path.
    this.controls.addEventListener('change', this.onControlsChange);
    // Before OrbitControls sees it: outside fullscreen a plain wheel scrolls the page.
    container.addEventListener('wheel', this.onWheel, { capture: true });

    // Light rigs ride on the camera so every look keeps its lighting while orbiting.
    this.looks = createLooks(this.renderer.getPixelRatio());
    for (const l of this.looks) if (l.rig) this.camera.add(l.rig);
    this.scene.add(this.perspective, this.orthographic);
    this.chunks.name = 'morphology';
    this.outlines.name = 'outline';
    this.surfaces.add(this.chunks, this.outlines);
    this.scene.add(this.surfaces);
    for (const [kind, group] of Object.entries(this.skeletons)) {
      group.name = `${kind} skeleton`;
      group.visible = false;
      this.scene.add(group);
    }
    this.styleSkeletons();
    this.look = this.looks.find((l) => l.id === DEFAULT_LOOK) ?? this.looks[0];
    this.applyLook();
    this.applyBackground();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.invalidate();
  }

  private get camera(): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    return this.projection === 'perspective' ? this.perspective : this.orthographic;
  }

  dispose(): void {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.container.removeEventListener('wheel', this.onWheel, { capture: true });
    this.controls.removeEventListener('change', this.onControlsChange);
    this.controls.dispose();
    this.clearMesh();
    for (const kind of Object.keys(this.skeletons) as SkeletonKind[])
      this.renderSkeleton(kind, null);
    this.skeletonLine.dispose();
    this.skeletonCasing.dispose();
    this.skeletonBody.dispose();
    for (const l of this.looks) {
      disposeMaterial(l.material);
      if (l.outline) disposeMaterial(l.outline);
    }
    this.environment?.dispose();
    this.gtao?.dispose();
    this.bloom?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.pixelScaleListeners.clear();
    this.wheelListeners.clear();
  }

  // ---------------------------------------------------------------------------
  // Rendering

  /** Render only when the camera moved (including damping and spin) or the scene changed, and stop when neither did. */
  private frame(): void {
    const moved = this.controls.update();
    if (!moved && !this.dirty) {
      this.renderer.setAnimationLoop(null);
      this.looping = false;
      return;
    }
    this.updateCameraTied();
    this.draw();
    this.dirty = false;
  }

  private draw(): void {
    const c = this.composer;
    if (c && (this.ao || this.look.bloom === true)) {
      // The scene goes into the read buffer, which must be the multisampled one; the passes enabled may swap the two
      // an odd number of times per frame.
      if (c.readBuffer !== c.renderTarget2) c.swapBuffers();
      c.render();
    } else this.renderer.render(this.scene, this.camera);
  }

  private invalidate(): void {
    this.dirty = true;
    if (this.looping || this.disposed) return;
    this.looping = true;
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private onControlsChange = (): void => {
    this.invalidate();
    this.updatePixelScale();
  };

  private onWheel = (e: WheelEvent): void => {
    if (e.ctrlKey || document.fullscreenElement?.contains(this.container)) return;
    e.stopPropagation();
    for (const listener of this.wheelListeners) listener();
  };

  /** How close the view is: the orbit distance, or for the orthographic camera the perspective distance with its view. */
  private reach(distance: number): number {
    if (this.projection === 'perspective') return distance;
    const o = this.orthographic;
    return distanceFor(o.top / o.zoom, FOV);
  }

  /**
   * Per-frame state that follows the camera: the clip range and fog ranges tied
   * to the orbit distance, and the depths the depth-coded look's colours span.
   */
  private updateCameraTied(): void {
    const camera = this.camera;
    const target = this.controls.target;
    const d = camera.position.distanceTo(target);
    const reach = this.reach(d);
    const dir = camera.getWorldDirection(this.viewDir);
    const radius = orbitRadius(this.bounds) || 50;
    // A near plane fixed at the framing distance would cut fibres tens of µm away on a mm-scale cell.
    const { near, far } =
      this.projection === 'perspective'
        ? clipRange(d, camera.position.length(), radius)
        : orthoClip(d, radius + target.length());
    if (near !== camera.near || far !== camera.far) {
      camera.near = near;
      camera.far = far;
      camera.updateProjectionMatrix();
    }
    const fog = fogRange(d, reach);
    for (const l of this.looks) {
      if (l.fog) {
        l.fog.near = fog.near;
        l.fog.far = fog.far;
      }
    }
    // Only the mesh is drawn by depth.
    if (this.depthSample !== null) {
      const span = depthSpan(this.depthSample, camera.position, dir, d, reach);
      setDepthRange(span.near, span.far);
    }
  }

  private applyLook(): void {
    const look = this.look;
    for (const l of this.looks) if (l.rig) l.rig.visible = l === look;
    for (const m of this.chunks.children) (m as THREE.Mesh).material = look.material;
    this.outlines.visible = this.meshVisible && look.outline !== undefined;
    if (look.outline) {
      for (const m of this.outlines.children) (m as THREE.Mesh).material = look.outline;
    }
    if (look.env) this.environment ??= makeEnvironment(this.renderer);
    this.scene.environment = look.env ? this.environment : null;
    this.scene.fog = look.fog ?? null;
    if (this.bloom) this.bloom.enabled = look.bloom === true;
    this.invalidate();
  }

  private applyBackground(): void {
    this.container.style.background = backgroundCss(this.look, this.dark);
    for (const l of this.looks) {
      // Fog fades towards the (flat) background of its look.
      if (l.fog) l.fog.color.set(l.background[this.dark ? 'dark' : 'light'][1]);
      l.onTheme?.(this.dark);
    }
    this.invalidate();
  }

  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    // Hidden (display: none): keep the last size rather than draw into a point.
    if (w === 0 || h === 0) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.perspective.aspect = w / h;
    this.perspective.updateProjectionMatrix();
    const o = this.orthographic;
    o.left = -o.top * (w / h);
    o.right = o.top * (w / h);
    o.updateProjectionMatrix();
    this.composer?.setSize(w, h);
    this.sizeEffects(w, h);
    this.invalidate();
    this.updatePixelScale();
  }

  /** AO runs at a fraction of the device resolution; bloom at CSS resolution. Both are upsampled when blended. */
  private sizeEffects(w: number, h: number): void {
    const pr = this.renderer.getPixelRatio();
    this.gtao?.setSize(
      Math.max(1, Math.round(w * pr * AO_SCALE)),
      Math.max(1, Math.round(h * pr * AO_SCALE))
    );
    this.bloom?.setSize(w, h);
  }

  private updatePixelScale(): void {
    const o = this.orthographic;
    const scale =
      this.projection === 'orthographic'
        ? orthoPixelScale(o.top, o.bottom, o.zoom, this.height)
        : null;
    if (scale === this.pixelScale) return;
    this.pixelScale = scale;
    for (const listener of this.pixelScaleListeners) listener(scale);
  }

  // ---------------------------------------------------------------------------
  // Content

  /**
   * Upload the mesh: positions as floats, normals as 16-bit and colours as
   * 8-bit normalised integers, one Mesh per render chunk.
   */
  setMesh(result: MeshResult): void {
    this.clearMesh();
    this.result = result;
    this.styleSkeletons();
    const n = result.positions.length / 3;
    const normals = new Int16Array(n * 3);
    const src = result.normals;
    for (let i = 0; i < 3 * n; i++) normals[i] = Math.round(src[i] * 32767);
    const p = result.positions;
    const stride = Math.max(1, Math.ceil(n / DEPTH_SAMPLE));
    this.depthSample = new Float32Array(3 * Math.ceil(n / stride));
    for (let i = 0, j = 0; i < n; i += stride, j += 3)
      this.depthSample.set(p.subarray(3 * i, 3 * i + 3), j);
    const position = new THREE.BufferAttribute(result.positions, 3);
    const normal = new THREE.BufferAttribute(normals, 3, true);
    const color = new THREE.BufferAttribute(new Uint8Array(n * 3), 3, true);
    const swcType = new THREE.BufferAttribute(result.vertexTypes, 1);
    const radius = new THREE.BufferAttribute(result.radii, 1);
    this.meshColors = color;
    this.paintMesh();
    const outline = this.looks.find((l) => l.outline)?.outline;

    this.bounds.makeEmpty();
    for (const chunk of result.chunks) {
      if (chunk.indexCount === 0) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', position);
      geo.setAttribute('normal', normal);
      geo.setAttribute('color', color);
      geo.setAttribute('swcType', swcType);
      geo.setAttribute('radius', radius);
      // A slice of its own, not a draw range: a wireframe is built from the whole of a geometry's index.
      geo.setIndex(
        new THREE.BufferAttribute(
          result.indices.subarray(chunk.indexStart, chunk.indexStart + chunk.indexCount),
          1
        )
      );
      const b = chunk.bounds;
      const box = new THREE.Box3(
        new THREE.Vector3(b[0], b[1], b[2]),
        new THREE.Vector3(b[3], b[4], b[5])
      );
      // Set explicitly: computing them would scan the whole shared buffer per chunk.
      geo.boundingBox = box;
      geo.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      this.bounds.union(box);
      this.chunks.add(new THREE.Mesh(geo, this.look.material));
      if (outline) this.outlines.add(new THREE.Mesh(geo, outline));
    }
    if (this.bounds.isEmpty()) {
      this.bounds.set(new THREE.Vector3(-50, -50, -50), new THREE.Vector3(50, 50, 50));
    }
    this.invalidate();
  }

  clearMesh(): void {
    // The chunks share their vertex attributes, which the first dispose frees; each frees its own index and vertex arrays.
    for (const m of this.chunks.children) (m as THREE.Mesh).geometry.dispose();
    this.chunks.clear();
    this.outlines.clear();
    this.result = null;
    this.meshColors = null;
    this.depthSample = null;
    this.styleSkeletons();
    this.invalidate();
  }

  /**
   * Replace one of the skeleton overlays, or drop it with null. With the morphology's `size`, also refit the orbit
   * bounds to it and reset the camera.
   */
  setSkeleton(
    kind: SkeletonKind,
    data: SkeletonData | null,
    size?: [number, number, number]
  ): void {
    this.skeletonData[kind] = data;
    this.renderSkeleton(kind, data);
    if (!data || !size) return;
    const box = new THREE.Box3().setFromArray(data.positions);
    this.bounds.copy(box);
    this.bounds.expandByScalar(Math.max(...size) * 0.02);
    this.fitPoints = data.positions;
    this.resetView();
  }

  /** Build a skeleton overlay without its hidden types, and paint it. */
  private renderSkeleton(kind: SkeletonKind, data: SkeletonData | null): void {
    const group = this.skeletons[kind];
    // The line and its casing share the geometry.
    (group.children[0] as LineSegments2 | undefined)?.geometry.dispose();
    group.clear();
    this.overlays[kind] = null;
    if (group.visible) this.invalidate();
    if (!data) return;
    let shown = 0;
    for (let i = 0; i < data.count; i++) if (!this.hiddenTypes.has(data.types[i])) shown++;
    if (shown === 0) return;
    let { positions, radii, types } = data;
    let kept: Int32Array | null = null;
    if (shown < data.count) {
      const all = data.radii;
      kept = new Int32Array(shown);
      positions = new Float32Array(6 * shown);
      radii = all && new Float32Array(2 * shown);
      types = new Uint8Array(shown);
      for (let i = 0, k = 0; i < data.count; i++) {
        if (this.hiddenTypes.has(data.types[i])) continue;
        kept[k] = i;
        types[k] = data.types[i];
        for (let c = 0; c < 6; c++) positions[6 * k + c] = data.positions[6 * i + c];
        if (radii && all) {
          radii[2 * k] = all[2 * i];
          radii[2 * k + 1] = all[2 * i + 1];
        }
        k++;
      }
    }
    // Takes the array as it is, without a copy.
    const geo = new LineSegmentsGeometry().setPositions(positions);
    // One 8-bit colour per segment, for both of its ends: setColors would take six floats, 24 bytes instead of 3.
    const colors = new THREE.InstancedInterleavedBuffer(new Uint8Array(shown * 3), 3);
    const color = new THREE.InterleavedBufferAttribute(colors, 3, 0, true);
    geo.setAttribute('instanceColorStart', color);
    geo.setAttribute('instanceColorEnd', color);
    // After the see-through meshes, which are at render order 0, and the line over its casing. Only a skeleton with
    // its radii can stand in for the mesh.
    const drawn: [LineMaterial, number][] = [
      [this.skeletonCasing, 1],
      [this.skeletonLine, 2],
    ];
    if (radii) {
      geo.setAttribute('instanceRadius', new THREE.InstancedBufferAttribute(radii, 2));
      drawn.push([this.skeletonBody, 2]);
    }
    for (const [material, order] of drawn) {
      const lines = new LineSegments2(geo, material);
      lines.renderOrder = order;
      group.add(lines);
    }
    this.overlays[kind] = { kept, types, colors };
    this.paintSkeleton(kind);
  }

  /** The type colours or, where they are measured, the distance colours of an overlay's segments. */
  private paintSkeleton(kind: SkeletonKind): void {
    const overlay = this.overlays[kind];
    const data = this.skeletonData[kind];
    if (!overlay || !data) return;
    const { kept, types, colors } = overlay;
    let distances = this.distances?.of(data);
    if (distances && kept) {
      const all = distances;
      distances = new Float32Array(kept.length);
      for (let k = 0; k < kept.length; k++) distances[k] = all[kept[k]];
    }
    paintColors(colors.array as Uint8Array, types, this.typeColors, distances, this.distances?.max);
    colors.needsUpdate = true;
    if (this.skeletons[kind].visible) this.invalidate();
  }

  private paintMesh(): void {
    const r = this.result;
    if (!r || !this.meshColors) return;
    const d = this.distances;
    paintColors(
      this.meshColors.array as Uint8Array,
      r.vertexTypes,
      this.typeColors,
      d?.of(r),
      d?.max
    );
    this.meshColors.needsUpdate = true;
  }

  // ---------------------------------------------------------------------------
  // View options

  /**
   * The neurite colours, or with `distances` the path distance to the soma, on the mesh and the skeletons. Looks that
   * draw in their own colours ignore them (`Look.colors`).
   */
  setColors(palette: Palette, distances: DistanceData | null = null): void {
    this.typeColors = typeBytes(palette);
    this.distances = distances;
    this.paintMesh();
    for (const kind of Object.keys(this.skeletons) as SkeletonKind[]) this.paintSkeleton(kind);
    this.invalidate();
  }

  /** Leave these SWC types out of the skeleton overlays. The mesh leaves them out by being built without them. */
  setHiddenTypes(types: number[]): void {
    this.hiddenTypes = new Set(types);
    for (const kind of Object.keys(this.skeletons) as SkeletonKind[]) {
      this.renderSkeleton(kind, this.skeletonData[kind]);
    }
    this.invalidate();
  }

  showMesh(v: boolean): void {
    this.meshVisible = v;
    this.chunks.visible = v;
    this.styleSkeletons();
    this.applyLook();
  }

  /** Show the skeleton `skeletonStyle` picks in the same call that brings or drops the mesh, so no frame has one without the other. */
  private styleSkeletons(): void {
    const style = skeletonStyle(this.chosenSkeleton, this.result !== null, this.meshVisible);
    for (const [k, group] of Object.entries(this.skeletons)) group.visible = k === style.kind;
    this.skeletonBody.visible = style.body;
    this.skeletonLine.visible = style.line;
    this.skeletonCasing.visible = style.casing;
  }

  /** The skeleton overlay to show over the mesh, or none; until the mesh comes, the traced one stands in for it. */
  showSkeleton(kind: SkeletonKind | null): void {
    this.chosenSkeleton = kind;
    this.styleSkeletons();
    this.invalidate();
  }

  setWireframe(v: boolean): void {
    for (const l of this.looks) {
      const m = l.material as THREE.Material & { wireframe?: boolean };
      if ('wireframe' in m) m.wireframe = v;
    }
    this.invalidate();
  }

  setDark(dark: boolean): void {
    this.dark = dark;
    this.applyBackground();
  }

  /** The bumps of every look (looks.ts); an amplitude of 0 turns them off. */
  setBumps(p: BumpParams): void {
    setBumpParams(p);
    this.invalidate();
  }

  /** The width floor of every look (looks.ts), and of the skeleton that stands in for the mesh; 0 turns it off. */
  setMinWidth(pixels: number): void {
    setWidthFloor(pixels);
    this.skeletonBody.linewidth = pixels;
    this.invalidate();
  }

  /** A faint tint of the type colours in the looks that otherwise ignore them and offer it (looks.ts). */
  setTypeTint(on: boolean): void {
    showTypeTint(on);
    this.invalidate();
  }

  /** Switch to the look `id`; what it turns on with it (`Look.bumps`, `Look.ao`) is the caller's to apply. */
  setLook(id: string): void {
    const look = this.looks.find((l) => l.id === id);
    if (!look) throw new Error(`unknown look "${id}"`);
    this.look = look;
    if (look.bloom) this.ensureComposer();
    this.applyLook();
    this.applyBackground();
  }

  setSpin(on: boolean): void {
    this.controls.autoRotate = on;
    this.invalidate();
  }

  /** Screen-space ambient occlusion (GTAO). */
  setAO(on: boolean): void {
    this.ao = on;
    if (on) this.ensureComposer();
    if (this.gtao) this.gtao.enabled = on;
    this.invalidate();
  }

  /** Render pass → GTAO → bloom → output; the middle two are toggled per state and look. */
  private ensureComposer(): void {
    if (this.composer) return;
    const w = this.width,
      h = this.height;
    const composer = new EffectComposer(this.renderer);
    // The scene is drawn into renderTarget2 (see draw), multisampled like the canvas: without, a fibre thinner than a
    // pixel breaks into dashes whenever a pass is on. The other buffer only takes full-screen passes, and nothing
    // reads the scene's depth back.
    composer.renderTarget2.samples = 4;
    composer.renderTarget2.resolveDepthBuffer = false;
    composer.renderTarget1.depthBuffer = false;
    const renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(renderPass);
    const gtao = new GTAOPass(this.surfaces, this.camera, w, h);
    gtao.output = GTAOPass.OUTPUT.Default;
    // three's GTAO scales its depth range by the screen-space radius (distanceFalloffToUse) but tests the unscaled
    // `thickness`: test the scaled one, so that `thickness` too is in hundreds of pixels at each fragment's depth.
    const ao = gtao.gtaoMaterial;
    const unscaled = ao.fragmentShader;
    ao.fragmentShader = unscaled.replaceAll(
      'abs(viewDelta.z) < thickness',
      'abs(viewDelta.z) < distanceFalloffToUse'
    );
    if (ao.fragmentShader === unscaled) {
      console.warn('GTAOShader has changed: the AO depth range no longer follows the zoom');
    }
    // Radius in pixels of the AO target so the effect follows the zoom: neighbouring fibres shade each other close
    // up, dense regions darken from afar. The shader counts a screen-space radius in hundreds of pixels. A sample
    // occludes within a depth as long as the radius is wide.
    const radius = (AO_RADIUS_CSS * this.renderer.getPixelRatio() * AO_SCALE) / 100;
    gtao.updateGtaoMaterial({
      radius,
      distanceExponent: 1,
      thickness: radius,
      scale: 1.5,
      samples: 16,
      distanceFallOff: 1,
      screenSpaceRadius: true,
    });
    gtao.updatePdMaterial({
      lumaPhi: 10,
      depthPhi: 2,
      normalPhi: 3,
      radius: 4,
      radiusExponent: 1,
      rings: 2,
      samples: 16,
    });
    gtao.blendIntensity = 1;
    gtao.enabled = this.ao;
    // The pass draws its own normals and depth: with the bumps and the width floor in them the occlusion follows the
    // surface as drawn. The normals tilt per vertex, as the depth it reconstructs the surface from is displaced: tilted
    // per pixel, they would disagree with it and occlude themselves.
    withDisplacement(gtao.normalMaterial, { perFragment: false });
    composer.addPass(gtao);
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.65, 0.5, 0.2);
    bloom.enabled = this.look.bloom === true;
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.setPixelRatio(this.renderer.getPixelRatio());
    composer.setSize(w, h);
    this.composer = composer;
    this.renderPass = renderPass;
    this.gtao = gtao;
    this.bloom = bloom;
    this.sizeEffects(w, h);
  }

  /** The passes that draw from the camera, onto the one in use. GTAO reconstructs positions differently per projection. */
  private retargetPasses(): void {
    const camera = this.camera;
    if (this.renderPass) this.renderPass.camera = camera;
    const gtao = this.gtao;
    if (!gtao) return;
    gtao.camera = camera;
    const perspective = this.projection === 'perspective' ? 1 : 0;
    for (const m of [gtao.gtaoMaterial, gtao.depthRenderMaterial]) {
      m.defines.PERSPECTIVE_CAMERA = perspective;
      m.needsUpdate = true;
    }
  }

  /** µm per CSS pixel in the orthographic view, null in perspective. */
  get currentPixelScale(): number | null {
    return this.pixelScale;
  }

  /**
   * Switch between the orthographic and the perspective camera, keeping the target, the direction and how large the
   * cell is at the target.
   */
  setProjection(projection: Projection): void {
    if (projection === this.projection) return;
    const from = this.camera;
    const target = this.controls.target;
    const offset = from.position.clone().sub(target);
    const d = offset.length();
    const o = this.orthographic;
    this.projection = projection;
    const to = this.camera;
    if (projection === 'orthographic') {
      const half = halfHeightAt(d, FOV);
      o.top = half;
      o.bottom = -half;
      o.left = -half * (this.width / this.height);
      o.right = half * (this.width / this.height);
      o.zoom = 1;
      to.position.copy(from.position);
    } else {
      to.position
        .copy(target)
        .addScaledVector(offset.normalize(), distanceFor(o.top / o.zoom, FOV));
    }
    to.up.copy(from.up);
    to.quaternion.copy(from.quaternion);
    to.updateProjectionMatrix();
    for (const l of this.looks) if (l.rig) to.add(l.rig);
    this.controls.object = to;
    this.retargetPasses();
    this.controls.update();
    this.invalidate();
    this.updatePixelScale();
  }

  resetView(): void {
    // Orbit the soma (the origin), as close as lets the whole cell in: the side that reaches farthest on screen
    // comes to within a margin of the edge. The skeleton stands for the cell; the margin covers its fibres' radii.
    const aspect = this.width / this.height;
    const tanY = Math.tan((FOV * Math.PI) / 360);
    const box = this.bounds,
      corners: number[] = [];
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) corners.push(x, y, z);
    }
    const points = this.fitPoints ?? corners;
    const r = orbitRadius(this.bounds) || 50;
    const camera = this.camera;
    if (this.projection === 'perspective') {
      const dist = fitDistance(points, tanY * aspect, tanY, FIT_FILL, r * 0.02) || r / tanY;
      camera.position.set(0, 0, dist);
    } else {
      const o = this.orthographic;
      const half = fitHalfHeight(points, aspect, FIT_FILL) || r;
      o.top = half;
      o.bottom = -half;
      o.left = -half * aspect;
      o.right = half * aspect;
      o.zoom = 1;
      o.updateProjectionMatrix();
      // Where the perspective camera would stand for this view, outside the cell.
      camera.position.set(0, 0, Math.max(distanceFor(half, FOV), r * 1.05));
    }
    camera.up.set(0, 1, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.invalidate();
    this.updatePixelScale();
  }

  onPixelScaleChange(listener: (scale: number | null) => void): () => void {
    this.pixelScaleListeners.add(listener);
    return () => this.pixelScaleListeners.delete(listener);
  }

  /** A wheel turned outside fullscreen without Ctrl, which scrolls the page instead of zooming. */
  onWheelWithoutCtrl(listener: () => void): () => void {
    this.wheelListeners.add(listener);
    return () => this.wheelListeners.delete(listener);
  }
}
