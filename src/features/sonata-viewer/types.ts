export type SonataReportMetadata = {
  populations: PopulationMetadata[];
};

export type PopulationMetadata = {
  name: string;
  /** Display label per recorded column of the data matrix. */
  traceLabels: string[];
  /** Distinct cells recorded; fewer than `traceLabels.length` in a compartment report. */
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
  populationName: string;
  x: number[];
  y: number[];
  units: string;
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
