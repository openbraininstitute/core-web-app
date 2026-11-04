import * as THREE from 'three';

import { addShaderHook } from '@/features/viewer-3d/engine/looks';
import { followScreenUp, stopGlide } from '@/features/viewer-3d/engine/rotation';
import { SceneViewer } from '@/features/viewer-3d/engine/scene-viewer';

import { distanceAlongSpines, sectionIndex } from './data';
import {
  closedMesh,
  localSpineMesh,
  sectionMiddles,
  skeletonTubes,
  spineMeshes,
  spineSkeletonLines,
  spineSkeletonTubes,
  type Tubes,
} from './geometry';
import { easeInOut, glideAt, glideMs, type Stance, shotDistance, type Vec3 } from './glide';
import {
  AXIS_COLOURS,
  GLASS,
  HEIGHT_RAMP,
  MEMBRANE,
  paintSkeleton,
  paintSpines,
  rampAt,
  SOMA_SECTION,
  type SpinePaintData,
  somaColour,
  spinePalette,
} from './paint';
import { frameShot, pickShot, type Quat } from './shots';

import type { CellInfo, LoadedCell, Shot } from './data';
import type { H5Part, Layers, MarkerMode, Phase, ShotName, ViewState } from './view';

/** How long a layer takes to fade in or out, or to change its colours, ms. */
const FADE_MS = 700;
/** How long lighting one part of the file and dimming the rest takes, ms. */
const FOCUS_MS = 350;
/** How bright the rest is while one part of the file is lit. */
const FOCUS_DIM = 0.1;
/** In the opening view's loop: how long each of its views is held, and how long it takes to the next, ms. */
const CYCLE_HOLD_MS = 3400;
const CYCLE_FADE_MS = 1200;
/** How see-through the chosen spine is drawn close up, so that its own skeleton shows inside it. */
const FOCUS_OPACITY = 0.5;
/** How far into its shot's sphere the camera comes: the subject is narrower than the sphere in most directions. */
const FILL = 0.9;
/** The shape a view is posed for while it is hidden and has none, width over height. */
const HIDDEN_ASPECT = 1.6;
/** Seen at less than this share of the size it is laid out at, it draws at the size it is seen at. */
const SHRUNK = 0.75;
/** The wipe's sweep across the view on entering it: from here, then to each place in turn, each in its time (ms). */
const SWEEP_FROM = 0.86;
const SWEEP = [
  { to: 0.14, ms: 2600 },
  { to: 0.5, ms: 1300 },
] as const;
/** How long after the camera arrives the sweep sets off, ms. */
const SWEEP_DELAY_MS = 250;
/**
 * The chosen spine's copy going from its own frame to its place, and back, ms: held at the start,
 * turned and moved, held in place, and taken back.
 */
const FRAME_LEGS = { hold: 900, move: 2500, rest: 1700, back: 1100 } as const;
/** The copy's axes, µm. */
const AXIS = { length: 0.45, shaft: 0.011, head: 0.03, headLength: 0.09 };
/** The chosen spine's own skeleton, its markers and its arrow, µm. */
const OWN_SKELETON_RADIUS = 0.014;
const MARKER_RADIUS = 0.04;
const ARROW = { shaft: 0.016, head: 0.045, headLength: 0.14 };
/** The spine table's rows on the cell, in CSS pixels whatever the zoom: dots, and arrows' shafts and heads. */
const ROW_PX = { root: 3.4, centre: 2.8, halo: 1.5, shaft: 0.9, head: 3, headLength: 8 };
export const ROOT_COLOUR = '#ff5c7a';
export const CENTRE_COLOUR = '#ffd166';
export const OWN_SKELETON_COLOUR = '#f8fafc';
export const ARROW_COLOUR = '#f1f5f9';
/** Behind the canvas: a deep blue-grey, lighter where the cell is. */
const BACKGROUND = 'radial-gradient(120% 95% at 50% 38%, #222a39 0%, #121721 52%, #07090d 100%)';
/** A clipping plane that keeps everything. */
const KEEP_ALL = new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e6);
const Y = new THREE.Vector3(0, 1, 0);

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** One layer's opacity, fading from one value to another. */
interface Fade {
  value: number;
  from: number;
  to: number;
  start: number;
  ms: number;
  apply(v: number): void;
}

/** A colour attribute changing from one set of colours to another. */
interface Recolour {
  attribute: THREE.BufferAttribute;
  from: Float32Array;
  to: Float32Array;
  start: number;
  ms: number;
}

/** The camera's pose: a stance and its orientation. */
interface Pose extends Stance {
  q: THREE.Quaternion;
}

/** One row of the spine table drawn on the cell: its root and centre dots, and its arrow. */
interface Row {
  group: THREE.Group;
  dots: { mesh: THREE.Mesh; px: number }[];
  shaft: THREE.Mesh;
  head: THREE.Mesh;
  length: number;
}

/** A section's label: its id in the spine table, its colour, and where it is in the view. */
export interface SectionLabel {
  text: string;
  colour: string;
}

/** Where each label is on the canvas, CSS pixels, or null where it is behind the camera or out of view. */
export type LabelPlaces = ({ x: number; y: number } | null)[] | null;

/** What is in the scene once the cell has come. */
interface Content {
  shots: CellInfo['shots'];
  cell: LoadedCell;
  tubes: Tubes;
  skeletonColour: THREE.BufferAttribute;
  spineColour: THREE.BufferAttribute;
  paint: SpinePaintData;
  /** The parseSwc index of the section shown. */
  litSection: number;
  sectionPalette: string[];
  soma: THREE.MeshPhysicalMaterial;
  rows: Row[];
  /** The chosen spine's copy, from its own frame to its place. */
  frame: { group: THREE.Group; start: THREE.Vector3; place: THREE.Vector3; turn: THREE.Quaternion };
  frameShot: Shot;
  labels: SectionLabel[];
  anchors: THREE.Vector3[];
}

type LayerName =
  | 'solid'
  | 'glass'
  | 'skeleton'
  | 'soma'
  | 'spines'
  | 'chosen'
  | 'own'
  | 'markers'
  | 'skeletons'
  | 'frame';

