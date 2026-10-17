import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { ViewControls } from '@/features/viewer-3d/engine/scene-view';
import type { SectionType } from '../section-type';
import type { CircuitSpikes } from '../types';
import type { TreeMorphology } from './load/tree';
import type { LocationOptions } from './pointer';

export type Vec3 = [number, number, number];

export interface Population {
  name: string;
  cells: number;
}

/** A circuit's morphologies, in µm in the circuit's frame with `centre` taken off every position. */
export interface CircuitMorphologyData {
  /** Eight floats a segment: x, y, z and radius of its near end, then of its far end. */
  segments: Float32Array;
  /** Each segment's cell, numbered through `populations` in their order. */
  segmentCells: Uint32Array;
  /** Each segment's section type, as in SWC: 2 axon, 3 basal dendrite, 4 apical dendrite. */
  segmentTypes: Uint8Array;
  /**
   * Four floats a cell: x, y, z and radius of its soma. A cell with no morphology has a radius of zero, and one with no
   * position has NaN for x, y and z.
   */
  somas: Float32Array;
  populations: Population[];
  centre: Vec3;
  /** Around every segment's ends and every soma that has a position. */
  bounds: { min: Vec3; max: Vec3 };
  /** What the level left out: end branches shorter than `pruneUm`, then points within `toleranceUm` of the path. */
  level: { toleranceUm: number; pruneUm: number };
  /**
   * Where each cell's morphology was read whole, as for a small circuit: that morphology, null for a cell drawn as its
   * soma alone, and where its segments start in `segments`, in their order there.
   */
  trees?: { morphologies: readonly (TreeMorphology | null)[]; firstSegments: Uint32Array };
  /**
   * Where the morphologies' dendrograms were charted: their segments and somas laid out as those, in the same order
   * and frame as `segments` and `somas`, a cell with none as it is.
   */
  chart?: { segments: Float32Array; somas: Float32Array };
  /**
   * Where the segments are read from a box at a time, at the level the view wants of each, in place of `segments`,
   * which are then none, and never with `trees`.
   */
  chunks?: MorphologyChunks;
}

/** Some of a circuit's segments, in the arrays `CircuitMorphologyData` has them in. */
export type MorphologySegments = Pick<
  CircuitMorphologyData,
  'segments' | 'segmentCells' | 'segmentTypes'
>;

/** A level of a pack: what it left out, as `CircuitMorphologyData.level` says, and its segments in each box. */
export interface PackLevel {
  toleranceUm: number;
  pruneUm: number;
  segments: Uint32Array;
}

/**
 * Where a pack's segments lie: boxes of space, six floats a box, its least x, y and z then its greatest, in µm in the
 * data's frame, and the pack's levels, the finest first. A box holds a segment whose far end it holds: the near end
 * may lie outside it.
 */
export interface PackBoxes {
  boxes: Float32Array;
  levels: PackLevel[];
}

/** A box of a pack at one of its levels. */
export interface BoxRead {
  level: number;
  box: number;
}

/** A pack's segments, read a box at a time as the view wants them. */
export interface MorphologyChunks extends PackBoxes {
  /** The segments of each box asked for, at its level, in that order, their cells numbered as the data's. */
  read(wanted: BoxRead[]): Promise<MorphologySegments[]>;
}

/** How much of a pack read a box at a time is drawn. */
export interface DetailRules {
  /**
   * The most segments drawn at once, each box's counted to a whole number of the arena's blocks; where every box's
   * coarsest level is kept, of the finer levels alone.
   */
  budget: number;
  /** A level is fine enough for a box where its tolerance spans this many device pixels or fewer. */
  pixels: number;
  /** On WebGPU, whether the segments hidden behind others are left out, tested on the GPU; off, all are drawn. */
  culling: boolean;
}

/**
 * What the culling's tests last counted: the segments of the blocks tested, those kept to hide others, and those drawn;
 * and the boxes with a segment kept.
 */
export interface CullCounts {
  tested: number;
  kept: number;
  drawn: number;
  boxes: number;
}

/**
 * What the culling's tests left, read back: their counts, a bit a block of the arena with a segment kept, and the rest
 * their frame was drawn still in (`DetailStream.rest`), -1 for one drawn moving.
 */
export interface CullRead extends Omit<CullCounts, 'boxes'> {
  marked: Uint32Array;
  rest: number;
}

/** What a view draws of morphologies read a box at a time. */
export interface DetailStats extends DetailRules {
  /** The segments drawn, and what the levels the view wants come to. */
  drawn: number;
  wanted: number;
  /** Each level's tolerance, µm, and the boxes drawn at it, the finest first. */
  levels: { toleranceUm: number; boxes: number }[];
  /** The boxes in view left out for the budget, which only their somas stand for. */
  leftOut: number;
  /** What the culling counted; null where it does not cull. */
  culled: CullCounts | null;
}

