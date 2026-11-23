import * as THREE from 'three';

import { EmMeshViewer } from '@/features/entities/em-cell-mesh/viewer/engine/em-mesh-viewer';
import { addShaderHook } from '@/features/viewer-3d/engine/looks';
import { followScreenUp, stopGlide } from '@/features/viewer-3d/engine/rotation';

import {
  distanceReach,
  lengthRange,
  paintSkeleton,
  paintSpines,
  type SpineColouring,
  TYPE_COLOURS,
} from './colours';
import { type GridBlock, gridLayout } from './grid';
import { alongPath, type DendritePath, dendritePaths, slerpDirection, turnAbout } from './tour';

import type { StandIn } from '@/features/entities/em-cell-mesh/viewer/engine/types';
import type { MovingFrame } from '@/features/viewer-3d/engine/scene-viewer';
import type { SpinyData, Vec3 } from './types';

/** A clipping plane that keeps everything. */
const KEEP_ALL = new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e9);
/** How long the camera takes to fly to a spine or back, ms. */
const FLY_MS = 1400;
/** How see-through the overlaid mesh is to begin with, 0 to 1. */
export const OVERLAY_OPACITY = 0.3;

/**
 * The membrane laid over the skeleton and spines: an even veil, a little brighter at its rims. It wins depth ties with
 * the spines cut from it (their polygon offset is smaller), so it veils them where the two lie on each other.
 */
function overlayMaterial(opacity: { value: number }): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: '#d8d2c8',
    roughness: 0.6,
    metalness: 0,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -16,
  });
  return addShaderHook(m, 'spiny-overlay', (shader) => {
    shader.uniforms.uOverlay = opacity;
    shader.fragmentShader = `uniform float uOverlay;\n${shader.fragmentShader}`.replace(
      '#include <opaque_fragment>',
      /* glsl */ `float overlayRim = pow( 1.0 - abs( dot( normal, geometryViewDir ) ), 2.0 );
	gl_FragColor = vec4( outgoingLight * ( 0.85 + 0.5 * overlayRim ), clamp( uOverlay * ( 0.7 + 0.8 * overlayRim ), 0.0, 1.0 ) );`
    );
  });
}

/** How long the spines take to go to the grid or back, ms: each sets off in the grid's order, over the first part. */
const GRID_MS = 3200;
/** How much of the move to the grid is the spread of the spines' starts. */
const GRID_SPREAD = 0.6;
/** Texels across the spines' data texture: three a spine (root, rotation, slot). */
const DATA_WIDTH = 4096;

/**
 * Each spine's vertices moved from its place on the cell to its slot in the grid, upright in its own frame: undone by
 * its rotation about its root, then laid in the grid's plane. `uGrid` goes 0 to 1; a spine starts as far into it as
 * its place in the grid's order says, so that the grid fills in that order.
 */
const GRID_DECLARATIONS = /* glsl */ `
uniform highp sampler2D uSpineData;
uniform float uGrid;
uniform vec3 uGridOrigin;
uniform mat3 uGridBasis;
attribute float spineIndex;
vec4 spineTexel( int k ) {
  return texelFetch( uSpineData, ivec2( k % ${DATA_WIDTH}, k / ${DATA_WIDTH} ), 0 );
}
vec3 spineTurn( vec4 q, vec3 v ) {
  return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
}
`;
const GRID_NORMAL = /* glsl */ `
int spineK = int( spineIndex + 0.5 );
vec4 spineRoot = spineTexel( 3 * spineK );
vec4 spineBack = spineTexel( 3 * spineK + 1 );
spineBack.xyz = -spineBack.xyz;
vec4 spineSlot = spineTexel( 3 * spineK + 2 );
float spineMix = clamp( uGrid * ${(1 + GRID_SPREAD).toFixed(2)} - ${GRID_SPREAD.toFixed(2)} * spineSlot.z, 0.0, 1.0 );
spineMix = spineMix * spineMix * ( 3.0 - 2.0 * spineMix );
objectNormal = normalize( mix( objectNormal, uGridBasis * spineTurn( spineBack, objectNormal ), spineMix ) );
`;
const GRID_POSITION = /* glsl */ `
vec3 spineUpright = spineTurn( spineBack, transformed - spineRoot.xyz );
vec3 spineInGrid = uGridOrigin + uGridBasis * ( vec3( spineSlot.xy, 0.0 ) + spineUpright );
transformed = mix( transformed, spineInGrid, spineMix );
`;

/**
 * Following a dendrite: how far behind and above the camera rides and how far ahead it looks, µm, each so much and so
 * many of the dendrite's radii there (it is thick by the soma, thin at its tips); how fast it goes, µm/s.
 */
const FOLLOW = {
  back: [3, 2.5],
  above: [1.6, 2.2],
  ahead: [6, 2],
  speed: 9,
  rampMs: 2500,
  upMs: 1200,
};
/** Ctrl- or Option-dragging turns the view round the point under the pointer: radians per pixel, as OrbitControls. */
const PIVOT_TURN = (2 * Math.PI) / 1000;
/** How near the pointer's ray a point of the cell must pass to be the pivot, CSS pixels; and the pivot's dot. */
const PIVOT_PICK_PX = 10;
const PIVOT_DOT_PX = 5;

/** The cinematic tour's glides from shot to shot, ms. */
const CINEMA_GLIDE_MS = 3600;

export type TourKind = 'follow' | 'cinematic';

/** What a fly-through is showing, for the controls to say. */
export interface TourState {
  kind: TourKind;
  label: string;
}

/** A shot of the cinematic tour: where it looks, from how far, the axis it turns about while held, and for how long. */
interface CinemaShot {
  label: string;
  target: THREE.Vector3;
  direction: THREE.Vector3;
  distance: number;
  up: THREE.Vector3;
  axis: THREE.Vector3;
  /** Radians a second. */
  rate: number;
  holdMs: number;
  /** Sweep the wipe across while it is held. */
  sweep?: boolean;
}

