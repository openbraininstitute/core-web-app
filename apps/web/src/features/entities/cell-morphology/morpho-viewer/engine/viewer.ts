import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

import {
  type BumpParams,
  MORPHOLOGY_SURFACE,
  setBumpParams,
  setWidthFloor,
  showTypeTint,
} from '@/features/viewer-3d/engine/looks';
import { SceneViewer } from '@/features/viewer-3d/engine/scene-viewer';

import { type DistanceData, type Palette, paintColors, typeBytes } from './colors';
import { overlayMaterial, skeletonStyle, standInMaterial } from './skeleton-lines';

import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { MeshResult } from './mesher';
import type { SkeletonData } from './protocol';

/** At most this many of the mesh's vertices are kept to find, every frame, the depths the depth-coded look spans. */
const DEPTH_SAMPLE = 16384;
/** Width of the skeleton overlay in CSS pixels. A GL line is one device pixel, half a CSS pixel on a retina screen. */
const SKELETON_WIDTH = 2;
/** Width in CSS pixels of the dark casing on either side, which keeps the skeleton apart from a mesh of its colour. */
const SKELETON_CASING = 1;

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

/**
 * The morphology on the shared scene: its mesh, the skeleton overlays, and their colours.
 *
 * The mesh is drawn as one Mesh per slab, all sharing the same vertex
 * buffers, each with its own slice of the index, so slabs outside the view
 * are culled and nothing is duplicated on the GPU.
 */
export class Viewer extends SceneViewer {
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

  constructor(container: HTMLElement) {
    super(container, { surface: MORPHOLOGY_SURFACE });
    // The shaders' shared uniforms outlive a viewer: start from their defaults.
    setBumpParams({ amplitude: 0, scale: 1.5, smoothness: 0.5 });
    setWidthFloor(0);
    showTypeTint(false);
    this.chunks.name = 'morphology';
    for (const [kind, group] of Object.entries(this.skeletons)) {
      group.name = `${kind} skeleton`;
      group.visible = false;
      this.scene.add(group);
    }
    this.styleSkeletons();
  }

  protected override disposeContent(): void {
    this.clearMesh();
    for (const kind of Object.keys(this.skeletons) as SkeletonKind[])
      this.renderSkeleton(kind, null);
    this.skeletonLine.dispose();
    this.skeletonCasing.dispose();
    this.skeletonBody.dispose();
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
    // The skeleton stands for the cell in the fit; the margin covers its fibres' radii.
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
}
