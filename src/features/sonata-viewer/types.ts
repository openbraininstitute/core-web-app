export type SonataReportMetadata = {
  populations: PopulationMetadata[];
};

/** One recorded column of the data matrix. */
export type TraceMeta = {
  /** The cell this column belongs to. */
  nodeId: number;
  /** Value from `mapping/element_ids` for this column, when the file carries one. */
  elementId: number | null;
  /** Unique label: the node id, plus a per-cell ordinal when the cell spans columns. */
  label: string;
};

export type PopulationMetadata = {
  name: string;
  /** One entry per column of the data matrix, in column order. */
  traces: TraceMeta[];
  /** Distinct cells recorded; fewer than `traces.length` in a compartment report. */
  nodeCount: number;
  timeConfig: TimeConfig;
  dataUnits: string;
};

/**
 * Each recorded cell's values over the run, thinned to at most a set number of
 * frames: the cells' node ids, the frames' times, and a value per cell per
 * frame, frame by frame. A cell recorded in several compartments gives its first.
 */
export type CellFrames = {
  nodeIds: Uint32Array;
  times: Float64Array;
  values: Float32Array;
};

export type TimeConfig = {
  startTime: number;
  endTime: number;
  timeStep: number;
  units: string;
};

export type NodeTraceData = {
  x: number[];
  y: number[];
};

/** A trace of a cell picked to draw, and the cell's colour slot (-1 past the palette). */
export type PickedTrace = {
  traceIndex: number;
  slot: number;
};

export type ZoomRange = {
  xStart?: number;
  xEnd?: number;
};

export type DownsampleRequest = {
  populationName: string;
  /** Column of the data matrix. */
  traceIndex: number;
  desiredPoints: number;
  zoomRange?: ZoomRange;
};