/** What lighting each part of the file lights. */
const FOCUS_LAYERS: Record<H5Part, readonly LayerName[]> = {
  edges: ['markers'],
  morphology: ['skeleton'],
  soma: ['soma'],
  'spine-meshes': ['spines', 'chosen'],
  'spine-skeletons': ['skeletons'],
};

/** The spine table's rows drawn while a part is lit: all of them, for /edges, if the view has none. */
function markerMode(l: Layers, focus: H5Part | null): MarkerMode {
  const mode = l.markers ?? 'off';
  return focus === 'edges' && mode === 'off' ? 'all' : mode;
}

/** Each layer's opacity in a view, with one part of the file lit (and the rest dimmed) or none. */
function opacities(l: Layers, focus: H5Part | null): Record<LayerName, number> {
  const skeleton = l.skeleton === 'off' ? 0 : 1;
  const out: Record<LayerName, number> = {
    solid: l.mesh === 'solid' || l.mesh === 'wipe' ? 1 : 0,
    glass: l.mesh === 'glass' || l.mesh === 'wipe' ? 1 : 0,
    skeleton,
    soma: skeleton,
    spines: l.spines === 'off' ? 0 : 1,
    chosen:
      l.spines === 'off' || l.spines === 'others' ? 0 : l.spines === 'one' ? FOCUS_OPACITY : 1,
    own: l.spineSkeleton ? 1 : 0,
    markers: (l.markers ?? 'off') === 'off' ? 0 : 1,
    skeletons: l.skeletons ? 1 : 0,
    frame: l.frame ? 1 : 0,
  };
  if (!focus) return out;
  const lit = new Set(FOCUS_LAYERS[focus]);
  for (const name of Object.keys(out) as LayerName[])
    out[name] = lit.has(name) ? 1 : Math.min(out[name], FOCUS_DIM);
  return out;
}

/**
 * See-through, as a cell's membrane is drawn over what is inside it: faces seen head on nearly
 * clear, and the rims, where the line of sight grazes the surface, bright. Its opacity scales it all.
 */
function glassMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: GLASS,
    roughness: 0.3,
    metalness: 0,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return addShaderHook(m, 'skeleton-glass', (shader) => {
    const before = shader.fragmentShader;
    shader.fragmentShader = before.replace(
      '#include <opaque_fragment>',
      /* glsl */ `float glassRim = pow( 1.0 - abs( dot( normal, geometryViewDir ) ), 2.2 );
	gl_FragColor = vec4( outgoingLight * ( 0.5 + 0.9 * glassRim ), diffuseColor.a * ( 0.04 + 0.62 * glassRim ) );`
    );
    if (shader.fragmentShader === before)
      console.warn('opaque_fragment has changed: the membrane is drawn as plain see-through');
  });
}

/**
 * The skeletonization course's 3D figure, on the platform's viewer engine: one real neuron's EM
 * membrane mesh (as the EM viewer decodes it), its skeleton (as the morphology viewer parses it)
 * drawn as tubes, its soma mesh, and its spines, each a mesh of its own, all in one frame; and, from
 * the spiny H5's other parts, the spine table's rows (each spine's root, centre and direction), every
 * spine's own skeleton, and a copy of the chosen spine that turns and moves from its own frame to
 * its place. The camera glides from shot to shot (`show`), the layers fade and change colour, one
 * part of the file can be lit and the rest dimmed (`setFocus`), and the membrane can be wiped away
 * across the view to compare it with the skeleton and spines. Every layer has its own material, so
 * they sit in `surfaces` rather than in `chunks`, which the looks repaint: the look gives the lights.
 */
export class SkeletonViewer extends SceneViewer {
  private content: Content | null = null;
  private state: ViewState | null = null;
  /** The layers on show, or being faded to. */
  private shown: Layers | null = null;
  private shot: ShotName | null = null;
  /** The spine table's row the 'pick' shot and the 'picked' spines and markers show. */
  private pick: number | null = null;
  private paintedPick: number | null = null;
  private focus: H5Part | null = null;
  private spinWanted = false;
  /** The camera's pose for the view on show was worked out while it was hidden, for a shape guessed. */
  private blind = false;
  private glide: { from: Pose; to: Pose; start: number; ms: number } | null = null;
  private cycle: { layers: readonly Layers[]; index: number; next: number } | null = null;
  /** The wipe's line, 0 to 1 across the view, and its sweep on entering it. */
  private wipe = 0.5;
  private sweep: { start: number } | null = null;
  /** When the chosen spine's copy last set off from its own frame. */
  private frameFrom = 0;
  private fades = new Map<LayerName, Fade>();
  private recolours: Recolour[] = [];
  private somaRecolour: { from: THREE.Color; to: THREE.Color; start: number; ms: number } | null =
    null;
  private geometries = new Set<THREE.BufferGeometry>();
  private materials: THREE.Material[] = [];
  private keepLeft = KEEP_ALL.clone();
  private keepRight = KEEP_ALL.clone();
  private umPerPx = 0;
  private placesKey = '';
  private wipeListeners = new Set<(x: number) => void>();
  private phaseListeners = new Set<(phase: Phase) => void>();
  private scaleListeners = new Set<(umPerPx: number) => void>();
  private labelListeners = new Set<(places: LabelPlaces) => void>();

  constructor(container: HTMLElement) {
    super(container, { surface: ['color'], aoDepth: 'main-pass' });
    this.setProjection('perspective');
    this.setDark(true);
    this.container.style.background = BACKGROUND;
    this.renderer.localClippingEnabled = true;
    // Scaled down on screen, as the Learn page's small pictures scale a figure laid out 600px wide,
    // it draws as many pixels as it is seen at, before the passes are sized.
    const seen =
      container.offsetWidth > 0
        ? container.getBoundingClientRect().width / container.offsetWidth
        : 1;
    if (seen > 0 && seen < SHRUNK)
      this.renderer.setPixelRatio(this.renderer.getPixelRatio() * seen);
    this.setAO(true);
    this.controls.addEventListener('start', this.onGrab);
  }