/** A circuit's somas as the page placed them, before any morphology is in. */
export interface CircuitSomas {
  /** Three floats a cell, x, y, z in µm in the circuit's frame, numbered through `populations` in their order. */
  positions: Float32Array;
  populations: Population[];
}

/** A CSS colour for each type of section, which a lone cell is drawn in, to tell its dendrites from its axon. */
export interface SectionColors {
  soma: string;
  axon: string;
  basalDendrite: string;
  apicalDendrite: string;
  unknown: string;
}

/**
 * Each cell's column of a palette, as the somas view takes its colours. A column is a CSS colour, section colours, null
 * for the default colour, or false for a cell that is not drawn. A cell past the end of `columnByCell` is in the
 * default colour. The view draws in one set of section colours, the last in the palette; a soma alone is in that set's
 * soma colour.
 */
export interface CellColors {
  palette: (string | SectionColors | null | false)[];
  columnByCell: Uint16Array;
}

/** An electrode array's contacts, or the marker of its origin, in µm in the circuit's frame: the host's overlays. */
export type ElectrodeGroup = Omit<ICircuitOverlayGroup, 'name'>;

/**
 * Where an array was moved to and how it is turned, once the gesture that moved it ends: its origin in µm in the
 * circuit's frame, and its rotation about x, y and z in degrees.
 */
export interface ElectrodeTransform {
  id: string;
  origin: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  phase: 'end';
}

/** Synapses in one colour: three floats each, x, y and z in µm in the circuit's frame. */
export interface SynapseGroup {
  color: string;
  coordinates: Float32Array | readonly number[];
}

/** A contact drawn at a point of the view: its array, and where it is in the circuit's frame. */
export interface ElectrodeHit {
  id: string;
  contact: Vec3;
}

/** Fractions of the view's width and height, from its top left corner. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/** A point of a cell's section, as a morphology location names it. */
export interface SectionSpot {
  cell: number;
  /** The section's SONATA number; null where OBI-One sent none. */
  sonataId: number | null;
  type: SectionType;
  /** How far along the section, from 0 at its start to 1 at its end. */
  offset: number;
  /** Where the view draws it. */
  screen: ScreenPoint;
}

/** A morphology location to mark on a cell: its section's SONATA number, how far along, and in what colour. */
export interface LocationMarker {
  cell: number;
  sonataId: number;
  offset: number;
  color: string;
}

/** Where a marker is drawn, and on what type of section; `visible` false where it is behind the eye. */
export interface MarkerOnScreen {
  type: SectionType;
  screen: ScreenPoint;
  visible: boolean;
}

/** Morphology locations: the markers the view draws, and what the pointer does over them and the sections. */
export interface ViewLocations extends LocationOptions {
  markers: readonly LocationMarker[];
  /** A marker's radius, µm. */
  radius: number;
  onMarkersOnScreen?: (markers: readonly (MarkerOnScreen | null)[]) => void;
}

