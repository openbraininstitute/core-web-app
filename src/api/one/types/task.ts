export const ObiOneTaskTypeDict = {
  CircuitExtraction: 'circuit_extraction',
  CircuitSimulation: 'circuit_simulation',
  Skeletonization: 'morphology_skeletonization',
} as const;

export type TObiOneTaskType = (typeof ObiOneTaskTypeDict)[keyof typeof ObiOneTaskTypeDict];
