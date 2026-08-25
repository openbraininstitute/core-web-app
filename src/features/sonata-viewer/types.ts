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
