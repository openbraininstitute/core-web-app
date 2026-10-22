import chroma from 'chroma-js';
import { isEqual } from 'es-toolkit';
import * as THREE from 'three';

import { DEFAULT_SPIKE_GLOW, SpikeClock } from '@/features/circuit-viewer/spike-clock';
import { WAKE_FRAMES } from '@/features/entities/em-cell-mesh/viewer/engine/mesh-choice';
import {
  DEFAULT_MOTION,
  type MotionOptions,
  MotionQuality,
} from '@/features/entities/em-cell-mesh/viewer/engine/motion-quality';
import { CANVAS_DARK, CANVAS_LIGHT } from '@/features/scan-config/components/color-by/contrast';
import { DEFAULT_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';
import { boxCorners } from '@/features/viewer-3d/engine/framing';
import { backgroundCss, createLooks, PLAIN } from '@/features/viewer-3d/engine/looks';
import { SceneView } from '@/features/viewer-3d/engine/scene-view';
import { logError } from '@/utils/logger';

import { extentOf, morphologiesExtent, packExtent } from '../extent';
import {
  morphed,
  pointAtOffset,
  sectionAtSegment,
  sectionNumbered,
  somaSectionOf,
} from '../sections';
import { CellTable, somaTexture } from './cell-table';
import { DETAIL_PIXELS, pixelSpan } from './detail';
import { DetailStream } from './detail-stream';
import { countDots, type DotGroup, drawnRadius, minRadius, writeDots } from './electrodes';
import {
  AXON,
  CELL_MASK,
  cellNearMiddle,
  HOLE,
  impostorUniforms,
  NO_CELL,
  packCellTypes,
  quadGeometry,
  segmentAttributes,
  setSectionColours,
} from './impostors';
import {
  cloudPieces,
  fanGeometry,
  GLOW_SWELL,
  PYRAMIDS_ABOVE_PX,
  QUADS_BELOW_PX,
  somaCloudUniforms,
} from './soma-cloud';
import { NEON, SPIKE_HUE } from './spike-light';

import type { SectionType } from '@/features/circuit-viewer/section-type';
import type { CircuitSpikes } from '@/features/circuit-viewer/types';
import type { Look, ThemeColors } from '@/features/viewer-3d/engine/looks';
import type { MovingFrame } from '@/features/viewer-3d/engine/scene-viewer';
import type { TreeSection } from '../load/tree';
import type {
  CellColors,
  CircuitMorphologyData,
  CircuitMorphologyView,
  CircuitSomas,
  CullCounts,
  CullRead,
  DetailRules,
  DetailStats,
  ElectrodeGroup,
  ElectrodeHit,
  LocationMarker,
  MarkerOnScreen,
  Population,
  ScreenPoint,
  SectionSpot,
  SynapseGroup,
  Vec3,
} from '../types';
import type { UploadsOf } from './segment-arena';

/**
 * What the highlighted cell and the ring round each contact are drawn in: as far from the background as no colour of a
 * palette is.
 */
const FOREGROUND: ThemeColors = { light: '#1a1a1a', dark: '#ffffff' };

/** How far around the pixel asked for a pick looks, in CSS pixels, as the somas view does. */
const PICK_REACH = 4;
/**
 * How far from a contact's centre a point is still on it, in CSS pixels, however small it is drawn: the somas view's 14
 * device pixels on a screen of pixel ratio 2.
 */
const CONTACT_REACH = 7;
/** A location marker's radius until told otherwise, in µm, and the least it is drawn with, in CSS pixels: morphoviewer's. */
const MARKER_RADIUS = 3;
const MARKER_MIN_RADIUS = 3;
/** How far from a marker's centre a point is still on it, in CSS pixels: morphoviewer's. */
const MARKER_REACH = 9;
/** A synapse's radius in µm, and the least it is drawn with in device pixels: the small-circuit view's. */
const SYNAPSE_RADIUS = 0.5;
const SYNAPSE_MIN_RADIUS = 2;
/** How long the nudge lasts, ms, and how much nearer it brings the view at its height: morphoviewer's. */
const NUDGE_MS = 900;
const NUDGE_GROWTH = 0.06;
/** How long the morph into the dendrogram and back takes, ms, the whole way: morphoviewer's. */
const MORPH_MS = 600;
/**
 * Moving frames over the somas alone cut down as the EM mesh viewer's are, but a step in resolution kept only where it
 * saves a tenth: drawn front first, many somas cost their corners more than their pixels.
 */
const MOTION: MotionOptions = { ...DEFAULT_MOTION, leastSaving: 0.1 };
const point = new THREE.Vector3();
const pieceBox = new THREE.Box3();

type Quads = THREE.Mesh<THREE.InstancedBufferGeometry>;

/**
 * A piece of the cloud: its pyramids, the same somas as flat quads where they are small on screen (`QUADS_BELOW_PX`),
 * which of the two is drawn, the pyramids for the pick, and how far its somas reach from its centre.
 */
interface CloudMeshes {
  pyramids: Quads;
  flat: Quads;
  small: boolean;
  ids: Quads;
  reach: number;
}

function quads(geometry: THREE.InstancedBufferGeometry, material: THREE.Material): Quads {
  const mesh = new THREE.Mesh(geometry, material);
  // The geometry's own corners say nothing of where its instances are.
  mesh.frustumCulled = false;
  mesh.visible = geometry.instanceCount > 0;
  return mesh;
}

/** The segments' quads of morphologies read whole. */
function segmentGeometry(data: CircuitMorphologyData): THREE.InstancedBufferGeometry {
  const ends = new THREE.InstancedInterleavedBuffer(data.segments, 8);
  // Without a dendrogram the same buffer stands for it, and the morph moves nothing.
  const charted = data.chart ? new THREE.InstancedInterleavedBuffer(data.chart.segments, 8) : ends;
  return segmentAttributes(
    quadGeometry(data.segmentCells.length),
    ends,
    charted,
    new THREE.InstancedBufferAttribute(packCellTypes(data.segmentCells, data.segmentTypes), 1)
  );
}

/**
 * How a tier draws a pack's segments, read a box at a time, other than on three's attributes: where the arena's arrays
 * go, the materials of the segments in the look and in their cells' numbers, and the quads each of them is drawn on, by
 * their order.
 */
export interface ArenaDrawing {
  uploadsOf: UploadsOf;
  segment: THREE.Material[];
  ids: THREE.Material[];
  quads: THREE.InstancedBufferGeometry[];
  /** Lit through what covers them (`CircuitMaterials.through`), on quads of their own. */
  through?: { materials: THREE.Material[]; quads: THREE.InstancedBufferGeometry[] };
}

/**
 * Morphologies read a box at a time: what reads and places them, the camera, the view's height and the rules their
 * levels were last chosen for, and whether the view was still; and whether the boxes seen changed since.
 */
interface Detailed {
  stream: DetailStream;
  chosenFor: {
    projection: THREE.Matrix4;
    view: THREE.Matrix4;
    height: number;
    rules: DetailRules;
    still: boolean;
  } | null;
  seenChanged: boolean;
}

/** The somas that have a position, four floats each, the same in the dendrogram, and the cell of each. */
function placedSomas(
  somas: Float32Array,
  chart = somas
): { spheres: Float32Array; charts: Float32Array; cells: Uint32Array } {
  const spheres = new Float32Array(somas.length);
  const charts = chart === somas ? spheres : new Float32Array(somas.length);
  const cells = new Uint32Array(somas.length / 4);
  let placed = 0;
  for (let cell = 0; cell < cells.length; cell++) {
    if (Number.isNaN(somas[4 * cell])) continue;
    for (let k = 0; k < 4; k++) {
      spheres[4 * placed + k] = somas[4 * cell + k];
      charts[4 * placed + k] = chart[4 * cell + k];
    }
    cells[placed++] = cell;
  }
  return {
    spheres: spheres.subarray(0, 4 * placed),
    charts: charts.subarray(0, 4 * placed),
    cells: cells.subarray(0, placed),
  };
}

/** How far along the line from `a` to `b` the point `p` falls, from 0 to 1, all three in pixels. */
function along(a: ScreenPoint, b: ScreenPoint, p: ScreenPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const squared = dx * dx + dy * dy;
  if (squared === 0) return 0;
  return Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / squared));
}