  protected override disposeContent(): void {
    this.controls.removeEventListener('start', this.onGrab);
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.geometries.clear();
    this.materials = [];
    this.wipeListeners.clear();
    this.phaseListeners.clear();
    this.scaleListeners.clear();
    this.labelListeners.clear();
  }

  /** A drag takes the camera over from a glide. */
  private onGrab = (): void => {
    if (!this.glide) return;
    this.glide = null;
    this.setSpin(this.spinWanted);
  };

  // ---------------------------------------------------------------------------
  // Content

  /**
   * A material of the figure's, freed with it, clipped by `clip` while the wipe is on. It writes
   * depth only while it is opaque, if it did to begin with: faded, it lets what is behind it show.
   */
  private own<T extends THREE.Material>(m: T, clip: THREE.Plane): T {
    m.clippingPlanes = [clip];
    m.userData.depth = m.depthWrite;
    this.materials.push(m);
    return m;
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, order: number) {
    this.geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = order;
    mesh.visible = false;
    return mesh;
  }

  /** A layer, at opacity 0: its opacity is set on its materials, and its objects shown above 0. */
  private layer(name: LayerName, objects: THREE.Object3D[], materials: THREE.Material[]): void {
    for (const o of objects) this.surfaces.add(o);
    this.fades.set(name, {
      value: 0,
      from: 0,
      to: 0,
      start: 0,
      ms: 0,
      apply: (v) => {
        for (const m of materials) {
          m.opacity = v;
          m.depthWrite = m.userData.depth !== false && v >= 0.98;
        }
        for (const o of objects) o.visible = v > 0.003;
      },
    });
  }

