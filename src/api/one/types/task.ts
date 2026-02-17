export const ObiOneTaskTypeDict = {
  CircuitExtraction: 'circuit_extraction',
  CircuitSimulation: 'circuit_simulation',
  Skeletonization: 'skeletonization',
} as const;

export type TObiOneTaskType = (typeof ObiOneTaskTypeDict)[keyof typeof ObiOneTaskTypeDict];
