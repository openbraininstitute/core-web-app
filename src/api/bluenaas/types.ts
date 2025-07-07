type Coordinates3D = [number, number, number];

interface SynapsePosition {
  segment_id: number;
  coordinates: Coordinates3D;
  position: number;
}

export interface SectionSynapses {
  section_id: string;
  synapses: Array<SynapsePosition>;
}
