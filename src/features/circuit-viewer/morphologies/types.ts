import type { ViewControls } from '@/features/viewer-3d/engine/scene-viewer';

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

/**
 * Each cell's column of a palette, as the somas view takes its colours. A column is a CSS colour, null for the default
 * colour, or false for a cell that is not drawn. A cell past the end of `columnByCell` is in the default colour.
 */
export interface CellColors {
  palette: (string | null | false)[];
  columnByCell: Uint16Array;
}

/** What the page drives a circuit's morphologies through, whichever engine draws them. */
export interface CircuitMorphologyView extends ViewControls {
  /** Show these morphologies, framing the view on them; null shows none. The arrays are kept, not copied. */
  setData(data: CircuitMorphologyData | null): void;
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
  setDark(dark: boolean): void;
  resetView(): void;
  /** The view as it is on show, over its background, a pixel a device pixel; null where the browser has no 2D canvas. */
  snapshot(): HTMLCanvasElement | null;
  dispose(): void;
}
