import { ReactNode } from "react";

export type SingleFileProps = {
  type: string;
  url: string;
  key: string;
  isAvailable: boolean;
}

export type SingleCircuitListView = {
  key: string;
  name: string;
  description: string;
  brainRegion: string;
  specie: string;
  numberOfNeurons: string;
  numberOfConnections: string;
  numberOfSynapses: string;
  files: SingleFileProps[];  
  provenance: {
      isASubcircuit: boolean;
      subcircuitOf: string | null;
  };
  hasSubcircuits: boolean;
  subcircuits: SingleCircuitListView[] | null;
  metadata: {
      revision: number;
      createdBy: string;
      creationDate: string;
      license: {
          name: string;
          url: string;
      } | null;
  },
  images: {
      low?: string;
      normal?: string;
      high: string;
  }
}

export type CircuitCellValue = {
  name: string;
  description: "string";
  brainRegion: string;
  createdBy: string;
  creationDate: string;
  hasSubcircuits: boolean;
}

export type CircuitColumn = {
    title: string;
    key?: string;
    render?: (value: SingleCircuitListView) => ReactNode;
  };

export type InteractiveImageProps = {
  circuit: string;
  src: string;
  alt: string;
  width: number;
  height: number;
}
