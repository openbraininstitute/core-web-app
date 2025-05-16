export type Coordinates3D = [number, number, number];

export interface SynapsePosition {
  segment_id: number;
  coordinates: Coordinates3D;
  position: number;
}

export interface SectionSynapses {
  section_id: string;
  synapses: Array<SynapsePosition>;
}

export interface SynapsePlacementResponse {
  synapses: Array<SectionSynapses>;
}