  /** The materials of the meshes, lines and points in `group`. */
  private static materialsOf(group: THREE.Object3D): THREE.Material[] {
    const out = new Set<THREE.Material>();
    group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line || o instanceof THREE.Points)
        out.add(o.material as THREE.Material);
    });
    return [...out];
  }

  /**
   * Put the cell in the scene. Every layer is transparent, so that it can fade, and drawn in a set
   * order: the skeleton, soma and spines first, the chosen spine's own skeleton, the chosen spine
   * (half see-through close up), the markers over everything, then the membrane, opaque or as glass.
   */
  setCell(cell: LoadedCell): void {
    const { info, spines: s, membrane, morphology } = cell;
    this.bounds.set(
      new THREE.Vector3(...info.bounds.all.min),
      new THREE.Vector3(...info.bounds.all.max)
    );
    const chosen = info.chosen.spine;
    const left = this.keepLeft,
      right = this.keepRight;

    // One geometry, drawn opaque left of the wipe and as glass right of it.
    const membraneGeometry = closedMesh(membrane.positions, membrane.indices);
    const solidMaterial = this.own(
      new THREE.MeshStandardMaterial({
        color: MEMBRANE,
        roughness: 0.62,
        metalness: 0,
        transparent: true,
      }),
      left
    );
    const solid = this.mesh(membraneGeometry, solidMaterial, 6);
    const glassMat = this.own(glassMaterial(), right);
    const glass = this.mesh(membraneGeometry, glassMat, 7);

    const tubes = skeletonTubes(morphology);
    const skeletonColour = new THREE.BufferAttribute(
      new Float32Array(3 * tubes.sections.length),
      3
    );
    tubes.geometry.setAttribute('color', skeletonColour);
    const skeletonMaterial = this.own(
      new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.42,
        metalness: 0,
        clearcoat: 0.4,
        clearcoatRoughness: 0.35,
        transparent: true,
      }),
      right
    );
    const skeleton = this.mesh(tubes.geometry, skeletonMaterial, 0);
    const somaMaterial = this.own(
      new THREE.MeshPhysicalMaterial({
        color: somaColour('type'),
        roughness: 0.48,
        metalness: 0,
        clearcoat: 0.3,
        clearcoatRoughness: 0.4,
        transparent: true,
      }),
      right
    );
    const soma = this.mesh(closedMesh(s.somaPositions, s.somaIndices), somaMaterial, 0);

    const unfit = new Set([
      ...info.checks.spinesWithOnePointSkeleton,
      ...info.checks.spinesWithSkeletonOutsideMesh,
    ]);
    const spineGeometry = spineMeshes(s, chosen, unfit);
    const spineLook = {
      vertexColors: true,
      roughness: 0.32,
      metalness: 0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
      transparent: true,
    } as const;
    const restMaterial = this.own(new THREE.MeshPhysicalMaterial(spineLook), right);
    // One pass while it is opaque; the chosen spine, see-through close up, takes two.
    restMaterial.forceSinglePass = true;
    const rest = this.mesh(spineGeometry.rest, restMaterial, 1);
    const chosenMaterial = this.own(new THREE.MeshPhysicalMaterial(spineLook), right);
    const chosenMesh = this.mesh(spineGeometry.chosen, chosenMaterial, 3);

    const ownGroup = this.ownSkeleton(cell, right);
    const rows = this.tableRows(cell, right);
    const rowsGroup = new THREE.Group();
    rowsGroup.visible = false;
    for (const r of rows) rowsGroup.add(r.group);
    const skeletons = this.allSpineSkeletons(cell, right);

    const { distance, extent } = distanceAlongSpines(
      s.spineLocalPositions,
      s.spineVertexStart,
      info.reversedSpines
    );
    const frame = this.frameCopy(
      cell,
      spineGeometry.chosen.getIndex()?.array ?? [],
      distance,
      extent[chosen] || 1,
      right
    );

    this.layer('solid', [solid], [solidMaterial]);
    this.layer('glass', [glass], [glassMat]);
    this.layer('skeleton', [skeleton], [skeletonMaterial]);
    this.layer('soma', [soma], [somaMaterial]);
    this.layer('spines', [rest], [restMaterial]);
    this.layer('chosen', [chosenMesh], [chosenMaterial]);
    this.layer('own', [ownGroup], SkeletonViewer.materialsOf(ownGroup));
    this.layer('markers', [rowsGroup], SkeletonViewer.materialsOf(rowsGroup));
    this.layer('skeletons', [skeletons], SkeletonViewer.materialsOf(skeletons));
    this.layer('frame', [frame.group], SkeletonViewer.materialsOf(frame.group));

    const sectionCount = morphology.sections.length;
    const sectionPalette = spinePalette(sectionCount);
    this.content = {
      shots: info.shots,
      cell,
      tubes,
      skeletonColour,
      spineColour: spineGeometry.colour,
      paint: {
        vertexStart: s.spineVertexStart,
        distance,
        extent,
        length: s.spineLength,
        lengthRange: info.spineLengthRange,
        section: s.spineSection,
        chosen,
        litSection: info.chosen.section,
        palette: spinePalette(s.spineVertexStart.length - 1),
        sectionPalette,
        sectionIdOffset: info.sectionIdOffset,
      },
      litSection: sectionIndex(info.chosen.section, info.sectionIdOffset),
      sectionPalette,
      soma: somaMaterial,
      rows,
      frame,
      frameShot: frame.shot,
      // the soma is section 0 of the spine table; then each section by its afferent_section_id
      labels: [
        { text: '0 · soma', colour: SOMA_SECTION },
        ...sectionPalette.map((colour, k) => ({
          text: String(k + info.sectionIdOffset),
          colour,
        })),
      ],
      anchors: [
        new THREE.Vector3(...morphology.soma.center),
        ...sectionMiddles(morphology).map((p) => new THREE.Vector3(...p)),
      ],
    };
    if (this.state) this.show(this.state, { instant: true, spin: this.spinWanted });
    this.invalidate();
  }

  /**
   * The chosen spine's own skeleton as thin white tubes, a dot at its root (afferent_surface) and at
   * its centre (afferent_center, on the dendrite's axis, inside the dendrite: drawn over everything,
   * as the arrow is), and an arrow from its root along its direction, as long as the spine.
   */
  private ownSkeleton(cell: LoadedCell, clip: THREE.Plane): THREE.Group {
    const s = cell.spines;
    const i = cell.info.chosen.spine;
    const group = new THREE.Group();
    group.visible = false;
    const tubes = this.mesh(
      spineSkeletonTubes(s, i, OWN_SKELETON_RADIUS),
      this.own(
        new THREE.MeshStandardMaterial({
          color: OWN_SKELETON_COLOUR,
          emissive: '#6b7a93',
          emissiveIntensity: 0.6,
          roughness: 0.35,
          transparent: true,
        }),
        clip
      ),
      2
    );
    tubes.visible = true;
    group.add(tubes);

    const ball = new THREE.SphereGeometry(1, 20, 14);
    const marker = (at: Vec3, colour: string) => {
      // A dark ring round a bright dot, so that it reads over anything.
      const halo = this.mesh(
        ball,
        this.own(
          new THREE.MeshBasicMaterial({
            color: '#0b0e14',
            transparent: true,
            depthTest: false,
            side: THREE.BackSide,
          }),
          clip
        ),
        4
      );
      halo.scale.setScalar(MARKER_RADIUS * 1.45);
      const core = this.mesh(
        ball,
        this.own(
          new THREE.MeshBasicMaterial({
            color: colour,
            transparent: true,
            depthTest: false,
            toneMapped: false,
          }),
          clip
        ),
        5
      );
      core.scale.setScalar(MARKER_RADIUS);
      for (const m of [halo, core]) {
        m.position.set(...at);
        m.visible = true;
        group.add(m);
      }
    };
    const v3 = (a: Float32Array): Vec3 => [a[3 * i], a[3 * i + 1], a[3 * i + 2]];
    const root = v3(s.spineRoot);
    marker(root, ROOT_COLOUR);
    marker(v3(s.spineCentre), CENTRE_COLOUR);

    const shaftLength = Math.max(0.01, s.spineLength[i] - ARROW.headLength);
    const shaft = new THREE.CylinderGeometry(ARROW.shaft, ARROW.shaft, shaftLength, 12);
    shaft.translate(0, shaftLength / 2, 0);
    const head = new THREE.ConeGeometry(ARROW.head, ARROW.headLength, 16);
    head.translate(0, shaftLength + ARROW.headLength / 2, 0);
    const arrowMaterial = this.own(
      new THREE.MeshStandardMaterial({
        color: ARROW_COLOUR,
        emissive: '#94a3b8',
        emissiveIntensity: 0.4,
        roughness: 0.4,
        transparent: true,
        depthTest: false,
      }),
      clip
    );
    const arrow = new THREE.Group();
    for (const g of [shaft, head]) {
      // over the spine, under the root's dot: it leaves from there
      const m = this.mesh(g, arrowMaterial, 3.5);
      m.visible = true;
      arrow.add(m);
    }
    arrow.position.set(...root);
    arrow.quaternion.setFromUnitVectors(Y, new THREE.Vector3(...v3(s.spineDirection)).normalize());
    group.add(arrow);
    return group;
  }

  /**
   * The spine table's rows on the cell, one group per row: a dot at its root (afferent_surface), a
   * dot at its centre (afferent_center), and an arrow from the root along its direction
   * (spine_orientation_vector), as long as spine_length. Drawn over everything, the same size on
   * screen whatever the zoom (`beforeDraw` sizes them).
   */
  private tableRows(cell: LoadedCell, clip: THREE.Plane): Row[] {
    const s = cell.spines;
    const n = s.spineVertexStart.length - 1;
    const ball = new THREE.SphereGeometry(1, 16, 12);
    const basic = (colour: string, back = false) =>
      this.own(
        new THREE.MeshBasicMaterial({
          color: colour,
          transparent: true,
          depthTest: false,
          toneMapped: false,
          side: back ? THREE.BackSide : THREE.FrontSide,
        }),
        clip
      );
    const halo = basic('#0b0e14', true);
    const root = basic(ROOT_COLOUR);
    const centre = basic(CENTRE_COLOUR);
    const arrow = basic(ARROW_COLOUR);
    // a unit shaft and head along +y, scaled to the row and to the zoom
    const shaftGeometry = new THREE.CylinderGeometry(1, 1, 1, 10).translate(0, 0.5, 0);
    const headGeometry = new THREE.ConeGeometry(1, 1, 14).translate(0, 0.5, 0);
    const rows: Row[] = [];
    for (let i = 0; i < n; i++) {
      const v3 = (a: Float32Array) => new THREE.Vector3(a[3 * i], a[3 * i + 1], a[3 * i + 2]);
      const group = new THREE.Group();
      const dots: Row['dots'] = [];
      const dot = (at: THREE.Vector3, material: THREE.Material, size: number) => {
        const back = this.mesh(ball, halo, 4);
        const core = this.mesh(ball, material, 5);
        for (const [m, px] of [
          [back, size * ROW_PX.halo],
          [core, size],
        ] as const) {
          m.position.copy(at);
          m.visible = true;
          group.add(m);
          dots.push({ mesh: m, px });
        }
      };
      const r = v3(s.spineRoot);
      dot(r, root, ROW_PX.root);
      dot(v3(s.spineCentre), centre, ROW_PX.centre);
      const along = new THREE.Group();
      along.position.copy(r);
      along.quaternion.setFromUnitVectors(Y, v3(s.spineDirection).normalize());
      const shaft = this.mesh(shaftGeometry, arrow, 4.5);
      const head = this.mesh(headGeometry, arrow, 4.5);
      shaft.visible = head.visible = true;
      along.add(shaft, head);
      group.add(along);
      rows.push({ group, dots, shaft, head, length: s.spineLength[i] });
    }
    return rows;
  }

  /** Every spine's own skeleton, as fine lines between its points and a dot at each, over everything. */
  private allSpineSkeletons(cell: LoadedCell, clip: THREE.Plane): THREE.Group {
    const geometry = spineSkeletonLines(cell.spines);
    this.geometries.add(geometry);
    const lines = new THREE.LineSegments(
      geometry,
      this.own(
        new THREE.LineBasicMaterial({
          color: OWN_SKELETON_COLOUR,
          transparent: true,
          depthTest: false,
        }),
        clip
      )
    );
    const points = new THREE.Points(
      geometry,
      this.own(
        new THREE.PointsMaterial({
          color: OWN_SKELETON_COLOUR,
          size: 3,
          sizeAttenuation: false,
          transparent: true,
          depthTest: false,
        }),
        clip
      )
    );
    lines.renderOrder = points.renderOrder = 4.5;
    const group = new THREE.Group();
    group.visible = false;
    group.add(lines, points);
    return group;
  }

  /**
   * A copy of the chosen spine as it is stored, in its own frame (`spineLocalPositions`), coloured
   * by distance from its dendrite, with its frame's x, y and z axes at its origin, its root. The
   * group's turn and place go from none, upright beside its dendrite, to the table's rotation and
   * translation (`work` steps it); with reduced motion it stays in place.
   */
  private frameCopy(
    cell: LoadedCell,
    placedTriangles: ArrayLike<number>,
    distance: Float32Array,
    extent: number,
    clip: THREE.Plane
  ): Content['frame'] & { shot: Shot } {
    const s = cell.spines;
    const i = cell.info.chosen.spine;
    const v0 = s.spineVertexStart[i],
      v1 = s.spineVertexStart[i + 1];
    const geometry = localSpineMesh(s, i, placedTriangles);
    const colours = new Float32Array(3 * (v1 - v0));
    for (let v = v0; v < v1; v++)
      colours.set(rampAt(HEIGHT_RAMP, distance[v] / extent), 3 * (v - v0));
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    const spine = this.mesh(
      geometry,
      this.own(
        new THREE.MeshPhysicalMaterial({
          vertexColors: true,
          roughness: 0.32,
          metalness: 0,
          clearcoat: 0.6,
          clearcoatRoughness: 0.2,
          side: THREE.DoubleSide,
          transparent: true,
        }),
        clip
      ),
      3
    );
    spine.visible = true;
    const group = new THREE.Group();
    group.visible = false;
    group.add(spine);

    const shaftLength = AXIS.length - AXIS.headLength;
    const shaft = new THREE.CylinderGeometry(AXIS.shaft, AXIS.shaft, shaftLength, 10).translate(
      0,
      shaftLength / 2,
      0
    );
    const head = new THREE.ConeGeometry(AXIS.head, AXIS.headLength, 14).translate(
      0,
      shaftLength + AXIS.headLength / 2,
      0
    );
    const turns = [
      new THREE.Euler(0, 0, -Math.PI / 2),
      new THREE.Euler(0, 0, 0),
      new THREE.Euler(Math.PI / 2, 0, 0),
    ];
    AXIS_COLOURS.forEach((colour, k) => {
      const material = this.own(
        new THREE.MeshBasicMaterial({
          color: colour,
          transparent: true,
          depthTest: false,
          toneMapped: false,
        }),
        clip
      );
      for (const g of [shaft, head]) {
        const m = this.mesh(g, material, 5.5);
        m.rotation.copy(turns[k]);
        m.visible = true;
        group.add(m);
      }
    });

    let lo = Infinity,
      hi = -Infinity;
    for (let v = v0; v < v1; v++) {
      lo = Math.min(lo, s.spineLocalPositions[3 * v + 1]);
      hi = Math.max(hi, s.spineLocalPositions[3 * v + 1]);
    }
    const q = [0, 1, 2, 3].map((k) => s.spineRotation[4 * i + k]) as Quat;
    const t: Vec3 = [
      s.spineTranslation[3 * i],
      s.spineTranslation[3 * i + 1],
      s.spineTranslation[3 * i + 2],
    ];
    const { shot, start } = frameShot(t, q, lo, hi, cell.info.shots.whole.direction);
    group.position.set(...start);
    return {
      group,
      start: new THREE.Vector3(...start),
      place: new THREE.Vector3(...t),
      turn: new THREE.Quaternion(...q).normalize(),
      shot,
    };
  }

  // ---------------------------------------------------------------------------
  // Views

  /**
   * Show a slide's view: glide the camera to its shot (or, with reduced motion or `instant`, jump),
   * fade the layers to it, and spin if it does and `spin` allows. A view with a cycle loops through
   * it; with reduced motion it stands still on its own layers. Before the cell has come, the view
   * waits for it.
   */
  show(state: ViewState, { instant = false, spin = state.spin } = {}): void {
    this.state = state;
    const still = reducedMotion();
    this.spinWanted = spin && !still;
    const content = this.content;
    if (!content) return;
    const now = performance.now();

    const pick = state.pick ?? content.paint.chosen;
    const to = this.poseFor(this.shotFor(state.shot, pick));
    const keepSpinning =
      state.shot === this.shot &&
      state.shot !== 'pick' &&
      this.spinWanted &&
      this.controls.autoRotate &&
      !this.glide;
    this.shot = state.shot;
    this.pick = pick;
    // hidden behind a panel, the view has no shape: `to` is posed again once it shows
    if (instant || still || !keepSpinning) this.blind = this.hidden();
    if (instant || still) {
      this.glide = null;
      this.place(to);
    } else if (!keepSpinning) {
      const from = this.pose();
      this.glide = { from, to, start: now, ms: glideMs(from, to, from.q.angleTo(to.q)) };
    }
    this.setSpin(this.glide ? false : this.spinWanted);

    const cycle = state.cycle && !still ? state.cycle : null;
    this.cycle = cycle ? { layers: cycle, index: 0, next: now + CYCLE_HOLD_MS } : null;
    this.applyLayers(cycle ? cycle[0] : state, instant ? 0 : FADE_MS, now);
    for (const listener of this.phaseListeners) listener(cycle ? 0 : null);

    this.sweep = null;
    if (state.mesh === 'wipe' && !still) {
      this.setWipeLine(SWEEP_FROM);
      this.sweep = { start: now + (this.glide?.ms ?? 300) + SWEEP_DELAY_MS };
    } else if (state.mesh === 'wipe') this.setWipeLine(0.5);
    // the copy sets off once the camera has come
    if (state.frame) this.frameFrom = now + (this.glide?.ms ?? 0);
    this.invalidate();
  }

  /**
   * Light one part of the spiny H5 and dim the rest, or (null) show the view as it is: /edges the
   * spine table's rows, /morphology the skeleton, /soma/meshes the soma, /spines/meshes the spines,
   * /spines/skeletons their own skeletons.
   */
  setFocus(part: H5Part | null): void {
    if (part === this.focus) return;
    this.focus = part;
    if (this.shown) this.applyLayers(this.shown, FOCUS_MS, performance.now());
    this.invalidate();
  }

  /** Where the wipe's line is, 0 to 1 across the view: a drag stops its sweep. */
  setWipe(x: number): void {
    this.sweep = null;
    this.setWipeLine(x);
    this.invalidate();
  }

  private setWipeLine(x: number): void {
    this.wipe = Math.min(1, Math.max(0, x));
    for (const listener of this.wipeListeners) listener(this.wipe);
  }

  /** The wipe's line, 0 to 1 across the view, now and as it moves. */
  onWipe(listener: (x: number) => void): () => void {
    this.wipeListeners.add(listener);
    listener(this.wipe);
    return () => {
      this.wipeListeners.delete(listener);
    };
  }

  /** Which of a looping view's layers are on show, as they change; null for a view without a loop. */
  onPhase(listener: (phase: Phase) => void): () => void {
    this.phaseListeners.add(listener);
    return () => {
      this.phaseListeners.delete(listener);
    };
  }

  /** µm per CSS pixel at the camera's target, for a scale bar, now and as it changes. */
  onScale(listener: (umPerPx: number) => void): () => void {
    this.scaleListeners.add(listener);
    if (this.umPerPx > 0) listener(this.umPerPx);
    return () => {
      this.scaleListeners.delete(listener);
    };
  }

  /**
   * Where the sections' labels are on the canvas, as the view moves, while each section has its own
   * colour; null otherwise. In the order of `sectionLabels`.
   */
  onLabels(listener: (places: LabelPlaces) => void): () => void {
    this.labelListeners.add(listener);
    // told where they are at the next frame, even if the view stands still
    this.placesKey = '';
    this.invalidate();
    return () => {
      this.labelListeners.delete(listener);
    };
  }

  /** The sections' labels: the soma, section 0 of the spine table, then each by its afferent_section_id. */
  get sectionLabels(): readonly SectionLabel[] {
    return this.content?.labels ?? [];
  }

  /** How far the distance-from-the-dendrite ramp reaches, µm: over the chosen spine, and over all. */
  get heightReach(): { chosen: number; all: number } | null {
    const p = this.content?.paint;
    if (!p) return null;
    return { chosen: p.extent[p.chosen], all: Math.max(...p.extent) };
  }

  /** Fade the layers to `l` over `ms`, and change their colours where their mode changed. */
  private applyLayers(l: Layers, ms: number, now: number): void {
    const c = this.content;
    if (!c) return;
    const before = this.shown;
    this.shown = l;
    const seen = (name: LayerName) => (this.fades.get(name)?.value ?? 0) > 0.003;
    const wasSeen = { skeleton: seen('skeleton'), spines: seen('spines') || seen('chosen') };
    const targets = opacities(l, this.focus);
    for (const [name, fade] of this.fades) {
      const to = targets[name];
      if (ms === 0) {
        fade.value = fade.from = fade.to = to;
        fade.apply(to);
      } else if (fade.to !== to) {
        Object.assign(fade, { from: fade.value, to, start: now, ms });
      }
    }
    if (l.skeleton !== 'off' && l.skeleton !== before?.skeleton) {
      const next = new Float32Array(c.skeletonColour.array.length);
      paintSkeleton(
        next,
        c.tubes.sections,
        c.tubes.types,
        l.skeleton,
        c.litSection,
        c.sectionPalette
      );
      const time = wasSeen.skeleton ? ms : 0;
      this.recolour(c.skeletonColour, next, time, now);
      const colour = new THREE.Color(somaColour(l.skeleton));
      this.somaRecolour = null;
      if (time > 0) this.somaRecolour = { from: c.soma.color.clone(), to: colour, start: now, ms };
      else c.soma.color.copy(colour);
    }
    const pick = this.pick ?? c.paint.chosen;
    const repick = l.spines === 'picked' && pick !== this.paintedPick;
    if (l.spines !== 'off' && (l.spines !== before?.spines || repick)) {
      const next = new Float32Array(c.spineColour.array.length);
      paintSpines(next, l.spines, c.paint, pick);
      this.recolour(c.spineColour, next, wasSeen.spines ? ms : 0, now);
      this.paintedPick = pick;
    }
    const rows = markerMode(l, this.focus);
    c.rows.forEach((row, i) => {
      row.group.visible = rows === 'all' || (rows === 'picked' && i === pick);
    });
  }

  private recolour(attribute: THREE.BufferAttribute, to: Float32Array, ms: number, now: number) {
    this.recolours = this.recolours.filter((r) => r.attribute !== attribute);
    const array = attribute.array as Float32Array;
    if (ms <= 0) {
      array.set(to);
      attribute.needsUpdate = true;
      return;
    }
    this.recolours.push({ attribute, from: array.slice(), to, start: now, ms });
  }

  // ---------------------------------------------------------------------------
  // Camera

  /** A shot by name: cell.json's, the picked row's, or the frame's. */
  private shotFor(name: ShotName, pick: number): Shot {
    const c = this.content as Content;
    if (name === 'frame') return c.frameShot;
    if (name !== 'pick') return c.shots[name];
    const s = c.cell.spines;
    const v3 = (a: Float32Array): Vec3 => [a[3 * pick], a[3 * pick + 1], a[3 * pick + 2]];
    return pickShot(
      v3(s.spineRoot),
      v3(s.spineDirection),
      s.spineLength[pick],
      c.cell.info.reversedSpines.includes(pick),
      c.shots.whole.direction
    );
  }

  /** Where the camera stands for a shot: its sphere filling the view, looking along its direction. */
  private poseFor(shot: Shot): Pose {
    const camera = this.camera as THREE.PerspectiveCamera;
    const aspect = this.hidden()
      ? HIDDEN_ASPECT
      : this.container.clientWidth / this.container.clientHeight;
    const distance = shotDistance(shot.radius, camera.fov, aspect, FILL);
    const target = new THREE.Vector3(...shot.target);
    const eye = target.clone().addScaledVector(new THREE.Vector3(...shot.direction), distance);
    const m = new THREE.Matrix4().lookAt(eye, target, new THREE.Vector3(...shot.up));
    return {
      target: [...shot.target],
      distance,
      q: new THREE.Quaternion().setFromRotationMatrix(m),
    };
  }

  /** Where the camera is now. */
  private pose(): Pose {
    const target = this.controls.target;
    return {
      target: [target.x, target.y, target.z],
      distance: this.camera.position.distanceTo(target),
      q: this.camera.quaternion.clone(),
    };
  }

  /** Put the camera `distance` back from `target` along its orientation `q`, with OrbitControls told. */
  private place({ target, distance, q }: Pose): void {
    const camera = this.camera;
    this.controls.target.set(...target);
    camera.quaternion.copy(q);
    camera.position.set(0, 0, distance).applyQuaternion(q).add(this.controls.target);
    camera.updateMatrixWorld();
    followScreenUp(this.controls);
    stopGlide(this.controls);
  }

  /** Whether the view is hidden (display: none, behind a panel), and so has no shape. */
  private hidden(): boolean {
    return this.container.clientWidth === 0 || this.container.clientHeight === 0;
  }

  /**
   * After the view's size, look or passes changed. Shown again after its view was set while it was
   * hidden, the camera's pose, worked out for a shape guessed, is worked out for the real one: the
   * glide on its way there, if there is one, goes there instead.
   */
  protected override frameChanged(): void {
    const { state, content } = this;
    if (!this.blind || !state || !content || this.hidden()) return;
    this.blind = false;
    const to = this.poseFor(this.shotFor(state.shot, this.pick ?? content.paint.chosen));
    if (this.glide) this.glide.to = to;
    else this.place(to);
    this.invalidate();
  }

  // ---------------------------------------------------------------------------
  // The loop

  /** The glide, the fades, the loop's next view, the wipe's sweep and the frame's copy, a step each frame. */
  protected override work(_moving: boolean): boolean {
    const now = performance.now();
    let changed = false;
    let waiting = false;
    const g = this.glide;
    if (g) {
      const u = Math.min(1, (now - g.start) / g.ms);
      const at = glideAt(g.from, g.to, u);
      const q = new THREE.Quaternion().slerpQuaternions(g.from.q, g.to.q, at.turn);
      this.place({ target: at.target, distance: at.distance, q });
      changed = true;
      if (u >= 1) {
        this.glide = null;
        this.setSpin(this.spinWanted);
      }
    }
    if (this.stepFades(now)) changed = true;
    const cycle = this.cycle;
    if (cycle) {
      waiting = true;
      if (now >= cycle.next) {
        cycle.index = (cycle.index + 1) % cycle.layers.length;
        cycle.next = now + CYCLE_HOLD_MS + CYCLE_FADE_MS;
        this.applyLayers(cycle.layers[cycle.index], CYCLE_FADE_MS, now);
        for (const listener of this.phaseListeners) listener(cycle.index);
        changed = true;
      }
    }
    if (this.sweep) {
      waiting = true;
      if (this.stepSweep(now)) changed = true;
    }
    if (this.shown?.frame && this.content) {
      if (this.stepFrame(now)) changed = true;
      if (!reducedMotion()) waiting = true;
    }
    if (changed) this.invalidate();
    return changed || waiting;
  }

  private stepFades(now: number): boolean {
    let changed = false;
    for (const f of this.fades.values()) {
      if (f.value === f.to) continue;
      const u = f.ms <= 0 ? 1 : (now - f.start) / f.ms;
      f.value = u >= 1 ? f.to : f.from + (f.to - f.from) * easeInOut(u);
      f.apply(f.value);
      changed = true;
    }
    this.recolours = this.recolours.filter((r) => {
      const u = Math.min(1, (now - r.start) / r.ms);
      const e = easeInOut(u);
      const array = r.attribute.array as Float32Array;
      for (let i = 0; i < array.length; i++) array[i] = r.from[i] + (r.to[i] - r.from[i]) * e;
      r.attribute.needsUpdate = true;
      changed = true;
      return u < 1;
    });
    const sr = this.somaRecolour;
    if (sr && this.content) {
      const u = Math.min(1, (now - sr.start) / sr.ms);
      this.content.soma.color.lerpColors(sr.from, sr.to, easeInOut(u));
      if (u >= 1) this.somaRecolour = null;
      changed = true;
    }
    return changed;
  }

  /** Move the wipe's line along its sweep; false while the sweep waits for the camera. */
  private stepSweep(now: number): boolean {
    const sweep = this.sweep;
    if (!sweep || now < sweep.start) return false;
    let t = now - sweep.start;
    let from: number = SWEEP_FROM;
    for (const leg of SWEEP) {
      if (t < leg.ms) {
        this.setWipeLine(from + (leg.to - from) * easeInOut(t / leg.ms));
        return true;
      }
      t -= leg.ms;
      from = leg.to;
    }
    this.setWipeLine(from);
    this.sweep = null;
    return true;
  }

  /**
   * The chosen spine's copy, `u` of the way from its own frame to its place: its turn slerped from
   * none to the table's rotation, its root moved straight from beside the dendrite to the table's
   * translation, so it moves as one rigid piece. Held, moved, held, taken back, and again; in place
   * with reduced motion. False when nothing moved.
   */
  private stepFrame(now: number): boolean {
    const f = (this.content as Content).frame;
    let u = 1;
    if (!reducedMotion()) {
      const { hold, move, rest, back } = FRAME_LEGS;
      const t = Math.max(0, now - this.frameFrom) % (hold + move + rest + back);
      if (t < hold) u = 0;
      else if (t < hold + move) u = easeInOut((t - hold) / move);
      else if (t < hold + move + rest) u = 1;
      else u = 1 - easeInOut((t - hold - move - rest) / back);
    }
    const position = new THREE.Vector3().lerpVectors(f.start, f.place, u);
    const turn = new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), f.turn, u);
    if (
      position.distanceToSquared(f.group.position) < 1e-12 &&
      turn.angleTo(f.group.quaternion) < 1e-6
    )
      return false;
    f.group.position.copy(position);
    f.group.quaternion.copy(turn);
    return true;
  }

  /**
   * The wipe's clipping planes, through the eye and the line across the view: the membrane kept left
   * of it, the rest right of it. Without the wipe they keep everything. And the spine table's rows
   * sized to the zoom, so they stay the same on screen.
   */
  protected override beforeDraw(_moving: boolean): void {
    const camera = this.camera;
    camera.updateMatrixWorld();
    this.sizeRows();
    if (this.shown?.mesh !== 'wipe') {
      this.keepLeft.copy(KEEP_ALL);
      this.keepRight.copy(KEEP_ALL);
      return;
    }
    const x = 2 * this.wipe - 1;
    const a = new THREE.Vector3(x, -1, 0.2).unproject(camera);
    const b = new THREE.Vector3(x, 1, 0.2).unproject(camera);
    const c = new THREE.Vector3(x, 0, 0.8).unproject(camera);
    this.keepRight.setFromCoplanarPoints(a, b, c);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    if (this.keepRight.normal.dot(right) < 0) this.keepRight.negate();
    this.keepLeft.copy(this.keepRight).negate();
  }

  /** µm per CSS pixel at the camera's target. */
  private pixelAtTarget(): number {
    const camera = this.camera as THREE.PerspectiveCamera;
    const d = camera.position.distanceTo(this.controls.target);
    return (
      (2 * d * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, this.container.clientHeight)
    );
  }

  /** The rows' dots and arrows, a few pixels across at the target, and each arrow as long as its spine. */
  private sizeRows(): void {
    const c = this.content;
    if (!c || (this.fades.get('markers')?.value ?? 0) <= 0.003) return;
    const px = this.pixelAtTarget();
    for (const row of c.rows) {
      if (!row.group.visible) continue;
      for (const d of row.dots) d.mesh.scale.setScalar(d.px * px);
      const headLength = Math.min(ROW_PX.headLength * px, 0.45 * row.length);
      const shaft = ROW_PX.shaft * px,
        head = ROW_PX.head * px;
      row.shaft.scale.set(shaft, Math.max(1e-4, row.length - headLength), shaft);
      row.head.scale.set(head, headLength, head);
      row.head.position.set(0, row.length - headLength, 0);
    }
  }

  /** Tell the scale bar how large a pixel is at the target, and the labels where they are, when that changed. */
  protected override afterDraw(): void {
    this.placeLabels();
    const px = this.pixelAtTarget();
    if (Math.abs(px - this.umPerPx) <= 0.002 * px) return;
    this.umPerPx = px;
    for (const listener of this.scaleListeners) listener(px);
  }

  /** The sections' labels on the canvas while each section has its colour, as the view moves. */
  private placeLabels(): void {
    const c = this.content;
    if (this.labelListeners.size === 0 || !c) return;
    const on =
      this.shown?.skeleton === 'sections' && (this.fades.get('skeleton')?.value ?? 0) > 0.5;
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    const key = on
      ? `${w}x${h}:${this.camera.matrixWorld.elements.map((v) => v.toFixed(5)).join(',')}`
      : 'off';
    if (key === this.placesKey) return;
    this.placesKey = key;
    let places: LabelPlaces = null;
    if (on) {
      const p = new THREE.Vector3();
      places = c.anchors.map((a) => {
        p.copy(a).project(this.camera);
        if (p.z < -1 || p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) return null;
        return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h };
      });
    }
    for (const listener of this.labelListeners) listener(places);
  }
}