function drawnAlike(
  a: readonly (MarkerOnScreen | null)[],
  b: readonly (MarkerOnScreen | null)[]
): boolean {
  return (
    a.length === b.length &&
    a.every((m, i) => {
      const n = b[i];
      if (!m || !n) return m === n;
      return (
        m.type === n.type &&
        m.visible === n.visible &&
        m.screen.x === n.screen.x &&
        m.screen.y === n.screen.y
      );
    })
  );
}

/** Whether neither set of populations takes in the other's: another circuit, or another population in place of one. */
function framesAgain(before: Population[] | null, after: Population[]): boolean {
  if (!before) return true;
  const has = (all: Population[], some: Population[]) =>
    some.every(({ name }) => all.some((population) => population.name === name));
  return !has(before, after) && !has(after, before);
}

/** Where somas lie, as the somas view framed them: their mean, and the farthest of them from it on each axis. */
interface SomasBox {
  mean: Vec3;
  reach: Vec3;
}

/** The box of the somas of `positions` that `keep` keeps; null where it keeps none that has a place. */
function somasBox(positions: Float32Array, keep?: (cell: number) => boolean): SomasBox | null {
  const extent = extentOf(positions, keep);
  if (!extent) return null;
  const { min, max, mean } = extent;
  return { mean, reach: mean.map((m, k) => Math.max(max[k] - m, m - min[k])) as Vec3 };
}

/**
 * What a tier draws the circuit with, each reading the uniforms of `CircuitView`: the segments and the morphologies'
 * somas in the look, the cloud of somas, the same three in their cells' numbers for the pick, the segments and somas in
 * their segments' numbers for the pick of a section, and the dots. The segments are drawn once for each of their
 * materials, over the same quads, each drawing its own share of them.
 */
export interface CircuitMaterials {
  segment: THREE.Material[];
  soma: THREE.Material;
  cloud: THREE.Material;
  ids: { segment: THREE.Material[]; soma: THREE.Material; cloud: THREE.Material };
  spots: { segment: THREE.Material[]; soma: THREE.Material };
  /** The lit cells drawn over the frame, through what covers them, where the tier draws them (`throughs`). */
  through?: { segment: THREE.Material[]; soma: THREE.Material };
  electrode: THREE.Material;
  synapse: THREE.Material;
  marker: THREE.Material;
}

/**
 * A circuit's morphologies on a `SceneView`, in the Studio look, whichever GPU interface draws them: a quad a segment
 * and a quad a soma (`impostors.ts`), each cell coloured and shown or not by its texel of the cell table, and electrode
 * contacts in front of them (`electrodes.ts`). Before a circuit's morphologies are in, or without them, its somas are
 * drawn as the somas view drew them (`soma-cloud.ts`), from the page's positions; its morphologies then take their
 * place, over the same cells, in the same view. A spike replay lights the cells as they fire, on a clock
 * (`SpikeClock`) moved on by each turn of the loop.
 *
 * The tier makes the renderer on the canvas, its materials (`materials`) on the uniforms here, and then calls `start`;
 * it draws, draws a scene for a pick into its target and reads it (`readPick`), and builds the pick's programs
 * (`compile`). The arrays are drawn from as the reader made them, and kept, to be uploaded again.
 */