type Tour =
  | {
      kind: 'follow';
      path: DendritePath;
      start: number;
      upFrom: THREE.Vector3;
      done: number | null;
    }
  | {
      kind: 'cinematic';
      shots: CinemaShot[];
      start: number;
      from: {
        target: THREE.Vector3;
        direction: THREE.Vector3;
        distance: number;
        up: THREE.Vector3;
      };
      shown: number;
    };

/** A block of the grid's label, and where it is on the canvas, CSS pixels; null while the grid is not shown. */
export interface GridLabel {
  block: GridBlock;
  x: number;
  y: number;
}

/** How many of the largest spines "Next spine" goes round. */
const SHOWCASE = 60;

/**
 * What is on show: the EM mesh (opaque; as glass, its rims bright; laid over the rest as a veil; or not at all), the
 * skeleton and its soma, the spines.
 */
export interface SpinyLayers {
  mesh: MeshMode;
  skeleton: boolean;
  spines: boolean;
}

export type MeshMode = 'solid' | 'glass' | 'overlay' | 'off';

/**
 * See-through, as a cell's membrane is drawn over what is inside it: faces seen head on nearly clear, and the rims,
 * where the line of sight grazes the surface, bright.
 */
function glassMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: '#dbe6f3',
    roughness: 0.3,
    metalness: 0,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return addShaderHook(m, 'spiny-glass', (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      /* glsl */ `float glassRim = pow( 1.0 - abs( dot( normal, geometryViewDir ) ), 2.2 );
	gl_FragColor = vec4( outgoingLight * ( 0.5 + 0.9 * glassRim ), diffuseColor.a * ( 0.04 + 0.62 * glassRim ) );`
    );
  });
}

interface Stance {
  target: THREE.Vector3;
  /** A unit vector from the target to the camera. */
  direction: THREE.Vector3;
  distance: number;
  /** The orthographic camera's zoom; ignored in perspective. */
  zoom: number;
}

const smooth = (u: number) => u * u * (3 - 2 * u);

/**
 * The spines "Next spine" goes round: typical ones, neither stubs nor the few huge pieces segmentation can leave (flat
 * sheets of membrane), 1 to 3.5 µm long and between the middle and the 95th percentile of the spines' sizes, the
 * largest of them first, spread over the cell as the table's order is.
 */
function showcaseOf(spines: SpinyData['spines']): number[] {
  const n = spines.vertexStart.length - 1;
  const size = (i: number) => spines.vertexStart[i + 1] - spines.vertexStart[i];
  const sizes = Array.from({ length: n }, (_, i) => size(i)).sort((a, b) => a - b);
  const [lo, hi] = [sizes[Math.floor(0.5 * (n - 1))], sizes[Math.floor(0.95 * (n - 1))]];
  const fit = Array.from({ length: n }, (_, i) => i).filter(
    (i) => spines.length[i] >= 1 && spines.length[i] <= 3.5 && size(i) >= lo && size(i) <= hi
  );
  const step = Math.max(1, Math.floor(fit.length / SHOWCASE));
  return fit.filter((_, k) => k % step === 0).slice(0, SHOWCASE);
}

/**
 * A skeletonization's output on the EM mesh it was made from: the mesh, loaded and drawn by the EM viewer as on its own
 * page (a stand-in at once, the full mesh as it comes up, the stand-in again where that is too slow), with the spiny
 * morphology's skeleton, soma and spines in the same frame. The spiny H5 is in the mesh's own frame, µm; the EM viewer
 * recentres the mesh on its box's centre, so the morphology is moved by as much (`setCentre`).
 *
 * A wipe across the view keeps the mesh left of a line and the skeleton and spines right of it, to compare them; with
 * it off, the spines are drawn just in front of the membrane they were cut from. The camera can fly to a spine.
 */
export class SpinyComparisonViewer extends EmMeshViewer {
  private morphology = new THREE.Group();
  private skeletonMesh: THREE.Mesh | null = null;
  private somaMesh: THREE.Mesh | null = null;
  private spineMesh: THREE.Mesh | null = null;
  private spineColour: THREE.BufferAttribute | null = null;
  private data: SpinyData | null = null;
  private centre: Vec3 | null = null;
  private layers: SpinyLayers = { mesh: 'solid', skeleton: true, spines: true };
  private glass = glassMaterial();
  private overlayOpacity = { value: OVERLAY_OPACITY };
  private overlay = overlayMaterial(this.overlayOpacity);
  private colouring: SpineColouring = 'each';
  private wipe = { on: true, x: 0.5 };
  private keepLeft = KEEP_ALL.clone();
  private keepRight = KEEP_ALL.clone();
  private ownGeometries: THREE.BufferGeometry[] = [];
  private ownMaterials: THREE.Material[] = [];
  private fly: { from: Stance; to: Stance; start: number } | null = null;
  private showcase: number[] = [];
  private showcaseAt = -1;
  private wipeListeners = new Set<(x: number) => void>();
  /** The grid: its layout, where it is (its centre and axes, in the file's frame), and how far the spines have got. */
  private grid: {
    blocks: GridBlock[];
    size: { width: number; height: number };
    on: boolean;
    value: number;
    from: number;
    start: number;
    origin: THREE.Vector3;
    basis: THREE.Matrix3;
  } | null = null;
  private gridUniforms = {
    uSpineData: { value: null as THREE.DataTexture | null },
    uGrid: { value: 0 },
    uGridOrigin: { value: new THREE.Vector3() },
    uGridBasis: { value: new THREE.Matrix3() },
  };
  private gridLabelListeners = new Set<(labels: GridLabel[] | null) => void>();
  private tour: Tour | null = null;
  /** The projection and spin from before the fly-through, given back after it. */
  private beforeTour: { perspective: boolean; spin: boolean } | null = null;
  private paths: DendritePath[] | null = null;
  private pathAt = -1;
  private tourListeners = new Set<(state: TourState | null) => void>();
  /** The cell's points a pivot is picked from, in the scene: the skeleton's, and each spine's root and tip. */
  private pickPoints: Float32Array | null = null;
  /** A Ctrl- or Option-drag under way: its pointer, where it last was, and the point it turns about. */
  private pivotDrag: { pointer: number; x: number; y: number; pivot: THREE.Vector3 } | null = null;
  private pivotDot: THREE.Mesh | null = null;
  private gridLabelsKey = '';