/** What the page drives a circuit's morphologies through, whichever engine draws them. */
export interface CircuitMorphologyView extends ViewControls {
  /**
   * Show these morphologies in place of the somas of the same cells, framing the view only as those would be; over
   * somas of other cells, none. Without somas, frame the view on the morphologies. Null shows none, and the somas again.
   * With `follow`, a view not moved since it was last framed is framed again on these, as morphologies coming in one at
   * a time want. The arrays are kept, not copied.
   */
  setData(data: CircuitMorphologyData | null, follow?: boolean): void;
  /** How much is drawn of morphologies read a box at a time (`CircuitMorphologyData.chunks`). */
  setDetailRules(rules: Partial<DetailRules>): void;
  /** Told what is drawn of morphologies read a box at a time whenever it changes, and null where there are none. */
  onDetail(listener: (detail: DetailStats | null) => void): () => void;
  /**
   * Show these somas, each a sphere as the somas view drew them, in `colors` where given; null shows none. The view is
   * framed on them unless the populations on show before, or these, take in the others. The positions are kept, not
   * copied.
   */
  setSomas(somas: CircuitSomas | null, colors?: CellColors | null): void;
  /** A soma's radius, µm. */
  setSomaRadius(radius: number): void;
  /** How opaque the somas are, from 0 to 1; a spiking soma is opaque all the same. */
  setSomaOpacity(opacity: number): void;
  /**
   * How crowded each of `somas`' neighbourhoods is, a byte a cell (`crowding`); null takes each as half crowded. Taken
   * only while those somas are the ones shown.
   */
  setCrowding(somas: CircuitSomas, crowding: Uint8Array | null): void;
  /** Null draws every cell in the default colour. The same object again paints nothing: hand over a new one. */
  setCellColors(colors: CellColors | null): void;
  setDefaultColor(color: string): void;
  /** Draw this cell apart from the rest; null draws none so. */
  setHighlight(cell: number | null): void;
  /**
   * The cell drawn at a point of the view, in CSS pixels from its top left corner, or the nearest within a few pixels;
   * null where there is none. A cell that is not drawn is not found, and a pick that cannot be made finds none.
   */
  pick(x: number, y: number): Promise<number | null>;
  /** Whether the view is still moving, a gesture's glide included: what is under the pointer is about to change. */
  readonly moving: boolean;
  /**
   * The point of a section drawn at a point of the view, in CSS pixels, or the nearest within a few pixels, of a cell
   * whose morphology was read whole; on its soma, the soma's section halfway. Null where there is none.
   */
  pickSection(x: number, y: number): Promise<SectionSpot | null>;
  /** Mark these locations in front of the cells; a marker whose cell's morphology is not in, or has no such section, waits. */
  setLocationMarkers(markers: readonly LocationMarker[]): void;
  /** A marker's radius, in µm. */
  setLocationMarkerRadius(radius: number): void;
  /** The marker drawn at a point of the view, in CSS pixels, or the nearest within a few pixels: its index and where it is. */
  markerAt(x: number, y: number): ({ index: number } & MarkerOnScreen) | null;
  /** Told where each marker is drawn after every frame, null for one that is not; a frame is drawn for a new listener. */
  onMarkersOnScreen(listener: (markers: readonly (MarkerOnScreen | null)[]) => void): () => void;
  /** Draw these electrodes in front of the cells, whatever is nearer the eye; the array `highlighted` larger and lighter. */
  setElectrodes(electrodes: readonly ElectrodeGroup[], highlighted: string | null): void;
  /** A contact's radius, in µm. */
  setElectrodeRadius(radius: number): void;
  /**
   * Draw these synapses on the cells, a dot 0.5 µm round and 2 device pixels at the least each, hidden by what is nearer
   * the eye. Other groups are drawn again; the same ones, nothing.
   */
  setSynapses(groups: readonly SynapseGroup[]): void;
  /**
   * The electrode drawn at a point of the view, in CSS pixels from its top left corner, or the nearest within a few
   * pixels: its array and the contact's position. Null where there is none.
   */
  electrodeAt(x: number, y: number): ElectrodeHit | null;
  /** The point of the circuit drawn at a point of the view, in CSS pixels, as deep in the view as `depthOf`. */
  fromScreen(x: number, y: number, depthOf: Vec3): Vec3;
  /**
   * Replay these spikes over the cells, each glowing as it fires and fading after, from the start and paused; null
   * replays none. A spike's cell is the cell of that number.
   */
  setSpikes(spikes: CircuitSpikes | null): void;
  /** Move the replay to this moment, in simulated ms. */
  seekSpikes(timeInMs: number): void;
  /** Played at the end, the replay starts again from the beginning. */
  setSpikesPlaying(playing: boolean): void;
  /** Simulated ms a second of the replay. */
  setSpikeSpeed(speed: number): void;
  /** The seconds a spike takes to fade to 1/e. */
  setSpikeAfterglow(seconds: number): void;
  /** Told the replay's moment whenever it moves, a frame at a time while it plays. */
  onSpikeTime(listener: (timeInMs: number) => void): () => void;
  /** Told when the replay plays or stops, the end of the spikes included. */
  onSpikesPlaying(listener: (playing: boolean) => void): () => void;
  setDark(dark: boolean): void;
  resetView(): void;
  /** Zoom in a little and back out once, to point at the view; any move of the user's ends it. */
  nudge(): void;
  /**
   * Morph the morphologies whose dendrograms were charted into those, or back, over 0.6 s; the markers and the pick go
   * with them. The dendrogram faces the eye and is not turned.
   */
  setDendrogram(shown: boolean): void;
  /** How near the view is, 1 as `resetView` frames it; the pixel scale's listeners hear when it changes. */
  readonly zoom: number;
  setZoom(zoom: number): void;
  /** The view as it is on show, over its background, a pixel a device pixel; null where the browser has no 2D canvas. */
  snapshot(): HTMLCanvasElement | null;
  /** Told when a wheel turned outside fullscreen without Ctrl, which scrolls the page instead of zooming. */
  onWheelWithoutCtrl(listener: () => void): () => void;
  dispose(): void;
}
