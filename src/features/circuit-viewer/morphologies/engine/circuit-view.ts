import chroma from 'chroma-js';
import { isEqual } from 'es-toolkit';
import * as THREE from 'three';

import { DEFAULT_SPIKE_GLOW, SpikeClock } from '@/features/circuit-viewer/spike-clock';
import { CANVAS_DARK, CANVAS_LIGHT } from '@/features/scan-config/components/color-by/contrast';
import { DEFAULT_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';
import { boxCorners } from '@/features/viewer-3d/engine/framing';
import { backgroundCss, createLooks, PLAIN } from '@/features/viewer-3d/engine/looks';
import {
  DEFAULT_MOTION,
  type MotionOptions,
  MotionQuality,
  WAKE_FRAMES,
} from '@/features/viewer-3d/engine/motion-quality';
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
import { CellTable, type GlowRowsWriter, somaTexture } from './cell-table';
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
import type { MortonSorted } from '../load/morton';
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
 * The colour of the highlighted cell and of the ring round each contact: farther from the background than any palette
 * colour.
 */
const FOREGROUND: ThemeColors = { light: '#1a1a1a', dark: '#ffffff' };

/** How far around the pixel asked for a pick looks, in CSS pixels, as the somas view does. */
const PICK_REACH = 4;
/**
 * How far from a contact's centre, in CSS pixels, a point still counts as on it, however small the contact is drawn:
 * the somas view's 14 device pixels on a screen of pixel ratio 2.
 */
const CONTACT_REACH = 7;
/** A location marker's default radius in µm, and the least radius it is drawn with in CSS pixels: morphoviewer's. */
const MARKER_RADIUS = 3;
const MARKER_MIN_RADIUS = 3;
/** How far from a marker's centre, in CSS pixels, a point still counts as on it, as in morphoviewer. */
const MARKER_REACH = 9;
/** A synapse's radius in µm, and the least radius it is drawn with in device pixels, as in the small-circuit view. */
const SYNAPSE_RADIUS = 0.5;
const SYNAPSE_MIN_RADIUS = 2;
/** How long the nudge lasts, in ms, and how much nearer it brings the view at its peak, as in morphoviewer. */
const NUDGE_MS = 900;
const NUDGE_GROWTH = 0.06;
/** How long a full morph into the dendrogram, or back, takes in ms, as in morphoviewer. */
const MORPH_MS = 600;
/**
 * Moving frames over the somas alone are cut down as in the EM mesh viewer, but a step down in resolution is kept only
 * where it saves a tenth: drawn front first, many somas cost more in corners than in pixels.
 */
const MOTION: MotionOptions = { ...DEFAULT_MOTION, leastSaving: 0.1 };
/**
 * Over morphologies, moving frames only leave out the occlusion: the morphologies are drawn through targets the size
 * of the canvas, and a cut in resolution would make those targets again.
 */
const MORPHOLOGY_MOTION: MotionOptions = { ...DEFAULT_MOTION, scale: 1 };
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

/** What a frame is timed for: whether it is moving or still, and the motion it was drawn under, told what it cost. */
export interface FrameTiming {
  kind: 'moving' | 'still';
  motion: MotionQuality;
}

/** The pick's window of the view: the whole view's size and the window's top left corner, device pixels, y down. */
export interface PickWindow {
  width: number;
  height: number;
  left: number;
  top: number;
}

/** Either tier's renderer, as the pick draws with it into a target `T`. */
interface PickRenderer<T> {
  setRenderTarget(target: T | null): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
}

/** Clears the `pixels` of the pick's window `at` (rows top down) past the view's edges: the pick draws past them. */
function inView(pixels: Uint8Array, side: number, at: PickWindow): Uint8Array {
  for (let row = 0; row < side; row++) {
    for (let column = 0; column < side; column++) {
      const x = at.left + column;
      const y = at.top + row;
      if (x < 0 || y < 0 || x >= at.width || y >= at.height) {
        pixels.fill(0, 4 * (row * side + column), 4 * (row * side + column + 1));
      }
    }
  }
  return pixels;
}

/**
 * How a tier draws a pack's segments, read a box at a time, without three's attributes: where the arena's arrays go,
 * the segment materials for the look and for cell numbers, and, in the same order, the quads each material draws on.
 */
export interface ArenaDrawing {
  uploadsOf: UploadsOf;
  segment: THREE.Material[];
  ids: THREE.Material[];
  quads: THREE.InstancedBufferGeometry[];
  /** The lit cells drawn through what covers them (`CircuitMaterials.through`), on quads of their own. */
  through?: { materials: THREE.Material[]; quads: THREE.InstancedBufferGeometry[] };
}

/**
 * Morphologies read a box at a time: the stream that reads and places them; the camera, view height, rules and
 * stillness their levels were last chosen for; and whether the boxes seen have changed since.
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
  const placedSpheres = spheres.subarray(0, 4 * placed);
  return {
    spheres: placedSpheres,
    charts: charts === spheres ? placedSpheres : charts.subarray(0, 4 * placed),
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

/** Whether neither set of populations contains the other: another circuit, or one population swapped for another. */
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

/** The box of the somas in `positions` that `keep` keeps; null where it keeps none that has a position. */
function somasBox(positions: Float32Array, keep?: (cell: number) => boolean): SomasBox | null {
  const extent = extentOf(positions, keep);
  if (!extent) return null;
  const { min, max, mean } = extent;
  return { mean, reach: mean.map((m, k) => Math.max(max[k] - m, m - min[k])) as Vec3 };
}

/**
 * The materials a tier draws the circuit with, all reading the uniforms of `CircuitView`: the segments and the
 * morphologies' somas in the look; the cloud of somas; the same three in cell numbers for the pick; the segments and
 * somas in segment numbers for the pick of a section; and the dots. The segments are drawn once per material, over the
 * same quads, and each material draws its own share of them.
 */
export interface CircuitMaterials {
  segment: THREE.Material[];
  soma: THREE.Material;
  cloud: THREE.Material;
  /** The cloud drawn whole, translucent, each soma the cell of its instance. */
  wholeCloud: THREE.Material;
  ids: { segment: THREE.Material[]; soma: THREE.Material; cloud: THREE.Material };
  spots: { segment: THREE.Material[]; soma: THREE.Material };
  /** The lit cells drawn over the frame, through what covers them, where the tier draws them (`throughs`). */
  through?: { segment: THREE.Material[]; soma: THREE.Material };
  electrode: THREE.Material;
  synapse: THREE.Material;
  marker: THREE.Material;
}

/**
 * Draws a circuit's morphologies on a `SceneView` in the Studio look, whichever GPU interface is used: one quad per
 * segment and one per soma (`impostors.ts`), each cell coloured and shown or hidden by its texel in the cell table, and
 * electrode contacts in front of them (`electrodes.ts`). Until a circuit's morphologies arrive, or without them, its
 * somas are drawn as the somas view drew them (`soma-cloud.ts`), from the page's positions; the morphologies then take
 * their place, over the same cells, in the same view. A spike replay lights the cells as they fire, on a clock
 * (`SpikeClock`) that each turn of the loop moves on.
 *
 * The tier makes the renderer on the canvas and its materials (`materials`) on the uniforms here, then calls `start`.
 * It draws frames, draws a scene for a pick into its target and reads it back (`readPick`), and builds the pick's
 * programs (`compile`). The arrays are drawn from as the reader made them, and kept so they can be uploaded again.
 */
export abstract class CircuitView extends SceneView implements CircuitMorphologyView {
  /** The look. The tier takes its material's shading and its lights, which ride on the camera. */
  protected look: Look;
  protected abstract materials: CircuitMaterials;
  /** The side of the pick's target, in device pixels. */
  protected readonly pickSide: number;
  /** The segments' quads. */
  private chunks = new THREE.Group();
  /** The segments, the morphologies' somas and the cloud: what the cells are. */
  private surfaces = new THREE.Group();
  /** Quads of the lit cells, drawn through what covers them; the tier draws them over the frame. */
  protected readonly throughs = new THREE.Scene();
  protected uniforms = impostorUniforms();
  /**
   * The morphologies; the quads of their segments and somas; the same quads for the pick, and for the pick of a section
   * where the morphologies were read whole; and, where they are read a box at a time, what reads them.
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
  /**
   * An arena keeps every box's coarsest level (`DetailStream`) only where it then holds no more than this many
   * segments. The tier sets it.
   */
  protected baseUpTo = 0;
  /** The quads of the morphologies in their segments' numbers, drawn for a pick of a section alone. */
  private spots = new THREE.Scene();
  protected spotUniforms = { uSegments: { value: 0 } };
  /** The read of `spots` at a point asked for in this task; the picks of the cell and of the section there share it. */
  private spotRead: { x: number; y: number; read: Promise<number | null> } | null = null;
  protected cloudUniforms = somaCloudUniforms();
  /**
   * The somas the cloud draws (their populations decide whether the next somas are framed), the box round all of them,
   * their pieces (`cloudPieces`), the whole cloud once translucent (`wholeCloud`), and whether the cloud is shown.
   */
  private cloud: {
    somas: CircuitSomas;
    box: SomasBox | null;
    pieces: CloudMeshes[];
    whole: Quads | null;
    shown: boolean;
    /** The order the pieces wait for, worked out off the page; null once they are cut. */
    cutting: Promise<MortonSorted> | null;
  } | null = null;
  /**
   * How much frames drawn while the view moves over the somas alone are cut down, by what they cost the GPU (`MOTION`):
   * first the occlusion is left out, then the resolution drops.
   */
  private motion = new MotionQuality({ ...MOTION, ao: this.occludes ? 'auto' : 'off' });
  /** The same over morphologies, where the tier draws the occlusion; null where it does not. */
  private morphologyMotion = this.occludes ? new MotionQuality(MORPHOLOGY_MOTION) : null;
  /** For either motion: the fraction of the resolution the last frame was drawn at, and the moving frames drawn so. */
  private drawnScale = 1;
  private drawnRung: MovingFrame | null = null;
  private steadyFrames = 0;
  /**
   * What the current frame is timed for; the tier passes it to `measured`. Moving frames count only from the third one
   * drawn the same way, as a GPU waking up draws its first ones slowly. Still frames count. Null where nothing is cut
   * down.
   */
  protected timing: FrameTiming | null = null;
  /** Whether a moving frame keeps the occlusion, where the tier draws one. */
  protected get aoMoving(): boolean {
    return this.motionNow()?.rung.ao === true;
  }

  /** What cuts down moving frames of what is drawn now: the somas alone, or morphologies. */
  private motionNow(): MotionQuality | null {
    if (this.cloud?.shown) return this.motion;
    return this.drawsMorphologies ? this.morphologyMotion : null;
  }
  /** The cloud and the morphologies in their cells' numbers, drawn for a pick alone. */
  private ids = new THREE.Scene();
  /** For each material, the quads last let go of (`letGo`). */
  private kept = new Map<THREE.Material, Quads>();
  private table: CellTable | null = null;
  private colors: CellColors | null = null;
  private defaultColor = DEFAULT_NEURON_COLOR;
  protected background = CANVAS_LIGHT;
  /** The offset taken off the data's positions; the electrodes come in the circuit's own frame. */
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
   * `pixelRatio`: the device pixels a CSS pixel is drawn with; `budget`: how many segments the tier draws at once until
   * told otherwise.
   */
  constructor(
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    protected readonly pixelRatio: number,
    budget: number
  ) {
    super(container, canvas);
    this.detailRules = { budget, pixels: DETAIL_PIXELS, wholeFloor: true, culling: true };
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
    // A gesture takes over the view: otherwise the nudge's zoom would stop the gesture's glide every frame.
    this.controls.addEventListener('start', () => {
      this.nudging = null;
    });
  }

  /** Once the tier has its renderer and materials: sets the theme and canvas size, and asks for the first frame. */
  protected start(): void {
    this.setDark(false);
    this.fitCanvas();
    this.invalidate();
  }

  /** Whether morphologies are drawn, in place of the somas. */
  protected get drawsMorphologies(): boolean {
    return this.layer !== null;
  }

  /** Whether the somas are translucent, and so drawn whole (`wholeCloud`). */
  private get translucent(): boolean {
    return this.materials.cloud.transparent;
  }

  /** Whether the cloud is drawn whole: translucent, or not cut into its pieces yet. */
  private get drawnWhole(): boolean {
    return this.translucent || this.cloud?.pieces.length === 0;
  }

  /** Whether the somas are drawn alone and opaque. */
  protected get drawsOpaqueSomas(): boolean {
    return this.cloud?.shown === true && !this.translucent;
  }

  /** Whether the tier draws ambient occlusion. */
  protected get occludes(): boolean {
    return false;
  }

  /** Called when the tier gives up on occlusion: moving frames no longer step through it. */
  protected occlusionGone(): void {
    this.motion.configure({ ...MOTION, ao: 'off' });
    this.morphologyMotion = null;
  }

  /** Whether the tier culls the somas drawn alone and opaque, drawing them itself in place of the cloud's pieces. */
  protected get cullsSomas(): boolean {
    return false;
  }

  /**
   * Tells the tier of the cloud's somas, which it culls (`cullsSomas`). Once they are set, `positions` holds three
   * floats a cell and `pieces` the pyramids of the pieces they are cut into; once they are let go of, there are none.
   */
  protected placeSomas(
    _positions: Float32Array | null,
    _pieces: readonly THREE.InstancedBufferGeometry[]
  ): void {}

  /** Draws the canvas at `scale` of the resolution, scaled up onto the page. */
  protected abstract scaleDrawing(scale: number): void;

  /** Draw `scene` into the pick's target (`drawPick`) for `at`, and read the target's pixels, rows top down. */
  protected abstract readPick(scene: THREE.Scene, at: PickWindow): Promise<Uint8Array>;

  /**
   * Draws `scene` with `renderer` into `target`, which holds exactly the pick's window `at` of the view. A viewport
   * larger than the target, such as the whole view at an offset, makes Safari 27 drop the pass.
   */
  protected drawPick<T>(
    renderer: PickRenderer<T>,
    target: T,
    scene: THREE.Scene,
    at: PickWindow
  ): void {
    const { camera } = this;
    const side = this.pickSide;
    camera.setViewOffset(at.width, at.height, at.left, at.top, side, side);
    try {
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
    } finally {
      renderer.setRenderTarget(null);
      camera.clearViewOffset();
    }
  }

  /** Begin to build the programs that draw `scene` for the pick, so that the first pick does not wait for them. */
  protected abstract compile(scene: THREE.Scene): void;

  /** How a pack's arena is drawn; null draws it on three's attributes with the materials of morphologies read whole. */
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
    // Put the pixel asked for at the target's middle, at full resolution even where a moving frame was drawn at less.
    const at = {
      width: Math.floor(this.width * ratio),
      height: Math.floor(this.height * ratio),
      left: Math.floor(x * ratio) - middle,
      top: Math.floor(y * ratio) - middle,
    };
    // No frame may have been drawn since the camera last moved.
    this.readyCamera();
    return this.readPick(scene, at).then(
      (pixels) => cellNearMiddle(inView(pixels, side, at), side),
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
   * Over the somas of the same cells, the morphologies take their place: they are drawn where the circuit's frame puts
   * them, and reframed only where new somas would be (`setSomas`). Over somas of other cells, they are not drawn. Null
   * gives the somas their place back. Without somas, the morphologies are all there is, drawn about their own centre.
   * With `follow`, a view that has not moved since the last framing is framed on them.
   */
  setData(given: CircuitMorphologyData | null, follow = false): void {
    const unmoved = follow && this.unmoved();
    this.clearMorphologies();
    // The somas keep the cell table, the origin and the view; morphologies of other cells are not drawn over them.
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
    const sphereAttribute = new THREE.InstancedBufferAttribute(spheres, 4);
    // Without a dendrogram the same attribute stands for it, one buffer on the GPU.
    somas
      .setAttribute('aSoma', sphereAttribute)
      .setAttribute(
        'aSomaChart',
        charts === spheres ? sphereAttribute : new THREE.InstancedBufferAttribute(charts, 4)
      )
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
    // Start over: dropping the occlusion for other morphologies says nothing about these.
    this.morphologyMotion?.configure(MORPHOLOGY_MOTION);
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
   * Makes the arena again, and reads its boxes again, where it holds less than the budget asks of it or keeps a base
   * where `baseUpTo` would not. Returns whether it did.
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
   * Tells the listeners what the tier's culling counted, with the rest as they were told last; `read` is null where the
   * tier no longer culls. The boxes the culling marked become the boxes seen, and the levels are chosen again where
   * that changes what the view may want. A read counts as still only where its frame was drawn in the current rest.
   */
  protected tellCulled(read: CullRead | null): void {
    const detailed = this.layer?.detailed;
    // Ignore a read that comes back after the culling was switched off or the pack was let go of.
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

  /** The rest (`DetailStream.rest`) a still frame is drawn in; -1 for a frame drawn `moving`. */
  protected restOf(moving: boolean): number {
    return moving ? -1 : (this.layer?.detailed?.stream.rest ?? -1);
  }

  /**
   * Asks for a frame where the view is `still`. While the view moves, the change is drawn with the next move, or by the
   * still frame that follows the last one.
   */
  private invalidateAtRest(still = !this.drawnMoving): void {
    if (still) this.invalidate();
  }

  /** Tells the listeners what is drawn of morphologies read a box at a time, where that changed. */
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
   * Chooses the levels again where any of these changed since the last choice: the camera, the view's height, the
   * rules, whether the view is still, the boxes seen, or how much of the pack has arrived. Asks for a frame at rest
   * where that lets go of boxes or places some at once.
   * This runs here, not in `work`, because the camera's near and far planes are set for the frame first.
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
    // A stream remade for the budget keeps what it saw, so having no levels chosen yet is not a move.
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

  setSomas(
    somas: CircuitSomas | null,
    colors: CellColors | null = this.colors,
    ordered?: Promise<MortonSorted>
  ): void {
    const before = this.cloud?.somas.populations ?? null;
    this.colors = colors;
    this.clear();
    if (!somas) return;
    const cells = Math.floor(somas.positions.length / 3);
    this.makeTable(cells);
    const box = somasBox(somas.positions);
    const reframe = framesAgain(before, somas.populations);
    // Otherwise the centre is kept, so that the somas stay where they were drawn.
    if (reframe) this.centre = box?.mean ?? [0, 0, 0];
    this.cloudUniforms.uOffset.value.fromArray(this.centre);
    this.cloud = { somas, box, pieces: [], whole: null, shown: true, cutting: ordered ?? null };
    this.motion.reset();
    if (!ordered) this.cutCloud(somas);
    this.wholeCloud();
    this.bound();
    this.drawElectrodes();
    this.drawSynapses();
    if (reframe) this.resetView();
    if (!ordered) return;
    // Cut the cloud once the order arrives, and draw it whole until then; ignore an order asked for another cloud.
    ordered.then(
      (sorted) => {
        if (this.cloud?.cutting === ordered) this.cutCloud(somas, sorted);
      },
      (e: unknown) => {
        if (this.cloud?.cutting !== ordered) return;
        logError('Could not work out the order of the somas off the page', e);
        this.cutCloud(somas);
      }
    );
  }

  /** Cuts the cloud of `somas` into its pieces (`cloudPieces`), in the order `sorted` gives, or one worked out here. */
  private cutCloud(somas: CircuitSomas, sorted?: MortonSorted): void {
    const { cloud } = this;
    if (!cloud || cloud.pieces.length > 0) return;
    cloud.cutting = null;
    const offset = this.cloudUniforms.uOffset.value;
    const pieces = cloudPieces(somas.positions, sorted).map(
      ({ positions, cells, centre, reach }) => {
        const sphere = new THREE.Sphere(centre.sub(offset), reach);
        // One buffer each, which both shapes share.
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
      }
    );
    cloud.pieces = pieces;
    this.placeSomas(
      somas.positions,
      pieces.map(({ pyramids }) => pyramids.geometry)
    );
    this.padPieces();
    this.showPieces();
    this.compileIds();
    this.invalidate();
  }

  setSomaRadius(radius: number): void {
    if (radius === this.cloudUniforms.uRadius.value) return;
    this.cloudUniforms.uRadius.value = radius;
    this.padPieces();
    this.bound();
    if (this.cloud?.shown) this.invalidate();
  }

  /**
   * Draws a moving frame at the resolution its motion steps it to (`motionNow`) and any other at the full one, and
   * decides whether the frame is timed.
   */
  private cutDown(moving: boolean): void {
    const motion = this.motionNow();
    const rung = moving && motion ? motion.rung : null;
    const scale = rung?.scale ?? 1;
    if (scale !== this.drawnScale) {
      this.scaleDrawing(scale);
      this.drawnScale = scale;
      this.electrodeUniforms.uScale.value = scale;
    }
    // When frames are drawn another way, such as without the occlusion, the first ones are slow again.
    if (rung !== this.drawnRung) {
      this.drawnRung = rung;
      this.steadyFrames = 0;
    }
    this.steadyFrames = moving ? this.steadyFrames + 1 : 0;
    const kind = !moving ? 'still' : this.steadyFrames > WAKE_FRAMES ? 'moving' : null;
    this.timing = motion && kind ? { kind, motion } : null;
  }

  /** What a frame timed as `timing` cost the GPU, ms. */
  protected measured({ kind, motion }: FrameTiming, ms: number): void {
    if (kind === 'moving') motion.add(ms);
    else motion.still(ms);
  }

  /** The view's size changed what a frame costs. */
  protected override frameChanged(): void {
    this.motion.reset();
    this.morphologyMotion?.reset();
  }

  /** Draws each piece of the cloud as flat quads where its somas are small on screen, and as pyramids elsewhere. */
  private shapeCloud(): void {
    const { cloud } = this;
    if (!cloud?.shown || this.translucent) return;
    const radius = this.cloudUniforms.uRadius.value * this.pixelRatio;
    for (const piece of cloud.pieces) {
      const sphere = piece.pyramids.geometry.boundingSphere as THREE.Sphere;
      const px = radius / this.cssPixelNear(sphere.getBoundingBox(pieceBox));
      piece.small = px < (piece.small ? PYRAMIDS_ABOVE_PX : QUADS_BELOW_PX);
    }
    this.showPieces();
  }

  /** Makes each piece's bounding sphere large enough for its somas glowing in full. */
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
   * Draws a translucent cloud whole, in the page's order, as before it was cut into pieces. If it were drawn piece by
   * piece, the pieces would decide which of two overlapping somas blends over the other, and they would show. The cloud
   * is also drawn whole until it is cut (`cutCloud`). The whole mesh is made the first time it is needed and then kept,
   * hidden while the pieces are shown.
   */
  private wholeCloud(): void {
    const { cloud } = this;
    if (!cloud) return;
    if (this.drawnWhole && !cloud.whole) {
      const { positions } = cloud.somas;
      const geometry = fanGeometry(Math.floor(positions.length / 3)).setAttribute(
        'aPosition',
        new THREE.InstancedBufferAttribute(positions, 3)
      );
      cloud.whole = quads(geometry, this.materials.wholeCloud);
      cloud.whole.name = 'somas';
      this.surfaces.add(cloud.whole);
    }
    this.showPieces();
  }

  /**
   * Shows the cloud's pieces as the cloud is shown and as small as they were last found, where the tier does not cull
   * them; or the whole cloud where it is drawn whole.
   */
  protected showPieces(): void {
    const { cloud } = this;
    if (!cloud) return;
    const pieces = cloud.shown && !this.translucent && !this.cullsSomas;
    for (const piece of cloud.pieces) {
      piece.pyramids.visible = pieces && !piece.small;
      piece.flat.visible = pieces && piece.small;
      piece.ids.visible = cloud.shown;
    }
    if (cloud.whole) cloud.whole.visible = cloud.shown && this.drawnWhole;
  }

  setCrowding(somas: CircuitSomas, crowding: Uint8Array | null): void {
    // The crowding was worked out for other somas.
    if (!this.table || this.cloud?.somas !== somas) return;
    this.table.setCrowding(crowding);
    if (this.cloud?.shown) this.invalidate();
  }

  /**
   * Over the somas, frames the somas drawn as the somas view did: centred on their mean, reaching on each axis as far
   * as the farthest of them from it, plus a soma's radius; where none is drawn, all of them. Over morphologies, frames
   * those of the cells drawn about their middle; for a pack, by its populations' boxes of the sections drawn.
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
      // A pack's segments are in its chunks, out of the extent's reach: the boxes of its populations stand in for them,
      // or its bounds where it has no boxes.
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

  /** The box of the somas in `box`, padded by `pad` each way, where the view draws them. */
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
    // By now, other data may have other cells.
    return read.then((cell) => (this.table === table ? cell : null));
  }

  /** The segment or soma drawn nearest a point of the view, as `spots` numbers them; one read for a point at a time. */
  private spotAt(x: number, y: number): Promise<number | null> {
    const last = this.spotRead;
    if (last?.x === x && last.y === y) return last.read;
    const read = this.numberAround(this.spots, x, y);
    this.spotRead = { x, y, read };
    // A later ask reads again: the view may have moved by then.
    queueMicrotask(() => {
      if (this.spotRead?.read === read) this.spotRead = null;
    });
    return read;
  }

  pickSection(x: number, y: number): Promise<SectionSpot | null> {
    const layer = this.layer;
    if (!layer?.data.trees) return Promise.resolve(null);
    const { data } = layer;
    // Use the camera and the morph as they are now, as the pick was drawn from them.
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

  /** Tells the markers' listeners where the markers are after a frame, where that differs from what they last heard. */
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
    // Playing at the end starts the clock again from the beginning.
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

  /** Whether spiking cells give off light (`setSpikeGlow`): where asked, while there are spikes, over morphologies. */
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
   * Places the boxes that came in, a little each turn. The replay's clock moves on by the time the last turn of the
   * loop took, and the loop keeps turning while the replay plays.
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

  /** Places what came in of the boxes and lets go of those no longer wanted. Returns whether more is left to place. */
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

  /** Sets the morph's mix for this frame, eased in and out, and moves the markers with it. Whether it goes on. */
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

  /** Sets the nudge's zoom for this frame, as morphoviewer does: one hump of a sine. Returns whether it goes on. */
  private nudgeFrame(): boolean {
    const nudging = this.nudging;
    if (!nudging) return false;
    // If the zoom changed meanwhile, say by the slider, the user has taken over the view.
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

  /** Asks for a frame only where a cell's glow changed: before the first spike, a playing replay draws nothing. */
  private showGlow(): void {
    if (this.table?.glow(this.spiking.glow, this.spiking.lit)) this.invalidate();
  }

  /** Shows the glow at the replay's current time, and tells the listeners that time. */
  private spikeFrame(): void {
    this.showGlow();
    const { timeInMs } = this.spiking;
    for (const listener of this.spikeTimeListeners) listener(timeInMs);
  }

  private tellPlaying(playing: boolean): void {
    for (const listener of this.spikesPlayingListeners) listener(playing);
  }

  /**
   * Draws the contacts as they are now in a mesh drawn after the cells and over them, made larger only when the
   * contacts outgrow it. Asks for a frame only where that changed what is drawn.
   */
  private drawElectrodes(): void {
    this.electrodes = this.drawDots(this.electrodes, this.electrodeGroups, {
      material: this.materials.electrode,
      name: 'electrodes',
      order: 1,
      highlighted: this.highlightedElectrode,
    });
  }

  /** Draws the synapses where the circuit's frame puts them, after the cells, which hide the synapses behind them. */
  private drawSynapses(): void {
    this.synapseDots = this.drawDots(this.synapseDots, this.synapseGroups, {
      material: this.materials.synapse,
      name: 'synapses',
      order: 0.5,
    });
  }

  /** Draws the markers where the drawn morphologies put them, after the electrodes and over them. */
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
   * Draws the dots of `groups` in `mesh`, after the cells and over them, with the group `highlighted` larger and
   * lighter. The mesh is made larger only when the dots outgrow it. Asks for a frame only where what is drawn changed.
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

  /** How the tier writes rows of the glow straight to the GPU; without one, three uploads them. */
  protected glowRowsWriter(): GlowRowsWriter | undefined {
    return undefined;
  }

  /** Makes a cell table of `cells` cells for the shaders to read, paints it, and sets its glow to the replay's. */
  private makeTable(cells: number): void {
    this.table = new CellTable(cells, this.glowRowsWriter());
    this.uniforms.uCells.value = this.table.texture;
    this.uniforms.uGlow.value = this.table.glowTexture;
    this.cloudUniforms.uShade.value = this.table.shadeTexture;
    this.paint();
    this.spiking.setCellCount(cells);
    this.showGlow();
  }

  /** Starts building the pick's programs now, so that the first pick does not wait for them. */
  private compileIds(): void {
    this.compile(this.ids);
    if (this.spots.children.length > 0) this.compile(this.spots);
  }

  /**
   * Sets `bounds` round everything there is: every soma of the cloud, drawn or not and as large as one glowing in full,
   * and the morphologies.
   */
  private bound(): void {
    const all = new THREE.Box3();
    const box = this.cloud?.box;
    if (box) all.copy(this.somaBox(box, this.cloudUniforms.uRadius.value * (1 + GLOW_SWELL)));
    if (this.layer) all.union(this.shifted(this.layer.data.bounds));
    if (!all.isEmpty()) this.bounds.copy(all);
  }

  /** Shows the cloud and its pick, or hides them while the morphologies take their place. */
  private showCloud(shown: boolean): void {
    if (this.cloud) this.cloud.shown = shown;
    this.showPieces();
    this.invalidate();
  }

  /**
   * Takes `meshes` out of the view. Each is disposed only once the next mesh of its material is let go of. WebGPU keeps
   * what three holds for a mesh until the mesh is disposed, and three drops a material's programs with its last mesh,
   * which the quads that take its place would then build again.
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
    // The markers sit on the morphologies.
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