  constructor(container: HTMLElement) {
    super(container);
    this.renderer.localClippingEnabled = true;
    this.morphology.name = 'spiny morphology';
    this.morphology.visible = false;
    this.surfaces.add(this.morphology);
    this.applyLook();
    // a drag takes the camera back from a fly-through
    this.controls.addEventListener('start', this.onGrab);
    // before OrbitControls, which would pan on a Ctrl-drag
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPivotDown, { capture: true });
    canvas.addEventListener('pointermove', this.onPivotMove, { capture: true });
    canvas.addEventListener('pointerup', this.onPivotUp, { capture: true });
    canvas.addEventListener('pointercancel', this.onPivotUp, { capture: true });
    canvas.addEventListener('contextmenu', this.onPivotMenu, { capture: true });
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#fbbf24', depthTest: false, toneMapped: false })
    );
    dot.renderOrder = 10;
    dot.visible = false;
    this.pivotDot = dot;
    this.scene.add(dot);
  }

  /** The scene's point under the pointer: the nearest of the cell's points to its ray, or where it crosses the target's depth. */
  private pickPivot(clientX: number, clientY: number): THREE.Vector3 {
    const canvas = this.renderer.domElement;
    const box = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - box.left) / box.width) * 2 - 1,
      -((clientY - box.top) / box.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const { origin, direction } = ray.ray;
    const px = this.pixelAt(this.controls.target);
    const points = this.grid?.on ? null : this.pickPoints;
    let best: THREE.Vector3 | null = null;
    let bestDepth = Infinity;
    if (points) {
      const p = new THREE.Vector3();
      const perspective = this.camera instanceof THREE.PerspectiveCamera;
      const atTarget = this.camera.position.distanceTo(this.controls.target);
      for (let i = 0; i < points.length; i += 3) {
        p.set(points[i], points[i + 1], points[i + 2]);
        const depth = p.clone().sub(origin).dot(direction);
        if (depth <= 0) continue;
        // a pixel's size at that depth: the same everywhere in orthographic
        const tolerance = PIVOT_PICK_PX * px * (perspective ? depth / atTarget : 1);
        const off = ray.ray.distanceSqToPoint(p);
        if (off < tolerance * tolerance && depth < bestDepth) {
          bestDepth = depth;
          best = p.clone();
        }
      }
    }
    if (best) return best;
    // nothing of the cell there: the point on the ray as deep as the target
    const depth = this.controls.target.clone().sub(origin).dot(direction);
    return origin.clone().addScaledVector(direction, Math.max(0, depth));
  }

  /** µm per CSS pixel at a point of the scene. */
  private pixelAt(p: THREE.Vector3): number {
    const camera = this.camera;
    const h = Math.max(1, this.container.clientHeight);
    if (camera instanceof THREE.PerspectiveCamera) {
      const d = p.clone().sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3()));
      return (2 * Math.max(d, 1e-3) * Math.tan((camera.fov * Math.PI) / 360)) / h;
    }
    const o = camera as THREE.OrthographicCamera;
    return (o.top - o.bottom) / o.zoom / h;
  }

  private onPivotDown = (e: PointerEvent): void => {
    if (e.button !== 0 || !(e.ctrlKey || e.altKey)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    this.stopTour();
    this.fly = null;
    stopGlide(this.controls);
    const pivot = this.pickPivot(e.clientX, e.clientY);
    this.pivotDrag = { pointer: e.pointerId, x: e.clientX, y: e.clientY, pivot };
    try {
      this.renderer.domElement.setPointerCapture(e.pointerId);
    } catch {
      // a pointer no longer down: the drag still works over the canvas
    }
    this.showPivot(pivot);
  };

  private onPivotMove = (e: PointerEvent): void => {
    const drag = this.pivotDrag;
    if (!drag || drag.pointer !== e.pointerId) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const [dx, dy] = [e.clientX - drag.x, e.clientY - drag.y];
    drag.x = e.clientX;
    drag.y = e.clientY;
    const camera = this.camera;
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const turn = new THREE.Quaternion()
      .setFromAxisAngle(right, -dy * PIVOT_TURN)
      .multiply(new THREE.Quaternion().setFromAxisAngle(up, -dx * PIVOT_TURN));
    // the camera, its target and its orientation turned together about the pivot
    for (const v of [camera.position, this.controls.target])
      v.sub(drag.pivot).applyQuaternion(turn).add(drag.pivot);
    camera.quaternion.premultiply(turn);
    camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion));
    camera.updateMatrixWorld();
    // as OrbitControls tells of a move: the frame is drawn as a moving one, and the view's listeners hear of it
    this.controls.dispatchEvent({ type: 'change' });
    this.invalidate();
  };

  private onPivotUp = (e: PointerEvent): void => {
    const drag = this.pivotDrag;
    if (!drag || drag.pointer !== e.pointerId) return;
    this.pivotDrag = null;
    followScreenUp(this.controls);
    this.controls.update();
    if (this.pivotDot) this.pivotDot.visible = false;
    this.invalidate();
  };

  /** On a Mac, Ctrl-click is a right click: not while it turns the view. */
  private onPivotMenu = (e: MouseEvent): void => {
    if (e.ctrlKey) e.preventDefault();
  };

  private showPivot(p: THREE.Vector3): void {
    const dot = this.pivotDot;
    if (!dot) return;
    dot.position.copy(p);
    dot.scale.setScalar(PIVOT_DOT_PX * this.pixelAt(p));
    dot.visible = true;
    this.invalidate();
  }

  /** The skeleton's points, and each spine's root and tip, in the scene, for picking a pivot. */
  private makePickPoints(): void {
    const data = this.data;
    const c = this.centre;
    if (!data || !c) return;
    const sp = data.sectionPoints;
    const s = data.spines;
    const nSkeleton = sp.length / 4;
    const nSpines = s.length.length;
    const out = new Float32Array(3 * (nSkeleton + 2 * nSpines));
    let o = 0;
    for (let i = 0; i < nSkeleton; i++, o += 3) {
      out[o] = sp[4 * i] - c[0];
      out[o + 1] = sp[4 * i + 1] - c[1];
      out[o + 2] = sp[4 * i + 2] - c[2];
    }
    for (let i = 0; i < nSpines; i++) {
      for (const along of [0, s.length[i]]) {
        for (let a = 0; a < 3; a++)
          out[o + a] = s.root[3 * i + a] + along * s.direction[3 * i + a] - c[a];
        o += 3;
      }
    }
    this.pickPoints = out;
  }

  private onGrab = (): void => {
    if (this.tour) this.stopTour();
  };

  protected override disposeContent(): void {
    super.disposeContent();
    for (const g of this.ownGeometries) g.dispose();
    for (const m of this.ownMaterials) m.dispose();
    this.glass.dispose();
    this.overlay.dispose();
    this.ownGeometries = [];
    this.ownMaterials = [];
    this.wipeListeners.clear();
    this.gridUniforms.uSpineData.value?.dispose();
    this.gridLabelListeners.clear();
    this.controls.removeEventListener('start', this.onGrab);
    this.tourListeners.clear();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPivotDown, { capture: true });
    canvas.removeEventListener('pointermove', this.onPivotMove, { capture: true });
    canvas.removeEventListener('pointerup', this.onPivotUp, { capture: true });
    canvas.removeEventListener('pointercancel', this.onPivotUp, { capture: true });
    canvas.removeEventListener('contextmenu', this.onPivotMenu, { capture: true });
    this.pivotDot?.geometry.dispose();
    (this.pivotDot?.material as THREE.Material | undefined)?.dispose();
  }

  // ---------------------------------------------------------------------------
  // Content

  /** Where the EM viewer put its origin, in the file's frame, µm: the morphology is moved by as much. */
  setCentre(centre: Vec3): void {
    this.centre = centre;
    this.morphology.position.set(-centre[0], -centre[1], -centre[2]);
    this.morphology.visible = this.data !== null;
    this.morphology.updateMatrixWorld();
    this.makePickPoints();
    this.invalidate();
  }

  private material<T extends THREE.Material>(m: T): T {
    m.clippingPlanes = [this.keepRight];
    this.ownMaterials.push(m);
    return m;
  }

  private geometry(
    positions: Float32Array,
    indices: Uint32Array,
    normals: Int8Array | null,
    colours: Uint8Array | null
  ): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (normals) g.setAttribute('normal', new THREE.BufferAttribute(normals, 3, true));
    if (colours) g.setAttribute('color', new THREE.BufferAttribute(colours, 3, true));
    g.setIndex(new THREE.BufferAttribute(indices, 1));
    if (!normals) g.computeVertexNormals();
    g.computeBoundingSphere();
    this.ownGeometries.push(g);
    return g;
  }

  /** Put the spiny morphology in the scene: the skeleton by SWC type, the soma, and the spines each in a colour. */
  setSpiny(data: SpinyData): void {
    this.data = data;
    const { skeleton, soma, spines } = data;

    const skeletonColours = new Uint8Array(skeleton.positions.length);
    paintSkeleton(skeletonColours, skeleton.types);
    this.skeletonMesh = new THREE.Mesh(
      this.geometry(skeleton.positions, skeleton.indices, skeleton.normals, skeletonColours),
      this.material(
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0 })
      )
    );
    this.skeletonMesh.name = 'skeleton';

    if (soma) {
      this.somaMesh = new THREE.Mesh(
        this.geometry(soma.positions, soma.indices, null, null),
        this.material(
          new THREE.MeshStandardMaterial({
            color: TYPE_COLOURS[1],
            roughness: 0.5,
            metalness: 0,
            side: THREE.DoubleSide,
          })
        )
      );
      this.somaMesh.name = 'soma';
    }

    const spineColours = new Uint8Array(spines.positions.length);
    paintSpines(spineColours, spines, this.colouring);
    const spineGeometry = this.geometry(
      spines.positions,
      spines.indices,
      spines.normals,
      spineColours
    );
    this.spineColour = spineGeometry.getAttribute('color') as THREE.BufferAttribute;
    spineGeometry.setAttribute('spineIndex', spineIndexAttribute(spines.vertexStart));
    this.setGridData(data);
    const uniforms = this.gridUniforms;
    const spineMaterial = addShaderHook(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.35,
        metalness: 0,
        side: THREE.DoubleSide,
        // in front of the membrane they were cut from, where the two lie on each other
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -8,
      }),
      'spiny-grid',
      (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>\n${GRID_DECLARATIONS}`)
          .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${GRID_NORMAL}`)
          .replace('#include <begin_vertex>', `#include <begin_vertex>\n${GRID_POSITION}`);
      }
    );
    this.spineMesh = new THREE.Mesh(spineGeometry, this.material(spineMaterial));
    this.spineMesh.name = 'spines';
    // moved in the vertex shader to the grid, out of the box three would cull them by
    this.spineMesh.frustumCulled = false;

    this.morphology.add(
      ...[this.skeletonMesh, this.somaMesh, this.spineMesh].filter((m): m is THREE.Mesh => !!m)
    );
    this.morphology.visible = this.centre !== null;
    this.makePickPoints();
    this.showcase = showcaseOf(spines);
    this.showcaseAt = -1;
    this.applyLayers();
  }

  /** Each spine's root, rotation and slot in the grid, three texels a spine, for the vertex shader. */
  private setGridData(data: SpinyData): void {
    const s = data.spines;
    const n = s.vertexStart.length - 1;
    const layout = gridLayout(s, data.sectionTypes);
    const height = Math.max(1, Math.ceil((3 * n) / DATA_WIDTH));
    const texels = new Float32Array(4 * DATA_WIDTH * height);
    for (let i = 0; i < n; i++) {
      const at = 12 * i;
      texels.set(s.root.subarray(3 * i, 3 * i + 3), at);
      texels.set(s.rotation.subarray(4 * i, 4 * i + 4), at + 4);
      texels[at + 8] = layout.slots[2 * i];
      texels[at + 9] = layout.slots[2 * i + 1];
      texels[at + 10] = layout.order[i];
    }
    const texture = new THREE.DataTexture(
      texels,
      DATA_WIDTH,
      height,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.minFilter = texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    this.gridUniforms.uSpineData.value?.dispose();
    this.gridUniforms.uSpineData.value = texture;
    this.grid = {
      blocks: layout.blocks,
      size: { width: layout.width, height: layout.height },
      on: false,
      value: 0,
      from: 0,
      start: 0,
      origin: new THREE.Vector3(),
      basis: new THREE.Matrix3(),
    };
  }

  /**
   * The spines to their grid, laid out facing the camera where it looks, and the camera back to take it in; or back
   * onto the cell. The mesh and the skeleton give way while the grid is shown.
   */
  setGrid(on: boolean): void {
    this.stopTour();
    const g = this.grid;
    const c = this.centre;
    if (!g || !c || g.on === on) return;
    if (on) {
      const camera = this.camera;
      camera.updateMatrixWorld();
      const e = camera.matrixWorld.elements;
      g.basis.set(e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10]);
      g.origin.copy(this.controls.target).add(new THREE.Vector3(...c));
      this.gridUniforms.uGridBasis.value.copy(g.basis);
      this.gridUniforms.uGridOrigin.value.copy(g.origin);
      const from = this.stance();
      const radius = 0.55 * Math.max(g.size.width, g.size.height * 1.6);
      this.flyTo({ ...from, ...this.reachFor(radius) });
    } else {
      this.home();
    }
    g.on = on;
    g.from = g.value;
    g.start = performance.now();
    if (reducedMotion()) {
      g.value = on ? 1 : 0;
      this.gridUniforms.uGrid.value = g.value;
    }
    this.applyLayers();
  }

  get gridShown(): boolean {
    return this.grid?.on ?? false;
  }

  /** Where the grid's blocks' labels are on the canvas, as the view moves, while the grid is shown; null otherwise. */
  onGridLabels(listener: (labels: GridLabel[] | null) => void): () => void {
    this.gridLabelListeners.add(listener);
    this.gridLabelsKey = '';
    this.invalidate();
    return () => {
      this.gridLabelListeners.delete(listener);
    };
  }

  // ---------------------------------------------------------------------------
  // View options

  setLayers(layers: SpinyLayers): void {
    this.layers = layers;
    this.applyLayers();
  }

  /** The layers on show: as chosen, but with the spines alone while they are in their grid. */
  private shownLayers(): SpinyLayers {
    return this.grid?.on ? { mesh: 'off', skeleton: false, spines: true } : this.layers;
  }

  private applyLayers(): void {
    const l = this.shownLayers();
    this.meshVisible = l.mesh !== 'off';
    this.chunks.visible = l.mesh !== 'off';
    if (this.skeletonMesh) this.skeletonMesh.visible = l.skeleton;
    if (this.somaMesh) this.somaMesh.visible = l.skeleton;
    if (this.spineMesh) this.spineMesh.visible = l.spines;
    this.applyLook();
  }

  /** How see-through the overlaid mesh is, 0 (not at all there) to 1 (all but opaque). */
  setOverlayOpacity(opacity: number): void {
    this.overlayOpacity.value = Math.min(1, Math.max(0, opacity));
    this.invalidate();
  }

  setSpineColouring(mode: SpineColouring): void {
    this.colouring = mode;
    const c = this.spineColour;
    if (!c || !this.data) return;
    paintSpines(c.array as Uint8Array, this.data.spines, mode);
    c.needsUpdate = true;
    this.invalidate();
  }

  /** The wipe on or off, and where its line is, 0 to 1 across the view. */
  setWipe(on: boolean, x = this.wipe.x): void {
    this.wipe = { on, x: Math.min(1, Math.max(0, x)) };
    for (const listener of this.wipeListeners) listener(this.wipe.x);
    this.invalidate();
  }

  onWipe(listener: (x: number) => void): () => void {
    this.wipeListeners.add(listener);
    listener(this.wipe.x);
    return () => {
      this.wipeListeners.delete(listener);
    };
  }

  /** The look's surface and outline clipped by the wipe, whichever look is chosen. */
  protected override applyLook(): void {
    super.applyLook();
    // called by the base class's constructor, before this one's fields are set
    if (!this.keepLeft) return;
    this.look.material.clippingPlanes = [this.keepLeft];
    if (this.look.outline) this.look.outline.clippingPlanes = [this.keepLeft];
    this.glass.clippingPlanes = [this.keepLeft];
    const mode = this.shownLayers().mesh;
    if (mode !== 'glass' && mode !== 'overlay') return;
    // see-through: the chunks the look painted, drawn as glass or as a veil instead, without their outline
    const material = mode === 'glass' ? this.glass : this.overlay;
    this.chunks.traverse((o) => {
      if (o instanceof THREE.Mesh) o.material = material;
    });
    this.outlines.visible = false;
  }

  /** The stand-in's chunks are made with the look's material: as glass, where the mesh is. */
  override setStandIn(standIn: StandIn): void {
    super.setStandIn(standIn);
    this.applyLook();
  }

  /**
   * The wipe's planes, through the eye and the line across the view: the mesh kept left of it, the morphology right of
   * it. Without the wipe, or without both to compare, they keep everything.
   */
  protected override beforeDraw(moving: boolean): void {
    super.beforeDraw(moving);
    const l = this.shownLayers();
    // the overlay lies over everything: there is nothing to wipe
    if (!this.wipe.on || l.mesh === 'off' || l.mesh === 'overlay' || !(l.skeleton || l.spines)) {
      this.keepLeft.copy(KEEP_ALL);
      this.keepRight.copy(KEEP_ALL);
      return;
    }
    const camera = this.camera;
    camera.updateMatrixWorld();
    const x = 2 * this.wipe.x - 1;
    const a = new THREE.Vector3(x, -1, 0.2).unproject(camera);
    const b = new THREE.Vector3(x, 1, 0.2).unproject(camera);
    const c = new THREE.Vector3(x, 0, 0.8).unproject(camera);
    this.keepRight.setFromCoplanarPoints(a, b, c);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    if (this.keepRight.normal.dot(right) < 0) this.keepRight.negate();
    this.keepLeft.copy(this.keepRight).negate();
  }

  // ---------------------------------------------------------------------------
  // Camera

  /** The range of the spines' lengths, and how far from the soma the farthest sits, µm: for the legend. */
  get spineRanges(): { length: [number, number]; distance: number } | null {
    const s = this.data?.spines;
    return s ? { length: lengthRange(s.length), distance: distanceReach(s) } : null;
  }

  get spineCount(): number {
    return this.data ? this.data.spines.vertexStart.length - 1 : 0;
  }

  /** Fly to the next of the largest spines, seen side on, with a little of its dendrite round it. */
  nextSpine(): number | null {
    this.stopTour();
    if (this.showcase.length === 0) return null;
    this.showcaseAt = (this.showcaseAt + 1) % this.showcase.length;
    const spine = this.showcase[this.showcaseAt];
    this.flyToSpine(spine);
    return spine;
  }

  flyToSpine(i: number): void {
    const s = this.data?.spines;
    const c = this.centre;
    if (!s || !c) return;
    const v3 = (a: Float32Array) => new THREE.Vector3(a[3 * i], a[3 * i + 1], a[3 * i + 2]);
    const along = v3(s.direction).normalize();
    const length = Math.max(0.5, s.length[i]);
    const target = v3(s.root)
      .addScaledVector(along, length / 2)
      .sub(new THREE.Vector3(...c));
    const radius = Math.max(3, 1.4 * length + 1.5);
    // side on: the way the camera looks now, less its part along the spine
    const from = this.stance();
    const side = from.direction.clone().addScaledVector(along, -from.direction.dot(along));
    if (side.lengthSq() < 0.04) side.copy(new THREE.Vector3(0, 0, 1).cross(along));
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    this.flyTo({ target, direction: side, ...this.reachFor(radius) });
  }

  /** Back to the whole cell. */
  home(): void {
    this.stopTour();
    const from = this.stance();
    this.resetView();
    const to = this.stance();
    this.place(from);
    this.flyTo(to);
  }

  private reachFor(radius: number): { distance: number; zoom: number } {
    const camera = this.camera;
    if (camera instanceof THREE.PerspectiveCamera) {
      const half = (camera.fov * Math.PI) / 360;
      const aspect = Math.max(0.2, camera.aspect);
      const fit = Math.min(Math.tan(half), Math.tan(half) * aspect);
      return { distance: radius / fit, zoom: 1 };
    }
    const o = camera as THREE.OrthographicCamera;
    const half = Math.min(o.top, o.right);
    // the camera stays outside the cell; the zoom does the framing
    return { distance: this.camera.position.distanceTo(this.controls.target), zoom: half / radius };
  }

  private stance(): Stance {
    const camera = this.camera;
    const target = this.controls.target.clone();
    const offset = camera.position.clone().sub(target);
    return {
      target,
      direction: offset.clone().normalize(),
      distance: offset.length(),
      zoom: camera instanceof THREE.OrthographicCamera ? camera.zoom : 1,
    };
  }

  private place(s: Stance): void {
    const camera = this.camera;
    this.controls.target.copy(s.target);
    camera.position.copy(s.target).addScaledVector(s.direction, s.distance);
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = s.zoom;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(s.target);
    camera.updateMatrixWorld();
    followScreenUp(this.controls);
    stopGlide(this.controls);
  }

  private flyTo(to: Stance): void {
    this.setSpin(false);
    this.fly = { from: this.stance(), to, start: performance.now() };
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      this.fly = null;
      this.place(to);
    }
    this.invalidate();
  }

  protected override work(moving: boolean): boolean {
    const busy = super.work(moving);
    const gridding = this.stepGrid();
    const touring = this.stepTour();
    const f = this.fly;
    if (!f) return busy || gridding || touring;
    const u = Math.min(1, (performance.now() - f.start) / FLY_MS);
    const e = smooth(u);
    const direction = f.from.direction.clone().lerp(f.to.direction, e);
    if (direction.lengthSq() < 1e-8) direction.copy(f.to.direction);
    this.place({
      target: f.from.target.clone().lerp(f.to.target, e),
      direction: direction.normalize(),
      distance: f.from.distance * (f.to.distance / f.from.distance) ** e,
      zoom: f.from.zoom * (f.to.zoom / f.from.zoom) ** e,
    });
    if (u >= 1) this.fly = null;
    this.invalidate();
    return true;
  }

  // ---------------------------------------------------------------------------
  // Fly-throughs

  get touring(): TourKind | null {
    return this.tour?.kind ?? null;
  }

  /** What the fly-through is showing, as it changes, and null once it has stopped. */
  onTour(listener: (state: TourState | null) => void): () => void {
    this.tourListeners.add(listener);
    return () => {
      this.tourListeners.delete(listener);
    };
  }

  private tellTour(state: TourState | null): void {
    for (const listener of this.tourListeners) listener(state);
  }

  /** In perspective, as a fly-through needs, without spinning: what it was is given back after. */
  private beginTour(): void {
    if (this.beforeTour) return;
    const perspective = this.camera instanceof THREE.PerspectiveCamera;
    this.beforeTour = { perspective, spin: this.controls.autoRotate };
    if (!perspective) this.setProjection('perspective');
    this.setSpin(false);
  }

  stopTour(): void {
    if (!this.tour) return;
    this.tour = null;
    this.fly = null;
    const before = this.beforeTour;
    this.beforeTour = null;
    followScreenUp(this.controls);
    if (before && !before.perspective) this.setProjection('orthographic');
    if (before?.spin) this.setSpin(true);
    this.tellTour(null);
    this.invalidate();
  }

  /** The screen's up, in the scene. */
  private screenUp(): THREE.Vector3 {
    return new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion).normalize();
  }

  private toWorld(p: Vec3): THREE.Vector3 {
    const c = this.centre ?? [0, 0, 0];
    return new THREE.Vector3(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
  }

  /** Where the chase camera is `s` µm along a path: behind and above it, looking ahead along it. */
  private chaseAt(path: DendritePath, s: number) {
    const { point, tangent, up, radius } = alongPath(path, s);
    const p = this.toWorld(point);
    const t = new THREE.Vector3(...tangent);
    const u = new THREE.Vector3(...up);
    const r = Math.max(0.2, radius);
    const by = ([um, radii]: number[]) => um + radii * r;
    return {
      position: p.clone().addScaledVector(t, -by(FOLLOW.back)).addScaledVector(u, by(FOLLOW.above)),
      target: p.clone().addScaledVector(t, by(FOLLOW.ahead)),
      up: u,
    };
  }

  /**
   * Ride out along a dendrite from the soma to its tip, the spiniest first and the next on each call: the camera glides
   * to its start, then follows it, behind and a little above, looking ahead.
   */
  startFollow(): TourState | null {
    if (!this.data || !this.centre || this.grid?.on || reducedMotion()) return null;
    this.stopTour();
    this.paths ??= dendritePaths(this.data, this.screenUp().toArray() as Vec3);
    if (this.paths.length === 0) return null;
    this.pathAt = (this.pathAt + 1) % this.paths.length;
    const path = this.paths[this.pathAt];
    this.beginTour();
    const start = this.chaseAt(path, 0);
    const offset = start.position.clone().sub(start.target);
    this.flyTo({
      target: start.target,
      direction: offset.clone().normalize(),
      distance: offset.length(),
      zoom: 1,
    });
    this.tour = {
      kind: 'follow',
      path,
      start: performance.now() + FLY_MS,
      upFrom: this.camera.up.clone(),
      done: null,
    };
    const state: TourState = {
      kind: 'follow',
      label: `Following a dendrite: ${Math.round(path.length)} µm, ${path.spines.toLocaleString('en-GB')} spines, ${path.sections.length} sections`,
    };
    this.tellTour(state);
    return state;
  }

  /** The cinematic tour's shots: the whole cell, the soma, along a dendrite, two spines close up, the whole again. */
  private cinemaShots(): CinemaShot[] {
    const data = this.data as SpinyData;
    const up0 = this.screenUp();
    const here = this.stance();
    this.resetView();
    const whole = this.stance();
    this.place(here);
    const turned = (v: THREE.Vector3, angle: number) =>
      new THREE.Vector3(...turnAbout(v.toArray() as Vec3, up0.toArray() as Vec3, angle));
    const shots: CinemaShot[] = [
      {
        label: 'The whole cell',
        target: whole.target,
        direction: whole.direction,
        distance: whole.distance,
        up: up0,
        axis: up0,
        rate: 0.12,
        holdMs: 6500,
        sweep: true,
      },
    ];
    // the soma: the centre of its mesh, or of the skeleton's first section
    const soma = data.soma?.positions ?? data.sectionPoints.subarray(0, 4 * data.pointStart[1]);
    const stride = data.soma ? 3 : 4;
    const centre: Vec3 = [0, 0, 0];
    for (let i = 0; i < soma.length; i += stride)
      for (let a = 0; a < 3; a++) centre[a] += soma[i + a];
    for (let a = 0; a < 3; a++) centre[a] /= Math.max(1, soma.length / stride);
    shots.push({
      label: 'The soma',
      target: this.toWorld(centre),
      direction: turned(whole.direction, 0.8),
      distance: this.reachFor(24).distance,
      up: up0,
      axis: up0,
      rate: 0.16,
      holdMs: 5000,
    });
    this.paths ??= dendritePaths(data, up0.toArray() as Vec3);
    const path = this.paths[0];
    if (path) {
      const { point, tangent } = alongPath(path, 0.45 * path.length);
      const t = new THREE.Vector3(...tangent);
      const side = up0.clone().cross(t).normalize();
      shots.push({
        label: 'Along a dendrite',
        target: this.toWorld(point),
        direction: side.lengthSq() > 0.1 ? side : turned(whole.direction, 1.6),
        distance: this.reachFor(9).distance,
        up: up0,
        axis: t,
        rate: 0.14,
        holdMs: 5500,
      });
    }
    const showcase = this.showcase;
    const s = data.spines;
    for (const [k, label] of [
      [0, 'A spine close up'],
      [Math.floor(showcase.length / 2), 'Another spine'],
    ] as const) {
      const i = showcase[k];
      if (i === undefined) continue;
      const along = new THREE.Vector3(...s.direction.subarray(3 * i, 3 * i + 3)).normalize();
      const length = Math.max(0.5, s.length[i]);
      const target = this.toWorld(
        s.root.subarray(3 * i, 3 * i + 3) as unknown as Vec3
      ).addScaledVector(along, length / 2);
      const prev = shots[shots.length - 1].direction;
      const side = prev.clone().addScaledVector(along, -prev.dot(along));
      if (side.lengthSq() < 0.04) side.copy(new THREE.Vector3(0, 0, 1).cross(along));
      shots.push({
        label,
        target,
        direction: side.normalize(),
        distance: this.reachFor(1.4 * length + 1.5).distance,
        up: along,
        axis: along,
        rate: 0.32,
        holdMs: 6000,
      });
    }
    shots.push({
      label: 'The whole cell',
      target: whole.target,
      direction: turned(whole.direction, 2.4),
      distance: whole.distance,
      up: up0,
      axis: up0,
      rate: 0.12,
      holdMs: 5500,
    });
    return shots;
  }

  /** A tour of about a minute: shot after shot, each held while the camera turns slowly round it, glided between. */
  startCinematic(): TourState | null {
    if (!this.data || !this.centre || this.grid?.on || reducedMotion()) return null;
    this.stopTour();
    this.beginTour();
    const shots = this.cinemaShots();
    const here = this.stance();
    this.tour = {
      kind: 'cinematic',
      shots,
      start: performance.now(),
      from: { ...here, up: this.camera.up.clone() },
      shown: -1,
    };
    const state: TourState = { kind: 'cinematic', label: `Cinematic: ${shots[0].label}` };
    this.tellTour(state);
    return state;
  }

  /** Put the camera at `position`, looking at `target`, `up` its up, without OrbitControls' glide. */
  private aim(position: THREE.Vector3, target: THREE.Vector3, up: THREE.Vector3): void {
    const camera = this.camera;
    this.controls.target.copy(target);
    camera.position.copy(position);
    camera.up.copy(up).normalize();
    camera.lookAt(target);
    camera.updateMatrixWorld();
    stopGlide(this.controls);
  }

  /** The fly-through a step on; false when there is none. */
  private stepTour(): boolean {
    const tour = this.tour;
    if (!tour) return false;
    const now = performance.now();
    if (tour.kind === 'follow') {
      if (this.fly || now < tour.start) return true;
      const t = now - tour.start;
      const { speed, rampMs } = FOLLOW;
      // eased in, then at speed
      const s =
        t < rampMs ? (speed * t * t) / (2 * rampMs * 1000) : (speed * (t - rampMs / 2)) / 1000;
      const end = tour.path.length - FOLLOW.ahead[0];
      const chase = this.chaseAt(tour.path, Math.min(s, end));
      const blend = smooth(Math.min(1, t / FOLLOW.upMs));
      const up = tour.upFrom.clone().lerp(chase.up, blend).normalize();
      this.aim(chase.position, chase.target, up);
      if (s >= end) {
        tour.done ??= now;
        if (now - tour.done > 1500) this.stopTour();
      }
      this.invalidate();
      return true;
    }
    // the cinematic tour: glide to each shot, then hold it, turning
    let t = now - tour.start;
    let from = tour.from;
    for (let k = 0; k < tour.shots.length; k++) {
      const shot = tour.shots[k];
      if (k !== tour.shown && t < CINEMA_GLIDE_MS + shot.holdMs) {
        tour.shown = k;
        this.tellTour({ kind: 'cinematic', label: `Cinematic: ${shot.label}` });
      }
      if (t < CINEMA_GLIDE_MS) {
        const u = t / CINEMA_GLIDE_MS;
        const e = u * u * u * (u * (6 * u - 15) + 10);
        const direction = new THREE.Vector3(
          ...slerpDirection(from.direction.toArray() as Vec3, shot.direction.toArray() as Vec3, e)
        );
        const target = from.target.clone().lerp(shot.target, e);
        const distance = from.distance * (shot.distance / from.distance) ** e;
        const up = from.up.clone().lerp(shot.up, e).normalize();
        this.aim(target.clone().addScaledVector(direction, distance), target, up);
        this.invalidate();
        return true;
      }
      t -= CINEMA_GLIDE_MS;
      if (t < shot.holdMs) {
        const turn = shot.rate * (t / 1000);
        const direction = new THREE.Vector3(
          ...turnAbout(shot.direction.toArray() as Vec3, shot.axis.toArray() as Vec3, turn)
        );
        const up = new THREE.Vector3(
          ...turnAbout(shot.up.toArray() as Vec3, shot.axis.toArray() as Vec3, turn)
        );
        this.aim(shot.target.clone().addScaledVector(direction, shot.distance), shot.target, up);
        if (shot.sweep && this.wipe.on) {
          // across and back, to show the skeleton and spines under the membrane
          const u = t / shot.holdMs;
          const x = u < 0.5 ? 0.85 - 1.4 * smooth(u / 0.5) : 0.15 + 0.35 * smooth((u - 0.5) / 0.5);
          this.wipe.x = x;
          for (const listener of this.wipeListeners) listener(x);
        }
        this.invalidate();
        return true;
      }
      t -= shot.holdMs;
      const end = turnAbout(
        shot.direction.toArray() as Vec3,
        shot.axis.toArray() as Vec3,
        shot.rate * (shot.holdMs / 1000)
      );
      const endUp = turnAbout(
        shot.up.toArray() as Vec3,
        shot.axis.toArray() as Vec3,
        shot.rate * (shot.holdMs / 1000)
      );
      from = {
        target: shot.target,
        direction: new THREE.Vector3(...end),
        distance: shot.distance,
        up: new THREE.Vector3(...endUp),
      };
    }
    this.stopTour();
    return false;
  }

  /** The spines a step further to their grid or back; false once they are there. */
  private stepGrid(): boolean {
    const g = this.grid;
    if (!g) return false;
    const to = g.on ? 1 : 0;
    if (g.value === to) return false;
    const u = Math.min(1, (performance.now() - g.start) / GRID_MS);
    g.value = g.from + (to - g.from) * u;
    this.gridUniforms.uGrid.value = g.value;
    this.invalidate();
    return true;
  }

  /** The grid's labels, where its blocks are on the canvas, when the view moved. */
  protected override afterDraw(moved: MovingFrame | null): void {
    super.afterDraw(moved);
    if (this.gridLabelListeners.size === 0) return;
    const g = this.grid;
    const c = this.centre;
    const on = !!g && !!c && g.on && g.value > 0.6;
    const camera = this.camera;
    const key = on ? camera.matrixWorld.elements.map((v) => v.toFixed(4)).join(',') : 'off';
    if (key === this.gridLabelsKey) return;
    this.gridLabelsKey = key;
    let labels: GridLabel[] | null = null;
    if (on && g && c) {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      const right = new THREE.Vector3(1, 0, 0).applyMatrix3(g.basis);
      const up = new THREE.Vector3(0, 1, 0).applyMatrix3(g.basis);
      const centre = new THREE.Vector3(...c);
      labels = g.blocks.map((block) => {
        const p = g.origin
          .clone()
          .sub(centre)
          .addScaledVector(right, block.x)
          .addScaledVector(up, block.y + 0.6)
          .project(camera);
        return { block, x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h };
      });
    }
    for (const listener of this.gridLabelListeners) listener(labels);
  }
}

/** Each spine vertex's spine, as a float the vertex shader reads. */
function spineIndexAttribute(vertexStart: Uint32Array): THREE.BufferAttribute {
  const n = vertexStart.length - 1;
  const total = vertexStart[n];
  const values = n < 65536 ? new Uint16Array(total) : new Float32Array(total);
  for (let i = 0; i < n; i++) values.fill(i, vertexStart[i], vertexStart[i + 1]);
  return new THREE.BufferAttribute(values, 1);
}

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