export abstract class CircuitView extends SceneView implements CircuitMorphologyView {
  /** The look, of which the tier takes the material's shading and the lights, which ride on the camera. */
  protected look: Look;
  protected abstract materials: CircuitMaterials;
  /** Whether the tier's targets count their rows up, as WebGL's do, or down, as WebGPU's do. */
  protected abstract readonly rowsUp: boolean;
  /** The pick's target's side, in device pixels. */
  protected readonly pickSide: number;
  /** The segments' quads. */
  private chunks = new THREE.Group();
  /** The segments, the morphologies' somas and the cloud: what the cells are. */
  private surfaces = new THREE.Group();
  /** The lit cells' quads drawn through what covers them, which the tier draws over the frame. */
  protected readonly throughs = new THREE.Scene();
  protected uniforms = impostorUniforms();
  /**
   * The morphologies, their segments' and their somas' quads, the same quads for the pick, and for the pick of a section
   * where the morphologies were read whole; where they are read a box at a time, what reads them.
   */
  private layer: {
    data: CircuitMorphologyData;
    meshes: Quads[];
    ids: Quads[];
    spots: Quads[];
    detailed: Detailed | null;
  } | null = null;
  private detailRules: DetailRules;
  private detailListeners = new Set<(detail: DetailStats | null) => void>();
  /** What the listeners were last told. */
  private toldDetail: DetailStats | null = null;
  /** What the tier's culling last counted. */
  private culled: CullCounts | null = null;
  /** The most segments an arena may hold where it keeps every box's coarsest level (`DetailStream`), as the tier has it. */
  protected baseUpTo = 0;
  /** The quads of the morphologies in their segments' numbers, drawn for a pick of a section alone. */
  private spots = new THREE.Scene();
  protected spotUniforms = { uSegments: { value: 0 } };
  /** The read of `spots` at a point asked for in this task, which the pick of its cell and of its section share. */
  private spotRead: { x: number; y: number; read: Promise<number | null> } | null = null;
  protected cloudUniforms = somaCloudUniforms();
  /**
   * The somas the cloud draws, whose populations decide whether the next ones are framed, the box round all of them,
   * their pieces (`cloudPieces`), the whole of them while translucent (`wholeCloud`), and whether it is shown.
   */
  private cloud: {
    somas: CircuitSomas;
    box: SomasBox | null;
    pieces: CloudMeshes[];
    whole: Quads | null;
    shown: boolean;
  } | null = null;
  /**
   * How far frames drawn while the view moves over the somas alone are cut down, by what they cost the GPU (`MOTION`):
   * the occlusion left out, then the resolution. Then the fraction of the resolution the last frame was drawn at, and
   * the moving frames drawn at it one after another.
   */
  private motion = new MotionQuality({ ...MOTION, ao: this.occludes ? 'auto' : 'off' });
  private drawnScale = 1;
  private drawnRung: MovingFrame | null = null;
  private steadyFrames = 0;
  /**
   * What the frame drawn now is timed for, which the tier tells `measured`: a moving frame from the third at one
   * resolution, as a GPU waking up draws its first slowly, a still one, or none, over morphologies.
   */
  protected timing: 'moving' | 'still' | null = null;
  /** Whether a moving frame over the somas alone keeps the occlusion, where the tier draws one. */
  protected get aoMoving(): boolean {
    return this.cloud?.shown === true && this.motion.rung.ao;
  }
  /** The cloud and the morphologies in their cells' numbers, drawn for a pick alone. */
  private ids = new THREE.Scene();
  /** Of each material, the quads last let go of (`letGo`). */
  private kept = new Map<THREE.Material, Quads>();
  private table: CellTable | null = null;
  private colors: CellColors | null = null;
  private defaultColor = DEFAULT_NEURON_COLOR;
  protected background = CANVAS_LIGHT;
  /** What the data's positions have taken off: the electrodes come in the circuit's own frame. */
  private centre: Vec3 = [0, 0, 0];
  private electrodeGroups: readonly ElectrodeGroup[] = [];
  private highlightedElectrode: string | null = null;
  protected electrodeUniforms = {
    uViewport: this.uniforms.uViewport,
    uRadius: { value: 0 },
    uMinRadius: { value: minRadius(0) },
    uRingColour: { value: new THREE.Vector3() },
    uScale: { value: 1 },
  };
  private electrodes: Quads | null = null;
  private synapseGroups: readonly SynapseGroup[] = [];
  protected synapseUniforms = {
    uViewport: this.uniforms.uViewport,
    uRadius: { value: SYNAPSE_RADIUS },
    uMinRadius: { value: SYNAPSE_MIN_RADIUS },
    uRingColour: this.electrodeUniforms.uRingColour,
    uScale: this.electrodeUniforms.uScale,
  };
  private synapseDots: Quads | null = null;
  private markers: readonly LocationMarker[] = [];
  /** Each marker's point in the circuit's frame and its section's type; null for one that is not drawn. */
  private markerPoints: ({ point: Vec3; type: SectionType } | null)[] = [];
  protected markerUniforms = {
    uViewport: this.uniforms.uViewport,
    uRadius: { value: MARKER_RADIUS },
    uMinRadius: { value: MARKER_MIN_RADIUS },
    uRingColour: this.electrodeUniforms.uRingColour,
    uScale: this.electrodeUniforms.uScale,
  };
  private markerDots: Quads | null = null;
  private markerListeners = new Set<(markers: readonly (MarkerOnScreen | null)[]) => void>();
  /** Where the listeners were last told the markers are; null to tell them again. */
  private told: readonly (MarkerOnScreen | null)[] | null = null;
  /** The morph into the dendrogram, or out: the mix it goes to, the mix it began at, and when. */
  private morph = { target: 0, from: 0, start: 0 };
  /** The nudge under way: when it began, the zoom it began at, and the zoom it last set. */
  private nudging: { start: number; rest: number; set: number } | null = null;
  /** Where the last framing left the camera. */
  private framedAt: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    zoom: number;
    target: THREE.Vector3;
  } | null = null;
  protected readonly spiking = new SpikeClock();
  private glowAsked = DEFAULT_SPIKE_GLOW;
  /** Whether the background is dark. */
  protected dark = false;
  private spikeTimeListeners = new Set<(timeInMs: number) => void>();
  private spikesPlayingListeners = new Set<(playing: boolean) => void>();

  /**
   * `pixelRatio`: the device pixels a CSS pixel is drawn with; `budget`: the tier's segments drawn at once until told
   * otherwise.
   */
  constructor(
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    protected readonly pixelRatio: number,
    budget: number
  ) {
    super(container, canvas);
    this.detailRules = { budget, pixels: DETAIL_PIXELS, culling: true };
    this.pickSide = 2 * Math.ceil(PICK_REACH * pixelRatio) + 1;
    this.markerUniforms.uMinRadius.value = MARKER_MIN_RADIUS * pixelRatio;
    const [look] = createLooks(pixelRatio, ['color'], ['studio']);
    this.look = look;
    // Light rigs ride on the camera so the look keeps its lighting while orbiting.
    if (look.rig) this.camera.add(look.rig);
    this.chunks.name = 'circuit morphologies';
    this.surfaces.add(this.chunks);
    this.scene.add(this.surfaces);
    // The circuit viewer's own background, as behind the somas, in place of Studio's gradient.
    look.background = { light: [CANVAS_LIGHT, CANVAS_LIGHT], dark: [CANVAS_DARK, CANVAS_DARK] };
    look.onTheme = (dark) => {
      const theme = dark ? 'dark' : 'light';
      this.background = look.background[theme][0];
      this.uniforms.uHighlight.value.set(FOREGROUND[theme]);
      this.uniforms.uGlowRim.value.w = dark ? 0 : 1;
      this.uniforms.uNeon.value.fromArray(NEON[theme]);
      const hue = SPIKE_HUE[theme];
      const { r, g, b } = new THREE.Color(hue ?? 0);
      this.uniforms.uSpikeHue.value.set(r, g, b, hue ? 1 : 0);
      this.dark = dark;
      this.electrodeUniforms.uRingColour.value.fromArray(chroma(FOREGROUND[theme]).gl());
    };
    // A gesture takes the view: the nudge's zoom would stop its glide every frame.
    this.controls.addEventListener('start', () => {
      this.nudging = null;
    });
  }

  /** Once the tier has its renderer and materials: the theme, the canvas's size, and the first frame. */
  protected start(): void {
    this.setDark(false);
    this.fitCanvas();
    this.invalidate();
  }

  /** Whether morphologies are drawn, in place of the somas. */
  protected get drawsMorphologies(): boolean {
    return this.layer !== null;
  }

  /** Whether the somas are drawn alone and opaque. */
  protected get drawsOpaqueSomas(): boolean {
    return this.cloud?.shown === true && this.cloud.whole === null;
  }

  /** Whether the tier draws ambient occlusion. */
  protected get occludes(): boolean {
    return false;
  }

  /** The tier's occlusion given up on: moving frames no longer step through it. */
  protected occlusionGone(): void {
    this.motion.configure({ ...MOTION, ao: 'off' });
  }

  /** Whether the tier culls the somas drawn alone and opaque, drawing them itself in place of the cloud's pieces. */
  protected get cullsSomas(): boolean {
    return false;
  }

  /**
   * The tier told of the cloud's somas as they are set, at `positions`, three floats a cell, cut into the pieces whose
   * pyramids are `pieces`, and of none as they are let go of: what it culls (`cullsSomas`).
   */
  protected placeSomas(
    _positions: Float32Array | null,
    _pieces: readonly THREE.InstancedBufferGeometry[]
  ): void {}

  /** The canvas drawn at `scale` of the resolution, scaled up onto the page. */
  protected abstract scaleDrawing(scale: number): void;

  /** The target a pick is drawn into, `pickSide` square. */
  protected abstract pickTarget(): THREE.RenderTarget;

  /** Draw `scene` into the pick's target, as its viewport places it, and read the target's pixels, a row after another. */
  protected abstract readPick(scene: THREE.Scene): Promise<Uint8Array>;

  /** Begin to build the programs that draw `scene` for the pick, so that the first pick does not wait for them. */
  protected abstract compile(scene: THREE.Scene): void;

  /** How a pack's arena is drawn; null on three's attributes, by the materials of morphologies read whole. */
  protected arenaDrawing(): ArenaDrawing | null {
    return null;
  }

  /**
   * The number drawn by `scene` nearest the pixel asked for, in CSS pixels from the view's top left corner, within
   * `PICK_REACH`; null where there is none, or where the pixels cannot be read.
   */
  private numberAround(scene: THREE.Scene, x: number, y: number): Promise<number | null> {
    const side = this.pickSide;
    const middle = (side - 1) / 2;
    const ratio = this.pixelRatio;
    const row = Math.floor(y * ratio);
    // The whole view, placed so that the pixel asked for is the target's middle one; at full resolution, where a moving
    // frame was drawn at less.
    const width = Math.floor(this.width * ratio);
    const height = Math.floor(this.height * ratio);
    this.pickTarget().viewport.set(
      middle - Math.floor(x * ratio),
      middle - (this.rowsUp ? height - 1 - row : row),
      width,
      height
    );
    // No frame may have been drawn since the camera last moved.
    this.readyCamera();
    return this.readPick(scene).then(
      (pixels) => cellNearMiddle(pixels, side),
      () => null
    );
  }

  protected override disposeContent(): void {
    // A tier that failed before it made its materials drew nothing.
    if (!this.materials) {
      this.look.material.dispose();
      return;
    }
    this.clear();
    const { ids, spots, through, ...drawn } = this.materials;
    const materials = new Set([
      ...Object.values(drawn).flat(),
      ...Object.values(ids).flat(),
      ...Object.values(spots).flat(),
      ...Object.values(through ?? {}).flat(),
      this.look.material,
    ]);
    for (const material of materials) material.dispose();
    this.electrodes?.geometry.dispose();
    this.markerDots?.geometry.dispose();
    this.synapseDots?.geometry.dispose();
    this.spikeTimeListeners.clear();
    this.spikesPlayingListeners.clear();
    this.markerListeners.clear();
    this.detailListeners.clear();
  }

  setDark(dark: boolean): void {
    this.container.style.background = backgroundCss(this.look, dark);
    this.look.onTheme?.(dark, PLAIN);
    this.invalidate();
  }

  snapshot(): HTMLCanvasElement | null {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;
    // The canvas holds a frame only in the task that drew it, so it is drawn again here, still and at the full
    // resolution, and copied at once.
    this.readyCamera();
    this.beforeDraw(false);
    this.draw(false);
    const frame = this.canvas;
    canvas.width = frame.width;
    canvas.height = frame.height;
    context.fillStyle = this.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(frame, 0, 0);
    return canvas;
  }

  /**
   * Over the somas of the same cells, the morphologies take their place, drawn where the circuit's frame puts them and
   * framed only as the somas would be (`setSomas`); over somas of other cells, they are not drawn; null gives the somas
   * their place back. Without somas, the morphologies are all there is, about their own centre. With `follow`, a view
   * still as the last framing left it is framed on them.
   */
  setData(given: CircuitMorphologyData | null, follow = false): void {
    const unmoved = follow && this.unmoved();
    this.clearMorphologies();
    // The somas, which keep the cell table, the origin and the view; morphologies of other cells are not drawn over them.
    const under = this.cloud;
    const count = given ? given.somas.length / 4 : 0;
    // A segment's word has room for its cell in the bits below its type.
    const named = count <= CELL_MASK + 1;
    if (!named) logError(`${count} cells, too many for their morphologies to be drawn`);
    const data = given && named && (!under || this.table?.cells === count) ? given : null;
    if (data && !under) {
      this.clear();
      this.makeTable(count);
    }
    this.showCloud(data === null);
    if (!data) {
      // Without the somas, the morphologies were all there was.
      if (under) this.bound();
      else this.clear();
      return;
    }

    const { materials } = this;
    const drawing = data.chunks ? this.arenaDrawing() : null;
    const stream =
      data.chunks &&
      DetailStream.of(
        data.chunks,
        this.detailRules.budget,
        quadGeometry(0),
        () => this.invalidate(),
        drawing?.uploadsOf,
        this.baseUpTo
      );
    const segments = stream ? stream.geometry : segmentGeometry(data);
    const onSegments = (drawn: THREE.Material[]) =>
      drawn.map((material, k) => quads(drawing?.quads[k] ?? segments, material));
    const segmentMeshes = onSegments(drawing?.segment ?? materials.segment);
    this.chunks.add(...segmentMeshes);

    this.uniforms.uSomas.value = somaTexture(data.somas);
    const { spheres, charts, cells } = placedSomas(data.somas, data.chart?.somas);
    const somas = quadGeometry(cells.length);
    somas
      .setAttribute('aSoma', new THREE.InstancedBufferAttribute(spheres, 4))
      .setAttribute('aSomaChart', new THREE.InstancedBufferAttribute(charts, 4))
      .setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 1));
    const somaMesh = quads(somas, materials.soma);
    // Beside `chunks`, which holds the segments.
    this.surfaces.add(somaMesh);

    const segmentIds = onSegments(drawing?.ids ?? materials.ids.segment);
    const ids = [...segmentIds, quads(somas, materials.ids.soma)];
    this.ids.add(...ids);
    let throughSegments: Quads[] = [];
    let through: Quads[] = [];
    if (materials.through) {
      const arenaThrough = drawing?.through;
      throughSegments = arenaThrough
        ? arenaThrough.materials.map((material, k) => quads(arenaThrough.quads[k], material))
        : onSegments(materials.through.segment);
      through = [...throughSegments, quads(somas, materials.through.soma)];
      this.throughs.add(...through);
    }
    // Drawn as the boxes come in.
    if (stream)
      for (const mesh of [...segmentMeshes, ...segmentIds, ...throughSegments]) mesh.visible = true;
    // Sections and offsets are known only of morphologies read whole.
    const spots = data.trees
      ? [...onSegments(materials.spots.segment), quads(somas, materials.spots.soma)]
      : [];
    if (spots.length > 0) this.spots.add(...spots);
    this.spotUniforms.uSegments.value = data.segmentCells.length;
    const detailed = stream ? { stream, chosenFor: null, seenChanged: false } : null;
    this.layer = { data, meshes: [...segmentMeshes, somaMesh, ...through], ids, spots, detailed };
    this.compileIds();

    if (under) {
      this.uniforms.uShift.value.fromArray(data.centre).sub(new THREE.Vector3(...this.centre));
    } else {
      this.centre = data.centre;
      this.drawElectrodes();
      this.drawSynapses();
    }
    this.drawMarkers();
    this.bound();
    if (unmoved || framesAgain(under?.somas.populations ?? null, data.populations)) {
      this.resetView();
    }
    this.tellDetail();
  }

  setDetailRules(rules: Partial<DetailRules>): void {
    const next = { ...this.detailRules, ...rules };
    if (isEqual(next, this.detailRules)) return;
    this.detailRules = next;
    if (!next.culling) this.culled = null;
    if (this.refitArena()) return;
    this.tellDetail();
    this.invalidate();
  }

  /**
   * The arena made again where it holds less than the budget asks of it, or keeps a base where `baseUpTo` would not,
   * its boxes read again. Whether it was.
   */
  protected refitArena(): boolean {
    const { layer, baseUpTo } = this;
    const { budget } = this.detailRules;
    if (!layer?.detailed || layer.detailed.stream.holds(budget, baseUpTo)) return false;
    const was = layer.detailed.stream;
    const stream = was.remade(budget, baseUpTo, quadGeometry(0));
    for (const mesh of [...layer.meshes, ...layer.ids]) {
      if (mesh.geometry === was.geometry) mesh.geometry = stream.geometry;
    }
    was.geometry.dispose();
    layer.detailed = { stream, chosenFor: null, seenChanged: false };
    this.culled = null;
    this.tellDetail();
    this.invalidate();
    return true;
  }

  onDetail(listener: (detail: DetailStats | null) => void): () => void {
    this.detailListeners.add(listener);
    listener(this.toldDetail);
    return () => this.detailListeners.delete(listener);
  }

  /**
   * Whether the tier culls the segments of morphologies read a box at a time, and the somas drawn alone
   * (`DetailRules.culling`).
   */
  protected get culls(): boolean {
    return this.detailRules.culling;
  }

  /** Where the arena of morphologies read a box at a time ends: what its quads are drawn up to. */
  protected get arenaEnd(): number {
    return this.layer?.detailed?.stream.geometry.instanceCount ?? 0;
  }

  /**
   * What the tier's culling counted, for the listeners: with what they were told last, which it alone changes; null
   * where it no longer culls. The boxes it marked are those seen, which the levels are chosen again by where that
   * changes what the view may want; at rest, those of the frames drawn in this rest alone.
   */
  protected tellCulled(read: CullRead | null): void {
    const detailed = this.layer?.detailed;
    // Read back after the culling was switched off, or the pack let go of.
    if (!this.culls || !detailed) return;
    const { stream } = detailed;
    let counts: CullCounts | null = null;
    let boxes: number[] | null = null;
    let still = false;
    if (read) {
      const { marked, rest, ...counted } = read;
      boxes = stream.boxesMarked(marked);
      counts = { ...counted, boxes: boxes.length };
      still = rest === stream.rest;
    }
    if (stream.see(boxes, still)) {
      detailed.seenChanged = true;
      this.invalidateAtRest();
    }
    this.culled = counts;
    if (this.toldDetail) this.tell({ ...this.toldDetail, culled: counts });
  }

  /** The rest a frame is drawn still in (`DetailStream.rest`), -1 for one drawn `moving`. */
  protected restOf(moving: boolean): number {
    return moving ? -1 : (this.layer?.detailed?.stream.rest ?? -1);
  }

  /**
   * A frame asked for where the view is `still`. Moving, what changed is drawn with the next move, or by the still frame
   * that follows the last.
   */
  private invalidateAtRest(still = !this.drawnMoving): void {
    if (still) this.invalidate();
  }

  /** The listeners told what is drawn of morphologies read a box at a time, where that changed. */
  private tellDetail(): void {
    const stats = this.layer?.detailed?.stream.stats(this.detailRules);
    this.tell(stats ? { ...stats, culled: this.culled } : null);
  }

  private tell(detail: DetailStats | null): void {
    if (isEqual(detail, this.toldDetail)) return;
    this.toldDetail = detail;
    for (const listener of this.detailListeners) listener(detail);
  }

  /**
   * The levels chosen again where the camera, the view's height, the rules, whether the view is still, the boxes seen
   * or what of the pack is in changed since they were last, and a frame asked for at rest where that lets go of boxes or
   * places some at once.
   * Here, not in `work`: the camera's near and far planes are set for the frame first.
   */
  protected override beforeDraw(moving: boolean): void {
    this.shapeCloud();
    this.cutDown(moving);
    const detailed = this.layer?.detailed;
    if (!detailed) return;
    const { camera } = this;
    const height = this.height * this.pixelRatio;
    const was = detailed.chosenFor;
    const still = !moving;
    // A stream made again for the budget keeps what it saw: none chosen yet is no move.
    const moved =
      was !== null &&
      (was.height !== height ||
        !was.projection.equals(camera.projectionMatrix) ||
        !was.view.equals(camera.matrixWorldInverse));
    if (
      !moved &&
      !detailed.seenChanged &&
      !detailed.stream.moreArrived &&
      was?.still === still &&
      was.rules === this.detailRules
    ) {
      return;
    }
    const chosenFor = was ?? { projection: new THREE.Matrix4(), view: new THREE.Matrix4() };
    chosenFor.projection.copy(camera.projectionMatrix);
    chosenFor.view.copy(camera.matrixWorldInverse);
    detailed.chosenFor = { ...chosenFor, height, rules: this.detailRules, still };
    detailed.seenChanged = false;
    const view = {
      projection: camera.projectionMatrix,
      view: camera.matrixWorldInverse,
      orthographic: camera instanceof THREE.OrthographicCamera,
      height,
      focus: this.controls.target,
      shift: this.uniforms.uShift.value,
    };
    if (detailed.stream.update(view, this.detailRules, still, moved)) this.invalidateAtRest(still);
    this.tellDetail();
  }

  /** Whether the camera is where the last framing left it, give or take what OrbitControls' arithmetic moves it by. */
  private unmoved(): boolean {
    const was = this.framedAt;
    if (!was) return false;
    const { camera, controls } = this;
    const near = (a: THREE.Vector3, b: THREE.Vector3) => a.distanceTo(b) <= 1e-6 * (1 + b.length());
    return (
      near(camera.position, was.position) &&
      near(controls.target, was.target) &&
      1 - Math.abs(camera.quaternion.dot(was.quaternion)) < 1e-9 &&
      Math.abs(camera.zoom - was.zoom) <= 1e-9 * was.zoom
    );
  }

  setSomas(somas: CircuitSomas | null, colors: CellColors | null = this.colors): void {
    const before = this.cloud?.somas.populations ?? null;
    this.colors = colors;
    this.clear();
    if (!somas) return;
    const cells = Math.floor(somas.positions.length / 3);
    this.makeTable(cells);
    const box = somasBox(somas.positions);
    const reframe = framesAgain(before, somas.populations);
    // Kept otherwise, so that the somas stay where they were drawn.
    if (reframe) this.centre = box?.mean ?? [0, 0, 0];
    const offset = this.cloudUniforms.uOffset.value.fromArray(this.centre);
    const pieces = cloudPieces(somas.positions).map(({ positions, cells, centre, reach }) => {
      const sphere = new THREE.Sphere(centre.sub(offset), reach);
      // One buffer each, which both shapes draw from.
      const position = new THREE.InstancedBufferAttribute(positions, 3);
      const cell = new THREE.InstancedBufferAttribute(cells, 1);
      const placed = (geometry: THREE.InstancedBufferGeometry) => {
        geometry.boundingSphere = sphere;
        return geometry.setAttribute('aPosition', position).setAttribute('aCell', cell);
      };
      const shape = placed(fanGeometry(cells.length));
      const pyramids = quads(shape, this.materials.cloud);
      const flat = quads(placed(quadGeometry(cells.length)), this.materials.cloud);
      const ids = quads(shape, this.materials.ids.cloud);
      for (const mesh of [pyramids, flat, ids]) mesh.frustumCulled = true;
      flat.visible = false;
      pyramids.name = flat.name = 'somas';
      this.surfaces.add(pyramids, flat);
      this.ids.add(ids);
      return { pyramids, flat, small: false, ids, reach };
    });
    this.cloud = { somas, box, pieces, whole: null, shown: true };
    this.placeSomas(
      somas.positions,
      pieces.map(({ pyramids }) => pyramids.geometry)
    );
    this.motion.reset();
    this.padPieces();
    this.wholeCloud();
    this.compileIds();
    this.bound();
    this.drawElectrodes();
    this.drawSynapses();
    if (reframe) this.resetView();
  }

  setSomaRadius(radius: number): void {
    if (radius === this.cloudUniforms.uRadius.value) return;
    this.cloudUniforms.uRadius.value = radius;
    this.padPieces();
    this.bound();
    if (this.cloud?.shown) this.invalidate();
  }

  /**
   * A moving frame over the somas alone drawn at the resolution `motion` steps it to, any other at the full one, and
   * whether it is timed. Morphologies are drawn through targets of the canvas's size, which a cut would make again.
   */
  private cutDown(moving: boolean): void {
    const alone = this.cloud?.shown === true;
    const rung = moving && alone ? this.motion.rung : null;
    const scale = rung?.scale ?? 1;
    if (scale !== this.drawnScale) {
      this.scaleDrawing(scale);
      this.drawnScale = scale;
      this.electrodeUniforms.uScale.value = scale;
    }
    // Drawn another way, as the occlusion left out, the first frames are slow again.
    if (rung !== this.drawnRung) {
      this.drawnRung = rung;
      this.steadyFrames = 0;
    }
    this.steadyFrames = moving ? this.steadyFrames + 1 : 0;
    this.timing = !alone
      ? null
      : !moving
        ? 'still'
        : this.steadyFrames > WAKE_FRAMES
          ? 'moving'
          : null;
  }

  /** What a frame timed as `timing` cost the GPU, ms. */
  protected measured(timing: 'moving' | 'still', ms: number): void {
    if (timing === 'moving') this.motion.add(ms);
    else this.motion.still(ms);
  }

  /** The view's size changed what a frame costs. */
  protected override frameChanged(): void {
    this.motion.reset();
  }

  /** Each piece of the cloud drawn as flat quads where its somas are small on screen, and as pyramids elsewhere. */
  private shapeCloud(): void {
    const { cloud } = this;
    if (!cloud?.shown || cloud.whole) return;
    const radius = this.cloudUniforms.uRadius.value * this.pixelRatio;
    for (const piece of cloud.pieces) {
      const sphere = piece.pyramids.geometry.boundingSphere as THREE.Sphere;
      const px = radius / this.cssPixelNear(sphere.getBoundingBox(pieceBox));
      piece.small = px < (piece.small ? PYRAMIDS_ABOVE_PX : QUADS_BELOW_PX);
    }
    this.showPieces();
  }

  /** Each piece's sphere round its somas as large as one glowing in full. */
  private padPieces(): void {
    const pad = this.cloudUniforms.uRadius.value * (1 + GLOW_SWELL);
    for (const { pyramids, reach } of this.cloud?.pieces ?? []) {
      (pyramids.geometry.boundingSphere as THREE.Sphere).radius = reach + pad;
    }
  }

  setAxons(shown: boolean): void {
    const hidden = shown ? HOLE : AXON;
    if (this.uniforms.uHidden.value === hidden) return;
    this.uniforms.uHidden.value = hidden;
    this.invalidate();
  }

  setSomaOpacity(opacity: number): void {
    const clamped = Number.isNaN(opacity) ? 1 : Math.min(1, Math.max(0, opacity));
    // At 0 a soma is still drawn, so that it can be picked and seen to spike.
    this.cloudUniforms.uOpacity.value = Math.max(clamped, 1 / 255);
    const translucent = clamped < 1;
    const { cloud } = this.materials;
    if (translucent !== cloud.transparent) {
      cloud.transparent = translucent;
      cloud.needsUpdate = true;
      this.wholeCloud();
    }
    if (this.cloud?.shown) this.invalidate();
  }

  /**
   * Translucent, the cloud drawn whole, in the page's order, as before it was cut into pieces: drawn a piece after
   * another, which of two overlapping somas blends over the other would follow the pieces, and show them. Made as the
   * somas turn translucent, and let go of as they turn opaque.
   */
  private wholeCloud(): void {
    const { cloud } = this;
    if (!cloud) return;
    const translucent = this.materials.cloud.transparent;
    if (translucent && !cloud.whole) {
      const { positions } = cloud.somas;
      const cells = new Uint32Array(Math.floor(positions.length / 3));
      for (let cell = 0; cell < cells.length; cell++) cells[cell] = cell;
      const geometry = fanGeometry(cells.length)
        .setAttribute('aPosition', new THREE.InstancedBufferAttribute(positions, 3))
        .setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 1));
      cloud.whole = quads(geometry, this.materials.cloud);
      cloud.whole.name = 'somas';
      this.surfaces.add(cloud.whole);
    } else if (!translucent && cloud.whole) {
      cloud.whole.geometry.dispose();
      this.letGo(cloud.whole);
      cloud.whole = null;
    }
    this.showPieces();
  }

  /**
   * The cloud's pieces as shown and as small as they were last found, where the tier does not cull them, or its whole
   * where it is drawn whole.
   */
  protected showPieces(): void {
    const { cloud } = this;
    if (!cloud) return;
    const pieces = cloud.shown && !cloud.whole && !this.cullsSomas;
    for (const piece of cloud.pieces) {
      piece.pyramids.visible = pieces && !piece.small;
      piece.flat.visible = pieces && piece.small;
      piece.ids.visible = cloud.shown;
    }
    if (cloud.whole) cloud.whole.visible = cloud.shown;
  }

  setCrowding(somas: CircuitSomas, crowding: Uint8Array | null): void {
    // Worked out for other somas.
    if (!this.table || this.cloud?.somas !== somas) return;
    this.table.setCrowding(crowding);
    if (this.cloud?.shown) this.invalidate();
  }

  /**
   * Over the somas, the view frames those drawn as the somas view did: centred on their mean, as far either side as the
   * farthest of them from it on each axis, and a soma's radius more; where none is drawn, all of them. Over their
   * morphologies, it frames those of the cells drawn about their middle, a pack's by its populations' boxes of the
   * sections drawn.
   */
  override resetView(): void {
    this.frameCells();
    const { camera, controls } = this;
    this.framedAt = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      zoom: camera.zoom,
      target: controls.target.clone(),
    };
  }

  private frameCells(): void {
    const { cloud, table, layer } = this;
    if (!cloud || !table) {
      super.resetView();
      return;
    }
    if (layer) {
      const { data } = layer;
      const shown = table.hides ? (cell: number) => table.shown(cell) : undefined;
      // A pack's segments are in its chunks, out of the extent's reach: its populations' boxes stand for them, or its
      // bounds where it keeps none.
      const drawn = data.chunks
        ? packExtent(data, (type) => type !== this.uniforms.uHidden.value, shown)
        : shown
          ? morphologiesExtent(data, shown)
          : null;
      this.frameBox(this.shifted(drawn ?? data.bounds));
      return;
    }
    const shown = table.hides ? somasBox(cloud.somas.positions, (cell) => table.shown(cell)) : null;
    const drawn = shown ?? cloud.box;
    if (!drawn) {
      super.resetView();
      return;
    }
    this.frameBox(this.somaBox(drawn, this.cloudUniforms.uRadius.value));
  }

  /** The view framed on `box`, about its middle, as `resetView` frames anything about the origin. */
  private frameBox(box: THREE.Box3): void {
    const middle = box.getCenter(new THREE.Vector3());
    this.fitPoints = Float32Array.from(boxCorners(box, middle));
    super.resetView();
    this.fitPoints = null;
    this.camera.position.add(middle);
    this.controls.target.copy(middle);
    this.controls.update();
  }

  /** The somas of `box`, `pad` more each way, where the view draws them. */
  private somaBox({ mean, reach }: SomasBox, pad: number): THREE.Box3 {
    const middle = new THREE.Vector3(...mean).sub(new THREE.Vector3(...this.centre));
    const half = new THREE.Vector3(...reach).addScalar(pad);
    return new THREE.Box3(middle.clone().sub(half), middle.add(half));
  }

  /** A box of the morphologies' frame, where the view draws it. */
  private shifted(bounds: CircuitMorphologyData['bounds']): THREE.Box3 {
    const shift = this.uniforms.uShift.value;
    return new THREE.Box3(
      new THREE.Vector3(...bounds.min).add(shift),
      new THREE.Vector3(...bounds.max).add(shift)
    );
  }

  setCellColors(colors: CellColors | null): void {
    // The somas may have come with them.
    if (colors === this.colors) return;
    this.colors = colors;
    this.paint();
  }

  setDefaultColor(color: string): void {
    if (color === this.defaultColor) return;
    this.defaultColor = color;
    this.paint();
  }

  get moving(): boolean {
    return this.drawnMoving;
  }

  setHighlight(cell: number | null): void {
    const highlighted = cell ?? NO_CELL;
    if (highlighted === this.uniforms.uHighlighted.value) return;
    this.uniforms.uHighlighted.value = highlighted;
    this.invalidate();
  }

  pick(x: number, y: number): Promise<number | null> {
    const { table, layer } = this;
    if (!table) return Promise.resolve(null);
    // Where the morphologies were read whole, the pick of a section tells the cell too, and the two share one read.
    const read = layer?.data.trees
      ? this.spotAt(x, y).then((n) => {
          const { segmentCells } = layer.data;
          if (n === null || this.layer !== layer) return null;
          return n < segmentCells.length ? segmentCells[n] : n - segmentCells.length;
        })
      : this.numberAround(this.ids, x, y);
    // Other data by now has other cells.
    return read.then((cell) => (this.table === table ? cell : null));
  }

  /** The segment or soma drawn nearest a point of the view, as `spots` numbers them; one read for a point at a time. */
  private spotAt(x: number, y: number): Promise<number | null> {
    const last = this.spotRead;
    if (last?.x === x && last.y === y) return last.read;
    const read = this.numberAround(this.spots, x, y);
    this.spotRead = { x, y, read };
    // Asked again later, the view may have moved.
    queueMicrotask(() => {
      if (this.spotRead?.read === read) this.spotRead = null;
    });
    return read;
  }

  pickSection(x: number, y: number): Promise<SectionSpot | null> {
    const layer = this.layer;
    if (!layer?.data.trees) return Promise.resolve(null);
    const { data } = layer;
    // Where the camera is now, and the morph, which the pick is drawn from.
    const onScreen = this.projector();
    const shift = this.uniforms.uShift.value.toArray() as Vec3;
    const mix = this.uniforms.uMix.value;
    const seen = (p: Vec3) => onScreen([p[0] + shift[0], p[1] + shift[1], p[2] + shift[2]]);
    return this.spotAt(x, y).then((n) => {
      if (n === null || this.layer !== layer) return null;
      const segments = data.segmentCells.length;
      let at: { cell: number; section: TreeSection; offset: number } | null;
      if (n >= segments) {
        const section = somaSectionOf(data, n - segments);
        at = section && { cell: n - segments, section, offset: 0.5 };
      } else {
        const end = (k: number) => {
          const shown = [0, 1, 2].map((c) =>
            morphed(data.segments, data.chart?.segments, 8 * n + k + c, mix)
          ) as Vec3;
          const { x: ex, y: ey } = seen(shown);
          return { x: ex * this.width, y: ey * this.height };
        };
        at = sectionAtSegment(data, n, along(end(0), end(4), { x, y }));
      }
      if (!at) return null;
      const { cell, section, offset } = at;
      const spot = pointAtOffset(data, cell, section, offset, mix);
      const screen = spot ? seen(spot) : { x: x / this.width, y: y / this.height };
      return {
        cell,
        sonataId: section.sonataId,
        type: section.type,
        offset,
        screen: { x: screen.x, y: screen.y },
      };
    });
  }

  /**
   * Where the camera now draws a point of the view's frame: as fractions of the view from its top left corner, and
   * whether it is in front of the eye.
   */
  private projector(): (p: Vec3) => ScreenPoint & { visible: boolean } {
    const { camera } = this;
    camera.updateMatrixWorld();
    const matrix = camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse);
    const perspective = camera instanceof THREE.PerspectiveCamera;
    const v = new THREE.Vector4();
    return ([px, py, pz]) => {
      v.set(px, py, pz, 1).applyMatrix4(matrix);
      const visible = !perspective || v.w > 0;
      const w = visible ? v.w : 1;
      return { x: (v.x / w + 1) / 2, y: (1 - v.y / w) / 2, visible };
    };
  }

  setLocationMarkers(markers: readonly LocationMarker[]): void {
    this.markers = markers;
    this.drawMarkers();
  }

  setLocationMarkerRadius(radius: number): void {
    if (radius === this.markerUniforms.uRadius.value) return;
    this.markerUniforms.uRadius.value = radius;
    if (this.markerDots?.visible) this.invalidate();
  }

  markerAt(x: number, y: number): ({ index: number } & MarkerOnScreen) | null {
    const markers = this.markersOnScreen();
    let found: ({ index: number } & MarkerOnScreen) | null = null;
    let nearest = MARKER_REACH;
    for (let index = 0; index < markers.length; index++) {
      const marker = markers[index];
      if (!marker?.visible) continue;
      const away = Math.hypot(marker.screen.x * this.width - x, marker.screen.y * this.height - y);
      if (away > nearest) continue;
      nearest = away;
      found = { index, ...marker };
    }
    return found;
  }

  onMarkersOnScreen(listener: (markers: readonly (MarkerOnScreen | null)[]) => void): () => void {
    this.markerListeners.add(listener);
    this.told = null;
    this.invalidate();
    return () => this.markerListeners.delete(listener);
  }

  /** The markers' listeners told where they are after a frame, where that is not where they were last told. */
  protected override afterDraw(): void {
    if (this.markerListeners.size === 0) return;
    const markers = this.markersOnScreen();
    if (this.told && drawnAlike(this.told, markers)) return;
    this.told = markers;
    for (const listener of this.markerListeners) listener(markers);
  }

  /** Where the camera now draws each marker, null for one that is not drawn. */
  private markersOnScreen(): (MarkerOnScreen | null)[] {
    const onScreen = this.projector();
    return this.markerPoints.map((marker) => {
      if (!marker) return null;
      const { x, y, visible } = onScreen(this.inView(marker.point));
      return { type: marker.type, screen: { x, y }, visible };
    });
  }

  /** A point of the circuit's frame in the view's. */
  private inView(p: Vec3): Vec3 {
    return [p[0] - this.centre[0], p[1] - this.centre[1], p[2] - this.centre[2]];
  }

  setElectrodes(electrodes: readonly ElectrodeGroup[], highlighted: string | null): void {
    this.electrodeGroups = electrodes;
    this.highlightedElectrode = highlighted;
    this.drawElectrodes();
  }

  setSynapses(groups: readonly SynapseGroup[]): void {
    if (groups === this.synapseGroups) return;
    this.synapseGroups = groups;
    this.drawSynapses();
  }

  setElectrodeRadius(radius: number): void {
    this.electrodeUniforms.uRadius.value = radius;
    this.electrodeUniforms.uMinRadius.value = minRadius(radius);
    if (this.electrodes?.visible) this.invalidate();
  }

  electrodeAt(x: number, y: number): ElectrodeHit | null {
    const { camera, centre, width, height } = this;
    camera.updateMatrixWorld();
    const perspective = camera instanceof THREE.PerspectiveCamera;
    // The µm a CSS pixel spans, at a unit's depth in perspective, as the shaders count it.
    const span = pixelSpan(camera.projectionMatrix, height);
    const radius = this.electrodeUniforms.uRadius.value;
    let found: ElectrodeHit | null = null;
    let nearest = Number.POSITIVE_INFINITY;
    for (const group of this.electrodeGroups) {
      const lit = group.id === this.highlightedElectrode;
      const xyz = group.coordinates;
      for (let i = 0; i + 2 < xyz.length; i += 3) {
        point.set(xyz[i] - centre[0], xyz[i + 1] - centre[1], xyz[i + 2] - centre[2]);
        point.applyMatrix4(camera.matrixWorldInverse);
        const depth = -point.z;
        if (perspective && depth <= camera.near) continue;
        const drawn = drawnRadius(radius, lit, perspective ? span * depth : span, this.pixelRatio);
        const reach = Math.max(drawn, CONTACT_REACH);
        point.applyMatrix4(camera.projectionMatrix);
        const away = Math.hypot(((point.x + 1) / 2) * width - x, ((1 - point.y) / 2) * height - y);
        if (away <= reach && away < nearest) {
          nearest = away;
          found = { id: group.id, contact: [xyz[i], xyz[i + 1], xyz[i + 2]] };
        }
      }
    }
    return found;
  }

  fromScreen(x: number, y: number, depthOf: Vec3): Vec3 {
    const { camera, centre, width, height } = this;
    camera.updateMatrixWorld();
    const depth = point
      .set(depthOf[0] - centre[0], depthOf[1] - centre[1], depthOf[2] - centre[2])
      .project(camera).z;
    point.set((2 * x) / width - 1, 1 - (2 * y) / height, depth).unproject(camera);
    return [point.x + centre[0], point.y + centre[1], point.z + centre[2]];
  }

  setSpikes(spikes: CircuitSpikes | null): void {
    const wasPlaying = this.spiking.playing;
    this.spiking.setSpikes(spikes);
    this.spikeFrame();
    if (wasPlaying) this.tellPlaying(false);
  }

  seekSpikes(timeInMs: number): void {
    if (timeInMs === this.spiking.timeInMs) return;
    this.spiking.timeInMs = timeInMs;
    this.spikeFrame();
  }

  setSpikesPlaying(playing: boolean): void {
    if (playing === this.spiking.playing) return;
    // Played at the end, the clock starts again from the beginning.
    this.spiking.playing = playing;
    this.spikeFrame();
    // The loop turns for `work` once it is going.
    if (playing) this.invalidate();
    this.tellPlaying(playing);
  }

  setSpikeSpeed(speed: number): void {
    if (speed === this.spiking.speed) return;
    this.spiking.speed = speed;
    this.showGlow();
  }

  setSpikeGlow(on: boolean): void {
    if (on === this.glowAsked) return;
    this.glowAsked = on;
    this.invalidate();
  }

  /** Whether spiking cells give off light (`setSpikeGlow`): asked, while there are spikes, round morphologies. */
  protected get glowing(): boolean {
    return this.glowAsked && this.spiking.replaying && this.drawsMorphologies;
  }

  setSpikeAfterglow(seconds: number): void {
    if (seconds === this.spiking.afterglowInSeconds) return;
    this.spiking.afterglowInSeconds = seconds;
    this.uniforms.uAfterglow.value = seconds;
    this.showGlow();
  }

  onSpikeTime(listener: (timeInMs: number) => void): () => void {
    this.spikeTimeListeners.add(listener);
    return () => this.spikeTimeListeners.delete(listener);
  }

  onSpikesPlaying(listener: (playing: boolean) => void): () => void {
    this.spikesPlayingListeners.add(listener);
    return () => this.spikesPlayingListeners.delete(listener);
  }

  /**
   * The boxes that came in placed, a little a turn. The replay's clock moves on by the time the last turn of the loop
   * took, which keeps turning while it plays.
   */
  protected override work(): boolean {
    const placing = this.placeBoxes();
    const morphing = this.morphFrame();
    const moving = this.nudgeFrame() || morphing || placing;
    if (!this.spiking.playing) return moving;
    const ended = this.spiking.advance();
    this.spikeFrame();
    if (ended) this.tellPlaying(false);
    return !ended || moving;
  }

  /** What came in of the boxes placed, and those no longer wanted let go of. Whether more is left to place. */
  private placeBoxes(): boolean {
    const stream = this.layer?.detailed?.stream;
    if (!stream) return false;
    const { changed, more } = stream.apply();
    if (changed) {
      this.invalidateAtRest();
      this.tellDetail();
    }
    return more;
  }

  setDendrogram(shown: boolean): void {
    const target = shown ? 1 : 0;
    if (target === this.morph.target) return;
    this.morph = { target, from: this.uniforms.uMix.value, start: performance.now() };
    // The chart is flat, so it is not turned, and faces the eye.
    this.controls.enableRotate = !shown;
    if (shown) this.resetView();
    this.invalidate();
  }

  /** The morph's mix for this frame, eased in and out, the markers going with it. Whether it goes on. */
  private morphFrame(): boolean {
    const { target, from, start } = this.morph;
    if (this.uniforms.uMix.value === target) return false;
    const done = Math.min(1, (performance.now() - start) / (MORPH_MS * Math.abs(target - from)));
    const eased = done < 0.5 ? 4 * done ** 3 : 1 - (2 - 2 * done) ** 3 / 2;
    this.uniforms.uMix.value = done < 1 ? from + (target - from) * eased : target;
    this.drawMarkers();
    this.invalidate();
    return done < 1;
  }

  nudge(): void {
    if (this.nudging) return;
    this.nudging = { start: performance.now(), rest: this.zoom, set: this.zoom };
    this.invalidate();
  }

  /** The nudge's zoom for this frame, as morphoviewer's: a sine's hump. Whether it goes on. */
  private nudgeFrame(): boolean {
    const nudging = this.nudging;
    if (!nudging) return false;
    // Zoomed meanwhile, by the slider say: the view is the user's.
    if (this.zoom !== nudging.set) {
      this.nudging = null;
      return false;
    }
    const done = Math.min(1, (performance.now() - nudging.start) / NUDGE_MS);
    nudging.set =
      done < 1 ? nudging.rest * (1 + NUDGE_GROWTH * Math.sin(done * Math.PI)) : nudging.rest;
    this.setZoom(nudging.set);
    if (done < 1) return true;
    this.nudging = null;
    return false;
  }

  /** A frame only where a cell glows otherwise: before the first spike, a playing replay draws nothing. */
  private showGlow(): void {
    if (this.table?.glow(this.spiking.glow, this.spiking.lit)) this.invalidate();
  }

  /** The glow at the replay's moment, which the listeners are told of. */
  private spikeFrame(): void {
    this.showGlow();
    const { timeInMs } = this.spiking;
    for (const listener of this.spikeTimeListeners) listener(timeInMs);
  }

  private tellPlaying(playing: boolean): void {
    for (const listener of this.spikesPlayingListeners) listener(playing);
  }

  /**
   * The contacts as they are now, in a mesh drawn after the cells, over them, made larger only when they outgrow it. A
   * frame only where that changed what is drawn.
   */
  private drawElectrodes(): void {
    this.electrodes = this.drawDots(this.electrodes, this.electrodeGroups, {
      material: this.materials.electrode,
      name: 'electrodes',
      order: 1,
      highlighted: this.highlightedElectrode,
    });
  }

  /** The synapses where the circuit's frame puts them, after the cells, which hide those behind them. */
  private drawSynapses(): void {
    this.synapseDots = this.drawDots(this.synapseDots, this.synapseGroups, {
      material: this.materials.synapse,
      name: 'synapses',
      order: 0.5,
    });
  }

  /** The markers where the morphologies drawn put them, after the electrodes and over them. */
  private drawMarkers(): void {
    const data = this.layer?.data;
    this.markerPoints = this.markers.map(({ cell, sonataId, offset }) => {
      if (!data) return null;
      const section = sectionNumbered(data, cell, sonataId);
      const at = section && pointAtOffset(data, cell, section, offset, this.uniforms.uMix.value);
      if (!section || !at) return null;
      return { point: at.map((v, k) => v + data.centre[k]) as Vec3, type: section.type };
    });
    const drawn = this.markerPoints.flatMap((marker, index) =>
      marker ? [{ color: this.markers[index].color, coordinates: marker.point }] : []
    );
    this.markerDots = this.drawDots(this.markerDots, drawn, {
      material: this.materials.marker,
      name: 'location markers',
      order: 2,
    });
  }

  /**
   * `groups`' dots in `mesh`, drawn after the cells and over them, the group `highlighted` larger and lighter, a mesh
   * made larger only when they outgrow it. A frame only where what is drawn changed.
   */
  private drawDots(
    mesh: Quads | null,
    groups: readonly DotGroup[],
    {
      material,
      name,
      order,
      highlighted = null,
    }: { material: THREE.Material; name: string; order: number; highlighted?: string | null }
  ): Quads | null {
    const count = countDots(groups);
    if (count === 0 && !mesh?.visible) return mesh;
    const changed = !mesh || count !== mesh.geometry.instanceCount;
    let dots = mesh;
    if (!dots || count > dots.geometry.getAttribute('aContact').count) {
      dots?.geometry.dispose();
      if (dots) this.letGo(dots);
      const geometry = quadGeometry(count);
      geometry
        .setAttribute(
          'aContact',
          new THREE.InstancedBufferAttribute(new Float32Array(3 * count), 3)
        )
        .setAttribute('aLook', new THREE.InstancedBufferAttribute(new Float32Array(4 * count), 4));
      dots = quads(geometry, material);
      dots.name = name;
      dots.renderOrder = order;
      this.scene.add(dots);
    }
    dots.geometry.instanceCount = count;
    dots.visible = count > 0;
    const contacts = dots.geometry.getAttribute('aContact') as THREE.InstancedBufferAttribute;
    const looks = dots.geometry.getAttribute('aLook') as THREE.InstancedBufferAttribute;
    const written = writeDots(
      groups,
      highlighted,
      this.centre,
      contacts.array as Float32Array,
      looks.array as Float32Array
    );
    if (written) {
      contacts.needsUpdate = true;
      looks.needsUpdate = true;
    }
    if (written || changed) this.invalidate();
    return dots;
  }

  /** A cell table for `cells` cells, which the shaders read, painted, and glowing as the replay is. */
  private makeTable(cells: number): void {
    this.table = new CellTable(cells);
    this.uniforms.uCells.value = this.table.texture;
    this.uniforms.uGlow.value = this.table.glowTexture;
    this.cloudUniforms.uShade.value = this.table.shadeTexture;
    this.paint();
    this.spiking.setCellCount(cells);
    this.showGlow();
  }

  /** The pick's programs begin to build now, not at the first pick, which would wait for them. */
  private compileIds(): void {
    this.compile(this.ids);
    if (this.spots.children.length > 0) this.compile(this.spots);
  }

  /**
   * `bounds` round what there is: every soma of the cloud, drawn or not and as large as one glowing in full, and the
   * morphologies.
   */
  private bound(): void {
    const all = new THREE.Box3();
    const box = this.cloud?.box;
    if (box) all.copy(this.somaBox(box, this.cloudUniforms.uRadius.value * (1 + GLOW_SWELL)));
    if (this.layer) all.union(this.shifted(this.layer.data.bounds));
    if (!all.isEmpty()) this.bounds.copy(all);
  }

  /** The cloud and its pick shown, or not while the morphologies take their place. */
  private showCloud(shown: boolean): void {
    if (this.cloud) this.cloud.shown = shown;
    this.showPieces();
    this.invalidate();
  }

  /**
   * `meshes` out of the view, each disposed once the next of its material is let go of: WebGPU keeps what three holds of
   * a mesh until it is disposed, and three lets go of a material's programs with its last mesh, which the quads that
   * take their place would build again.
   */
  protected letGo(...meshes: Quads[]): void {
    for (const mesh of meshes) {
      mesh.removeFromParent();
      const material = mesh.material as THREE.Material;
      this.kept.get(material)?.dispose();
      this.kept.set(material, mesh);
    }
  }

  /** Let go of the morphologies, and of nothing else. */
  private clearMorphologies(): void {
    const meshes = this.layer?.meshes ?? [];
    for (const geometry of new Set(meshes.map((mesh) => mesh.geometry))) geometry.dispose();
    this.letGo(...meshes, ...(this.layer?.ids ?? []), ...(this.layer?.spots ?? []));
    this.layer?.detailed?.stream.stop();
    this.layer = null;
    this.uniforms.uSomas.value?.dispose();
    this.uniforms.uSomas.value = null;
    this.culled = null;
    this.uniforms.uShift.value.set(0, 0, 0);
    // They sit on the morphologies.
    this.drawMarkers();
    this.tellDetail();
    this.invalidate();
  }

  private paint(): void {
    if (!this.table) return;
    this.table.paint(this.colors, this.defaultColor);
    const sections = this.table.sectionColors;
    if (sections) setSectionColours(this.uniforms, sections);
    this.invalidate();
  }

  private clear(): void {
    this.clearMorphologies();
    if (this.cloud) this.placeSomas(null, []);
    for (const { pyramids, flat, ids } of this.cloud?.pieces ?? []) {
      pyramids.geometry.dispose();
      flat.geometry.dispose();
      this.letGo(pyramids, flat, ids);
    }
    const whole = this.cloud?.whole;
    whole?.geometry.dispose();
    if (whole) this.letGo(whole);
    this.cloud = null;
    this.table?.dispose();
    this.table = null;
    this.uniforms.uCells.value = null;
    this.uniforms.uGlow.value = null;
    this.cloudUniforms.uShade.value = null;
    this.uniforms.uHighlighted.value = NO_CELL;
    this.invalidate();
  }
}
