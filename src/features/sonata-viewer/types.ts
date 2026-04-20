export type SonataReportMetadata = {
  populations: PopulationMetadata[];
};

export type PopulationMetadata = {
  name: string;
  nodeIds: number[];
  indexPointers: number[];
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
  nodeId: number;
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
  nodeId: number;
  desiredPoints: number;
  zoomRange?: ZoomRange;
};
