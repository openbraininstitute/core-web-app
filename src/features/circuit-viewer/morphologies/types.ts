import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { ViewControls } from '@/features/viewer-3d/engine/scene-viewer';
import type { CircuitSpikes } from '../types';

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
}

/** A circuit's somas as the page placed them, before any morphology is in. */
export interface CircuitSomas {
  /** Three floats a cell, x, y, z in µm in the circuit's frame, numbered through `populations` in their order. */
  positions: Float32Array;
  populations: Population[];
}

/**
 * Each cell's column of a palette, as the somas view takes its colours. A column is a CSS colour, null for the default
 * colour, or false for a cell that is not drawn. A cell past the end of `columnByCell` is in the default colour.
 */
export interface CellColors {
  palette: (string | null | false)[];
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

/** A contact drawn at a point of the view: its array, and where it is in the circuit's frame. */
export interface ElectrodeHit {
  id: string;
  contact: Vec3;
}

/** What the page drives a circuit's morphologies through, whichever engine draws them. */
export interface CircuitMorphologyView extends ViewControls {
  /**
   * Show these morphologies in place of the somas of the same cells, framing the view only as those would be; without
   * them, framing it on the morphologies. Null shows none, and the somas again. The arrays are kept, not copied.
   */
  setData(data: CircuitMorphologyData | null): void;
  /**
   * Show these somas, each a sphere as the somas view drew them; null shows none. The view is framed on them unless the
   * populations on show before, or these, take in the others. The positions are kept, not copied.
   */
  setSomas(somas: CircuitSomas | null): void;
  /** A soma's radius, µm. */
  setSomaRadius(radius: number): void;
  /** How opaque the somas are, from 0 to 1; a spiking soma is opaque all the same. */
  setSomaOpacity(opacity: number): void;
  /** How crowded each soma's neighbourhood is, a byte a cell (`crowding`); null takes each as half crowded. */
  setCrowding(crowding: Uint8Array | null): void;
  /** Null draws every cell in the default colour. */
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
  /** Draw these electrodes in front of the cells, whatever is nearer the eye; the array `highlighted` larger and lighter. */
  setElectrodes(electrodes: readonly ElectrodeGroup[], highlighted: string | null): void;
  /** A contact's radius, in µm. */
  setElectrodeRadius(radius: number): void;
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
  /** How near the view is, 1 as `resetView` frames it; the pixel scale's listeners hear when it changes. */
  readonly zoom: number;
  setZoom(zoom: number): void;
  /** The view as it is on show, over its background, a pixel a device pixel; null where the browser has no 2D canvas. */
  snapshot(): HTMLCanvasElement | null;
  dispose(): void;
}
